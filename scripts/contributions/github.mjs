// The GitHub reads the update script needs beyond the pull request list: star counts, and the
// material a note is written from (the full description, the diff, the issue, the conversation).
// GITHUB_TOKEN (set by GitHub Actions) or GH_TOKEN lifts the unauthenticated rate limit.

const API = "https://api.github.com";
const DIFF_LIMIT = 60_000;
const COMMENT_LIMIT = 1_500;

function headers(accept = "application/vnd.github+json") {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function get(path, accept) {
  const response = await fetch(`${API}/${path}`, { headers: headers(accept) });
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  return accept ? response.text() : response.json();
}

/** The star count of a repository. */
export async function starsOf(repo) {
  const repository = await get(`repos/${repo}`);
  return repository.stargazers_count;
}

const CLOSES_ISSUE = /\b(?:fix(?:es)?|closes?|resolves?)\s+(?:#|gh-)(\d+)/i;

function numberOf(pullRequestUrl) {
  return Number(pullRequestUrl.split("/").at(-1));
}

async function linkedIssue(repo, body) {
  const match = CLOSES_ISSUE.exec(body);
  if (!match) return null;
  try {
    const issue = await get(`repos/${repo}/issues/${match[1]}`);
    return { number: issue.number, title: issue.title, body: (issue.body ?? "").slice(0, 4_000) };
  } catch {
    return null;
  }
}

function trim(comment) {
  return { author: comment.user?.login ?? "?", body: (comment.body ?? "").slice(0, COMMENT_LIMIT) };
}

/** Everything a note is written from, for one merged pull request. */
export async function pullRequestContext({ url, title, body, repo }) {
  const number = numberOf(url);
  const [diff, issue, comments, reviews] = await Promise.all([
    get(`repos/${repo}/pulls/${number}`, "application/vnd.github.diff"),
    linkedIssue(repo, body),
    get(`repos/${repo}/issues/${number}/comments`),
    get(`repos/${repo}/pulls/${number}/reviews`),
  ]);
  const conversation = [...comments, ...reviews.filter((review) => review.body)].map(trim);
  return {
    url,
    title,
    repo,
    body,
    issue,
    conversation,
    diff: diff.slice(0, DIFF_LIMIT),
    diffTruncated: diff.length > DIFF_LIMIT,
  };
}
