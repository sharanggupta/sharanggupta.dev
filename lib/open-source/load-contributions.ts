import { buildContributions, type ContributionSet } from "@/content/open-source";
import snapshot from "@/content/open-source.snapshot.json";
import { HANDLE } from "@/content/person";
import { fetchPullRequests, type PullRequests } from "@/lib/github/pull-requests";

/** Set CONTRIBUTIONS_SOURCE=snapshot to build without calling GitHub. */
const USE_SNAPSHOT = process.env.CONTRIBUTIONS_SOURCE === "snapshot";

async function loadPullRequests(): Promise<PullRequests> {
  if (USE_SNAPSHOT) return snapshot;
  try {
    return await fetchPullRequests(HANDLE);
  } catch (error) {
    console.warn(`Using the open-source snapshot of ${snapshot.fetchedAt}: ${(error as Error).message}`);
    return snapshot;
  }
}

/** The contributions shown on the site: GitHub's list of merged pull requests, with the notes from content/. */
export async function loadContributions(): Promise<ContributionSet> {
  return buildContributions(await loadPullRequests());
}
