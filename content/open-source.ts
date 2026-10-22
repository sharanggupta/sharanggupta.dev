// Open-source contributions. Nothing here is typed in by hand:
// - the list of pull requests comes from GitHub (lib/github/pull-requests.ts) when a page is built;
// - open-source.projects.json holds each project's display name and star count, which decides the order
//   and which contributions are featured;
// - open-source.notes.json holds, for each pull request, what the problem was and how it was fixed.
// scripts/update-contributions.mjs refreshes both files daily (GitHub Actions) and writes the note
// for any new pull request with Claude. This file only joins the three and applies the rules.

import type { PullRequestFacts, PullRequests } from "../lib/github/pull-requests.ts";
import notesJson from "./open-source.notes.json";
import projectsJson from "./open-source.projects.json";

/** What a contribution did, which decides the group it is shown in on /open-source. */
export const KIND = { fix: "fix", feature: "feature", docs: "docs", tests: "tests" } as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

/** The groups on /open-source, in display order. */
export const KIND_ORDER: readonly Kind[] = [KIND.fix, KIND.feature, KIND.docs, KIND.tests];

export type Reference = { label: string; url: string };

/** The story of one pull request, from open-source.notes.json. */
export type Note = {
  kind: Kind;
  /** One sentence for the home page and the README, in the present tense: what is true now. */
  summary: string;
  /** What was wrong, or missing, before. */
  problem: string;
  /** What the change does about it, and how it was verified. */
  fix: string;
  /** Overrides the issue read from the pull request description. */
  issue?: Reference;
  source: "hand" | "claude";
  writtenAt: string;
};

export type ProjectRecord = { name: string; stars: number; starsAt: string };

export type Project = { name: string; repo: string; url: string; stars: number };

export type Contribution = {
  pullRequest: string;
  title: string;
  project: Project;
  kind: Kind;
  /** The day it landed, as YYYY-MM-DD. */
  landed: string;
  issue?: Reference;
  /** From the start of the pull request description, for a contribution without a note. */
  description?: string;
  /** For a change the maintainers applied themselves instead of merging the pull request. */
  commit?: Reference;
  featured: boolean;
} & Partial<Pick<Note, "summary" | "problem" | "fix">>;

export type ContributionSet = {
  /** In display order: by group, then by the project's stars, then newest first. */
  all: Contribution[];
  /** The ones shown on the home page, most-starred project first. */
  featured: Contribution[];
  openCount: number;
  projectCount: number;
};

/** A change the maintainers applied as their own commit, which GitHub does not count as a merged pull request. */
export type AppliedByMaintainers = {
  pullRequest: string;
  title: string;
  repo: string;
  landed: string;
  commit: Reference;
};

export const NOTES = notesJson as Record<string, Note>;
export const PROJECTS = projectsJson as Record<string, ProjectRecord>;

const GITHUB = "https://github.com";

/** How many contributions the home page shows, and from which groups: one per project, best-starred first. */
export const FEATURED_COUNT = 8;
const FEATURED_KINDS: ReadonlySet<Kind> = new Set([KIND.fix, KIND.feature]);

export const APPLIED_BY_MAINTAINERS: AppliedByMaintainers[] = [
  {
    pullRequest: `${GITHUB}/spring-cloud/spring-cloud-stream/pull/3296`,
    title: "Do not start running binder contexts from DefaultBinderFactory",
    repo: "spring-cloud/spring-cloud-stream",
    landed: "2026-10-09",
    commit: { label: "commit 124562e", url: `${GITHUB}/spring-cloud/spring-cloud-stream/commit/124562eba5ce8c84fd9bdfd01176cbca8409da17` },
  },
];

export const KIND_COPY: Record<Kind, { title: string; intro: string }> = {
  [KIND.fix]: {
    title: "Bugs fixed",
    intro: "Each one was reproduced with a test that fails on the base branch and passes with the fix.",
  },
  [KIND.feature]: {
    title: "Features added",
    intro: "Requests that had been open for years, built test-first with reference documentation.",
  },
  [KIND.docs]: {
    title: "Documentation",
    intro: "Behaviour that was undocumented, pinned by a test where there was none.",
  },
  [KIND.tests]: {
    title: "Tests and build",
    intro: "Tests that had silently stopped running, found across many projects, made to run again. Where a test then failed, it was fixed.",
  },
};

const TEST_TITLE = /\b(test|@Test|Surefire|@Ignore|@Disabled|flaky)\b/i;
const DOCS_TITLE = /\b(document|documentation|javadoc|FAQ|docs?)\b/i;
const FEATURE_TITLE = /^(add|support|introduce|allow|expose|provide)\b/i;

/** A guess from the title, for a pull request without a note. */
export function inferKind(title: string): Kind {
  if (TEST_TITLE.test(title)) return KIND.tests;
  if (DOCS_TITLE.test(title)) return KIND.docs;
  if (FEATURE_TITLE.test(title)) return KIND.feature;
  return KIND.fix;
}

const CLOSES_ISSUE = /\b(?:fix(?:es)?|closes?|resolves?)\s+(?:#|gh-)(\d+)/i;
const JIRA_ISSUE = /https:\/\/issues\.apache\.org\/jira\/browse\/([A-Z][A-Z0-9]+-\d+)/;

/** The issue a pull request says it closes, read from its description. */
export function inferIssue(body: string, repo: string): Reference | undefined {
  const github = CLOSES_ISSUE.exec(body);
  if (github) return { label: `#${github[1]}`, url: `${GITHUB}/${repo}/issues/${github[1]}` };
  const apache = JIRA_ISSUE.exec(body);
  if (apache) return { label: apache[1], url: `https://issues.apache.org/jira/browse/${apache[1]}` };
  return undefined;
}

const DESCRIPTION_LIMIT = 400;
const SKIPPED_LINE = /^\s*(#|-\s*\[|\*\s*\[|<!--|fix(es)?\s|closes?\s|resolves?\s|see\s|\|)/i;

/** The first real paragraph of a pull request description, without markdown furniture, for a contribution with no note. */
export function descriptionFrom(body: string): string | undefined {
  const paragraphs = body.replace(/\r/g, "").split(/\n\s*\n/);
  const first = paragraphs.map((paragraph) => paragraph.trim()).find((paragraph) => paragraph && !SKIPPED_LINE.test(paragraph));
  if (!first) return undefined;
  const text = first.replace(/\s*\n\s*/g, " ").replace(/`/g, "");
  return text.length > DESCRIPTION_LIMIT ? `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…` : text;
}

type Sources = { notes: Record<string, Note>; projects: Record<string, ProjectRecord> };

/** A project not yet in open-source.projects.json is shown by its repository name, with no stars, until the next refresh. */
function projectFor(repo: string, projects: Sources["projects"]): Project {
  const record = projects[repo];
  return { name: record?.name ?? repo.split("/")[1], repo, url: `${GITHUB}/${repo}`, stars: record?.stars ?? 0 };
}

function fromFacts(facts: PullRequestFacts, sources: Sources): Contribution {
  const note = sources.notes[facts.url];
  return {
    pullRequest: facts.url,
    title: facts.title,
    project: projectFor(facts.repo, sources.projects),
    kind: note?.kind ?? inferKind(facts.title),
    landed: (facts.mergedAt ?? "").slice(0, 10),
    issue: note?.issue ?? inferIssue(facts.body, facts.repo),
    summary: note?.summary,
    problem: note?.problem,
    fix: note?.fix,
    description: note ? undefined : descriptionFrom(facts.body),
    featured: false,
  };
}

function fromApplied(applied: AppliedByMaintainers, sources: Sources): Contribution {
  const note = sources.notes[applied.pullRequest];
  return {
    pullRequest: applied.pullRequest,
    title: applied.title,
    project: projectFor(applied.repo, sources.projects),
    kind: note?.kind ?? inferKind(applied.title),
    landed: applied.landed,
    commit: applied.commit,
    issue: note?.issue,
    summary: note?.summary,
    problem: note?.problem,
    fix: note?.fix,
    featured: false,
  };
}

function byImportance(a: Contribution, b: Contribution): number {
  return (
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
    b.project.stars - a.project.stars ||
    b.landed.localeCompare(a.landed) ||
    a.pullRequest.localeCompare(b.pullRequest)
  );
}

/** The best fix or feature of each of the most-starred projects, as long as it has a note to show. */
function pickFeatured(all: Contribution[]): Contribution[] {
  const candidates = all.filter((contribution) => FEATURED_KINDS.has(contribution.kind) && contribution.summary);
  const chosen: Contribution[] = [];
  for (const contribution of candidates) {
    if (chosen.length === FEATURED_COUNT) break;
    if (chosen.some((other) => other.project.repo === contribution.project.repo)) continue;
    chosen.push(contribution);
  }
  return chosen.toSorted((a, b) => b.project.stars - a.project.stars);
}

/** Joins what GitHub says with the notes and the project records. */
export function buildContributions(pullRequests: PullRequests, sources: Sources = { notes: NOTES, projects: PROJECTS }): ContributionSet {
  const sorted = [
    ...pullRequests.merged.map((facts) => fromFacts(facts, sources)),
    ...APPLIED_BY_MAINTAINERS.map((applied) => fromApplied(applied, sources)),
  ].toSorted(byImportance);
  const featured = pickFeatured(sorted);
  const all = sorted.map((contribution) => ({ ...contribution, featured: featured.includes(contribution) }));
  const projectCount = new Set(all.map((contribution) => contribution.project.repo)).size;
  return { all, featured: all.filter((contribution) => contribution.featured), openCount: pullRequests.openCount, projectCount };
}

export function ofKind(set: ContributionSet, kind: Kind): Contribution[] {
  return set.all.filter((contribution) => contribution.kind === kind);
}
