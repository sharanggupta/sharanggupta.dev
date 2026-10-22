import type { PullRequestFacts, PullRequests } from "@/lib/github/pull-requests";

/**
 * What GitHub says now, with the snapshot as a floor. GitHub's search index is eventually consistent
 * and has returned one pull request fewer from one minute to the next; a contribution that was once
 * merged stays merged, so anything in the snapshot that the live answer lacks is kept.
 */
export function mergeWithSnapshot(live: PullRequests, snapshot: PullRequests): PullRequests {
  const byUrl = new Map<string, PullRequestFacts>(snapshot.merged.map((pullRequest) => [pullRequest.url, pullRequest]));
  for (const pullRequest of live.merged) byUrl.set(pullRequest.url, pullRequest);
  return { ...live, merged: [...byUrl.values()] };
}
