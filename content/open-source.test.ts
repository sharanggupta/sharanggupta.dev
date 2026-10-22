import { describe, expect, it } from "vitest";
import type { PullRequests } from "../lib/github/pull-requests";
import {
  APPLIED_BY_MAINTAINERS,
  buildContributions,
  descriptionFrom,
  inferIssue,
  inferKind,
  KIND,
  KIND_ORDER,
  NOTES,
  ofKind,
} from "./open-source";
import snapshot from "./open-source.snapshot.json";

const SPRING_PR = "https://github.com/spring-projects/spring-framework/pull/37543";

const sample: PullRequests = {
  fetchedAt: "2026-10-22T00:00:00Z",
  openCount: 3,
  merged: [
    {
      url: "https://github.com/some-org/tiny-lib/pull/7",
      title: "Run the test that was missing @Test",
      body: "",
      repo: "some-org/tiny-lib",
      mergedAt: "2026-10-20T10:00:00Z",
    },
    {
      url: "https://github.com/some-org/tiny-lib/pull/9",
      title: "Handle an empty header value",
      body: "<!-- template -->\nFixes #41\n\nThe parser threw on an empty `value`.\nIt now returns an empty string.\n\n## Checklist\n- [x] tests",
      repo: "some-org/tiny-lib",
      mergedAt: "2026-10-21T10:00:00Z",
    },
    {
      url: SPRING_PR,
      title: "Fix buffer leak in ProtobufDecoder on cancel",
      body: "The decoder leaked.",
      repo: "spring-projects/spring-framework",
      mergedAt: "2026-10-22T10:00:00Z",
    },
  ],
};

describe("buildContributions", () => {
  const set = buildContributions(sample);

  it("joins the GitHub facts with the note for that pull request", () => {
    const spring = set.all.find((contribution) => contribution.pullRequest === SPRING_PR)!;
    expect(spring.project.name).toBe("Spring Framework");
    expect(spring.landed).toBe("2026-10-22");
    expect(spring.kind).toBe(KIND.fix);
    expect(spring.featured).toBe(true);
    expect(spring.problem).toBe(NOTES[SPRING_PR].problem);
    expect(spring.description).toBeUndefined();
  });

  it("shows a pull request without a note, named after its repository, with its own description and issue", () => {
    const unknown = set.all.find((contribution) => contribution.pullRequest.endsWith("/pull/9"))!;
    expect(unknown.project).toEqual({ name: "tiny-lib", repo: "some-org/tiny-lib", url: "https://github.com/some-org/tiny-lib" });
    expect(unknown.kind).toBe(KIND.fix);
    expect(unknown.issue).toEqual({ label: "#41", url: "https://github.com/some-org/tiny-lib/issues/41" });
    expect(unknown.description).toBe("The parser threw on an empty value. It now returns an empty string.");
    expect(unknown.featured).toBeUndefined();
  });

  it("orders by group, then project importance, then newest first", () => {
    const fixes = ofKind(set, KIND.fix).map((contribution) => contribution.pullRequest);
    expect(fixes[0]).toBe(SPRING_PR);
    expect(fixes.at(-1)).toContain("some-org/tiny-lib/pull/9");
    expect(set.all.at(-1)!.kind).toBe(KIND.tests);
  });

  it("adds the changes the maintainers applied themselves, with their commit", () => {
    const applied = set.all.filter((contribution) => contribution.commit);
    expect(applied.map((contribution) => contribution.pullRequest)).toEqual(APPLIED_BY_MAINTAINERS.map((change) => change.pullRequest));
    expect(set.projectCount).toBe(2 + APPLIED_BY_MAINTAINERS.length);
  });

  it("passes the open count through and lists only noted contributions as featured", () => {
    expect(set.openCount).toBe(3);
    expect(set.featured.map((contribution) => contribution.pullRequest)).toEqual([SPRING_PR]);
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

describe("the notes", () => {
  const noted = Object.keys(NOTES);
  const landed = [...snapshot.merged.map((pullRequest) => pullRequest.url), ...APPLIED_BY_MAINTAINERS.map((change) => change.pullRequest)];

  it("each describe a pull request that landed, so none is stale", () => {
    for (const url of noted) expect(landed).toContain(url);
  });

  it("each have a summary, a problem and a fix, and every featured one has a summary", () => {
    for (const [url, note] of Object.entries(NOTES)) {
      expect(note.summary, url).toBeTruthy();
      expect(note.problem, url).toBeTruthy();
      expect(note.fix, url).toBeTruthy();
      expect(KIND_ORDER).toContain(note.kind);
    }
  });

  it("feature between six and ten contributions for the home page", () => {
    const featured = Object.values(NOTES).filter((note) => note.featured).length;
    expect(featured).toBeGreaterThanOrEqual(6);
    expect(featured).toBeLessThanOrEqual(10);
  });

  it("cover every pull request in the snapshot", () => {
    for (const pullRequest of snapshot.merged) expect(noted, pullRequest.url).toContain(pullRequest.url);
  });
});
