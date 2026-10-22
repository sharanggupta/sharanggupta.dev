import { describe, expect, it } from "vitest";
import type { PullRequestFacts, PullRequests } from "@/lib/github/pull-requests";
import { mergeWithSnapshot } from "./merge-pull-requests";

const facts = (url: string, title = url): PullRequestFacts => ({ url, title, body: "", repo: "o/r", mergedAt: "2026-10-22T00:00:00Z" });
const set = (merged: PullRequestFacts[], openCount: number): PullRequests => ({ merged, openCount, fetchedAt: "2026-10-22T00:00:00Z" });

describe("mergeWithSnapshot", () => {
  it("keeps a pull request the live answer dropped, prefers live facts, and takes the live open count", () => {
    const live = set([facts("a", "a, retitled"), facts("c")], 7);
    const snapshot = set([facts("a"), facts("b")], 5);
    const merged = mergeWithSnapshot(live, snapshot);
    expect(merged.merged.map((pullRequest) => pullRequest.url).toSorted()).toEqual(["a", "b", "c"]);
    expect(merged.merged.find((pullRequest) => pullRequest.url === "a")!.title).toBe("a, retitled");
    expect(merged.openCount).toBe(7);
  });
});
