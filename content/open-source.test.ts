import { describe, expect, it } from "vitest";
import type { PullRequests } from "../lib/github/pull-requests";
import {
  APPLIED_BY_MAINTAINERS,
  buildContributions,
  descriptionFrom,
  FEATURED_COUNT,
  inferIssue,
  inferKind,
  KIND,
  KIND_ORDER,
  type Note,
  NOTES,
  ofKind,
  PROJECTS,
} from "./open-source";
import snapshot from "./open-source.snapshot.json";

const SPRING_PR = "https://github.com/spring-projects/spring-framework/pull/37543";
const TINY_FIX = "https://github.com/some-org/tiny-lib/pull/9";
const TINY_TEST = "https://github.com/some-org/tiny-lib/pull/7";

const note = (kind: Note["kind"], summary: string): Note => ({ kind, summary, problem: "p", fix: "f", source: "hand", writtenAt: "2026-10-22" });

const sources = {
  notes: { [SPRING_PR]: note(KIND.fix, "No more leak."), [TINY_TEST]: note(KIND.tests, "Runs again.") },
  projects: {
    "spring-projects/spring-framework": { name: "Spring Framework", stars: 60_000, starsAt: "2026-10-22" },
    "spring-cloud/spring-cloud-stream": { name: "Spring Cloud Stream", stars: 1_000, starsAt: "2026-10-22" },
  },
};

const sample: PullRequests = {
  fetchedAt: "2026-10-22T00:00:00Z",
  openCount: 3,
  merged: [
    { url: TINY_TEST, title: "Run the test that was missing @Test", body: "", repo: "some-org/tiny-lib", mergedAt: "2026-10-20T10:00:00Z" },
    {
      url: TINY_FIX,
      title: "Handle an empty header value",
      body: "<!-- template -->\nFixes #41\n\nThe parser threw on an empty `value`.\nIt now returns an empty string.\n\n## Checklist\n- [x] tests",
      repo: "some-org/tiny-lib",
      mergedAt: "2026-10-21T10:00:00Z",
    },
    { url: SPRING_PR, title: "Fix buffer leak in ProtobufDecoder on cancel", body: "The decoder leaked.", repo: "spring-projects/spring-framework", mergedAt: "2026-10-22T10:00:00Z" },
  ],
};

describe("buildContributions", () => {
  const set = buildContributions(sample, sources);
  const find = (url: string) => set.all.find((contribution) => contribution.pullRequest === url)!;

  it("joins the GitHub facts with the note and the project record", () => {
    const spring = find(SPRING_PR);
    expect(spring.project).toEqual({ name: "Spring Framework", repo: "spring-projects/spring-framework", url: "https://github.com/spring-projects/spring-framework", stars: 60_000 });
    expect(spring.landed).toBe("2026-10-22");
    expect(spring.kind).toBe(KIND.fix);
    expect(spring.summary).toBe("No more leak.");
    expect(spring.description).toBeUndefined();
  });

  it("shows a pull request without a note or project record, with its own description and issue", () => {
    const unknown = find(TINY_FIX);
    expect(unknown.project).toEqual({ name: "tiny-lib", repo: "some-org/tiny-lib", url: "https://github.com/some-org/tiny-lib", stars: 0 });
    expect(unknown.kind).toBe(KIND.fix);
    expect(unknown.issue).toEqual({ label: "#41", url: "https://github.com/some-org/tiny-lib/issues/41" });
    expect(unknown.description).toBe("The parser threw on an empty value. It now returns an empty string.");
  });

  it("orders by group, then stars, then newest first", () => {
    const fixes = ofKind(set, KIND.fix).map((contribution) => contribution.pullRequest);
    expect(fixes[0]).toBe(SPRING_PR);
    expect(fixes.at(-1)).toBe(TINY_FIX);
    expect(set.all.at(-1)!.kind).toBe(KIND.tests);
  });

  it("features only fixes and features that have a note, one per project", () => {
    // The applied-by-maintainers change has no note in these sources, so it is not featured either.
    expect(set.featured.map((contribution) => contribution.pullRequest)).toEqual([SPRING_PR]);
    expect(find(TINY_FIX).featured).toBe(false);
    expect(find(TINY_TEST).featured).toBe(false);
  });

  it("adds the changes the maintainers applied themselves, with their commit", () => {
    const applied = set.all.filter((contribution) => contribution.commit);
    expect(applied.map((contribution) => contribution.pullRequest)).toEqual(APPLIED_BY_MAINTAINERS.map((change) => change.pullRequest));
    expect(set.projectCount).toBe(2 + APPLIED_BY_MAINTAINERS.length);
    expect(set.openCount).toBe(3);
  });
});

describe("inferKind", () => {
  it.each([
    ["Run four tests that were missing @Test", KIND.tests],
    ["Rename DerivedKeyTests so Surefire runs it", KIND.tests],
    ["Document the order of application and profile specific files", KIND.docs],
    ["Add proxy support to the FTP session factories", KIND.feature],
    ["Fix buffer leak in ProtobufDecoder on cancel", KIND.fix],
  ])("%s → %s", (title, kind) => {
    expect(inferKind(title)).toBe(kind);
  });
});

describe("inferIssue", () => {
  it("reads a GitHub issue from Fixes, Closes or gh- references", () => {
    expect(inferIssue("Fixes #4399.", "apache/logging-log4j2")).toEqual({ label: "#4399", url: "https://github.com/apache/logging-log4j2/issues/4399" });
    expect(inferIssue("Closes gh-3155", "spring-cloud/spring-cloud-stream")?.label).toBe("#3155");
  });

  it("reads an Apache JIRA link", () => {
    expect(inferIssue("Fixes https://issues.apache.org/jira/browse/LANG-1836", "apache/commons-lang")).toEqual({
      label: "LANG-1836",
      url: "https://issues.apache.org/jira/browse/LANG-1836",
    });
  });

  it("gives nothing when the description names no issue", () => {
    expect(inferIssue("Three test methods have no @Test.", "apache/dubbo")).toBeUndefined();
  });
});

describe("descriptionFrom", () => {
  it("skips headings, comments, checklists and issue references, and joins the first paragraph's lines", () => {
    expect(descriptionFrom("## What\n\nFixes #1\n\nFirst line\nsecond line.\n\nSecond paragraph.")).toBe("First line second line.");
  });

  it("truncates a long paragraph", () => {
    const long = "word ".repeat(200);
    expect(descriptionFrom(long)!.length).toBeLessThanOrEqual(401);
    expect(descriptionFrom(long)!.endsWith("…")).toBe(true);
  });

  it("gives nothing for an empty description", () => {
    expect(descriptionFrom("")).toBeUndefined();
  });
});

describe("the committed data", () => {
  const landed = [...snapshot.merged.map((pullRequest) => pullRequest.url), ...APPLIED_BY_MAINTAINERS.map((change) => change.pullRequest)];

  // A pull request merged since the last daily refresh has no note yet; that is expected, not a failure.
  it("has no note for a pull request that did not land", () => {
    for (const url of Object.keys(NOTES)) expect(landed).toContain(url);
  });

  it("has complete notes", () => {
    for (const [url, entry] of Object.entries(NOTES)) {
      expect(KIND_ORDER, url).toContain(entry.kind);
      expect(entry.summary.length, url).toBeGreaterThan(20);
      expect(entry.problem.length, url).toBeGreaterThan(40);
      expect(entry.fix.length, url).toBeGreaterThan(40);
      expect(["hand", "claude"]).toContain(entry.source);
    }
  });

  it("has a name and stars in every project record", () => {
    for (const [repo, record] of Object.entries(PROJECTS)) {
      expect(record.name, repo).not.toBe("");
      expect(record.stars, repo).toBeGreaterThan(0);
    }
  });

  it("features a full set from the snapshot", () => {
    expect(buildContributions(snapshot).featured).toHaveLength(FEATURED_COUNT);
  });
});
