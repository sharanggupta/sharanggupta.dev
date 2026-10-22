// Reads the public pull requests of a GitHub user from the GitHub search API.
// No token is needed: the API allows ten unauthenticated searches a minute, and the pages
// refresh once a day. A GITHUB_TOKEN in the environment is used when present.

export type PullRequestFacts = {
  url: string;
  title: string;
  body: string;
  /** "owner/name" of the repository the pull request was opened against. */
  repo: string;
  /** When it was merged, or null for a pull request that is open or was closed unmerged. */
  mergedAt: string | null;
};

export type PullRequests = {
  merged: PullRequestFacts[];
  /** How many pull requests are still open. */
  openCount: number;
  /** When this was fetched. */
  fetchedAt: string;
};

const API = "https://api.github.com";
const PAGE_SIZE = 100;
const REVALIDATE_SECONDS = 60 * 60 * 24;

type SearchItem = {
  html_url: string;
  title: string;
  body: string | null;
  repository_url: string;
  pull_request?: { merged_at: string | null };
};

type SearchResult = { total_count: number; items: SearchItem[] };

/** Pull requests the user opened in repositories that are not their own. */
function queryFor(handle: string, filter: string): string {
  return ["is:pr", `author:${handle}`, `-user:${handle}`, filter].join(" ");
}

async function search(query: string, page: number, perPage: number): Promise<SearchResult> {
  const url = new URL(`${API}/search/issues`);
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers, next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`GitHub search failed with ${response.status} for ${query}`);
  return (await response.json()) as SearchResult;
}

function toFacts(item: SearchItem): PullRequestFacts {
  return {
    url: item.html_url,
    title: item.title,
    body: item.body ?? "",
    repo: item.repository_url.replace(`${API}/repos/`, ""),
    mergedAt: item.pull_request?.merged_at ?? null,
  };
}

/** Every match: the first page says how many there are, the remaining pages are fetched together. */
async function searchAll(query: string): Promise<PullRequestFacts[]> {
  const first = await search(query, 1, PAGE_SIZE);
  const pageCount = Math.ceil(first.total_count / PAGE_SIZE);
  const remainingPages = Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => search(query, index + 2, PAGE_SIZE));
  const rest = await Promise.all(remainingPages);
  return [first, ...rest].flatMap((result) => result.items.map(toFacts));
}

export async function fetchPullRequests(handle: string): Promise<PullRequests> {
  const [merged, open] = await Promise.all([searchAll(queryFor(handle, "is:merged")), search(queryFor(handle, "is:open"), 1, 1)]);
  return { merged, openCount: open.total_count, fetchedAt: new Date().toISOString() };
}
