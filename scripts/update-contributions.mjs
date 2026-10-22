// Refreshes everything the site knows about open-source contributions:
//   content/open-source.snapshot.json   the merged pull requests, from GitHub
//   content/open-source.projects.json   each project's name and star count (the ranking)
//   content/open-source.notes.json      the story of each pull request; missing ones are written by Claude
// Run with:  npm run contributions            (daily in GitHub Actions, or by hand)
//            npm run contributions -- --dry-run      show what would change, write nothing, call no model
//            npm run contributions -- --rewrite <url> write that pull request's note again
import { readFileSync, writeFileSync } from "node:fs";
import { HANDLE } from "../content/person.ts";
import { fetchPullRequests } from "../lib/github/pull-requests.ts";
import { pullRequestContext, starsOf } from "./contributions/github.mjs";
import { starsMoved } from "./contributions/stars.mjs";
import { writeNote } from "./contributions/write-note.mjs";

const SNAPSHOT_PATH = "content/open-source.snapshot.json";
const PROJECTS_PATH = "content/open-source.projects.json";
const NOTES_PATH = "content/open-source.notes.json";
const BODY_LIMIT = 1500;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rewrite = args.includes("--rewrite") ? args[args.indexOf("--rewrite") + 1] : undefined;
const today = new Date().toISOString().slice(0, 10);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  if (dryRun) return;
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function byStars(projects) {
  return Object.fromEntries(Object.entries(projects).toSorted(([, a], [, b]) => b.stars - a.stars));
}

const pullRequests = await fetchPullRequests(HANDLE);
const projects = readJson(PROJECTS_PATH);
const notes = readJson(NOTES_PATH);

// 1. The snapshot: only the start of a body is ever shown by the site, so it stays small. No timestamp,
//    so that a daily run that found nothing new changes nothing and opens no pull request.
const merged = pullRequests.merged.map((pullRequest) => ({ ...pullRequest, body: pullRequest.body.slice(0, BODY_LIMIT) }));
writeJson(SNAPSHOT_PATH, { merged, openCount: pullRequests.openCount });
console.log(`${merged.length} merged pull requests, ${pullRequests.openCount} open.`);

// Sequential on purpose below: the GitHub rate limit, and one model call at a time.
/* oxlint-disable no-await-in-loop */
// 2. Star counts for every project, including those only in the notes (changes applied by maintainers).
//    Written only when a count really moved, so a quiet day changes nothing.
const repos = new Set([...pullRequests.merged.map((pullRequest) => pullRequest.repo), ...Object.keys(projects)]);
for (const repo of repos) {
  const stars = await starsOf(repo);
  const record = projects[repo] ?? { name: repo.split("/")[1] };
  projects[repo] = starsMoved(record.stars, stars) ? { ...record, stars, starsAt: today } : record;
}

// 3. A note for every merged pull request that has none.
const missing = pullRequests.merged.filter((pullRequest) => !notes[pullRequest.url] || pullRequest.url === rewrite);
console.log(missing.length ? `Notes to write: ${missing.map((pullRequest) => pullRequest.url).join(", ")}` : "Every pull request has a note.");
for (const pullRequest of missing) {
  if (dryRun) continue;
  const context = await pullRequestContext(pullRequest);
  const note = await writeNote(context, { projectName: projects[pullRequest.repo].name, examples: handWrittenExamples(notes) });
  notes[pullRequest.url] = { kind: note.kind, summary: note.summary, problem: note.problem, fix: note.fix, source: "claude", writtenAt: today };
  if (!projects[pullRequest.repo].name || projects[pullRequest.repo].name === pullRequest.repo.split("/")[1]) {
    projects[pullRequest.repo].name = note.projectName;
  }
  console.log(`Wrote the note for ${pullRequest.url} (${note.kind}).`);
}

writeJson(PROJECTS_PATH, byStars(projects));
writeJson(NOTES_PATH, notes);
console.log(dryRun ? "Dry run: nothing written." : "Done.");

/** Two hand-written notes, so a generated one follows the same voice. */
function handWrittenExamples(allNotes) {
  return Object.entries(allNotes)
    .filter(([, note]) => note.source === "hand")
    .slice(0, 2)
    .map(([url, note]) => ({ url, kind: note.kind, summary: note.summary, problem: note.problem, fix: note.fix }));
}
