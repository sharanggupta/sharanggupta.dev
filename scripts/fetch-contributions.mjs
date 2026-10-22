// Refreshes content/open-source.snapshot.json, the copy of the GitHub data the site falls back on
// when GitHub cannot be reached at build time. Run with:  npm run contributions
import { writeFileSync } from "node:fs";
import { HANDLE } from "../content/person.ts";
import { fetchPullRequests } from "../lib/github/pull-requests.ts";

const OUTPUT_PATH = "content/open-source.snapshot.json";
const BODY_LIMIT = 1500;

const pullRequests = await fetchPullRequests(HANDLE);
// Only the start of a body is ever shown, so the snapshot keeps the file small.
const merged = pullRequests.merged.map((pullRequest) => ({ ...pullRequest, body: pullRequest.body.slice(0, BODY_LIMIT) }));
writeFileSync(OUTPUT_PATH, `${JSON.stringify({ ...pullRequests, merged }, null, 2)}\n`);
console.log(`Wrote ${OUTPUT_PATH}: ${merged.length} merged pull requests, ${pullRequests.openCount} open.`);
