// Writes the note for one pull request with Claude Code in headless mode (`claude -p`), so it runs on
// the Claude subscription: locally after `claude` is logged in, and in GitHub Actions with the
// long-lived token from `claude setup-token` in CLAUDE_CODE_OAUTH_TOKEN. No API key is involved.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const MODEL = "opus";
const TIMEOUT_MS = 10 * 60 * 1000;

const NOTE_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["fix", "feature", "docs", "tests"] },
    summary: { type: "string" },
    problem: { type: "string" },
    fix: { type: "string" },
    projectName: { type: "string" },
  },
  required: ["kind", "summary", "problem", "fix", "projectName"],
  additionalProperties: false,
};

const GUIDE = `You write the entry for one merged pull request on the personal website of its author, Sharang Gupta.
Readers are engineers and hiring managers. Write only what the material supports; never invent a detail,
a number or a test that is not in it.

Fields:
- kind: "fix" for a behaviour or bug fix, "feature" for new capability or API, "docs" for documentation
  only, "tests" for changes to tests or the build with no production change.
- summary: one sentence, at most 30 words, present tense, saying what is true now (not "this PR adds").
- problem: what was wrong or missing before, and why it mattered, 40 to 90 words.
- fix: what the change does about it and how it was verified (which tests fail without it), 40 to 90 words.
  Mention review outcomes only when they changed the result.
- projectName: the project's usual public name, for example "Apache Log4j 2", "Eclipse Jetty", "OpenFeign".

Voice: plain and specific, British spelling, no marketing words, no exclamation marks, no em dashes,
no bullet points, no markdown. Name classes and methods as they appear in the code, without backticks.
Follow the two examples exactly in tone and length.`;

function render(context, projectName, examples) {
  const parts = [
    `Project: ${projectName} (${context.repo})`,
    `Pull request: ${context.url}`,
    `Title: ${context.title}`,
    `Description:\n${context.body || "(none)"}`,
  ];
  if (context.issue) parts.push(`Linked issue #${context.issue.number}: ${context.issue.title}\n${context.issue.body}`);
  if (context.conversation.length) {
    parts.push(`Conversation:\n${context.conversation.map((comment) => `${comment.author}: ${comment.body}`).join("\n---\n")}`);
  }
  parts.push(`Diff${context.diffTruncated ? " (truncated)" : ""}:\n${context.diff}`);
  const shown = examples.map((example) => JSON.stringify(example, null, 2)).join("\n");
  return `${GUIDE}\n\nExamples of finished entries:\n${shown}\n\nMaterial for the entry to write:\n\n${parts.join("\n\n")}`;
}

/** The note for one pull request, as {kind, summary, problem, fix, projectName}. */
export async function writeNote(context, { projectName, examples }) {
  const prompt = render(context, projectName, examples);
  const { stdout } = await run(
    // A `claude` whose login has expired retries without end; the timeout turns that into a clear failure.
    "claude",
    [
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(NOTE_SCHEMA),
      "--model",
      MODEL,
      // No tools and no MCP servers: the material is all in the prompt, and a plugin's server that
      // fails to start would otherwise hang the run.
      "--tools",
      "",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--no-session-persistence",
    ],
    { input: prompt, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
  ).catch((error) => {
    throw new Error(`Claude Code failed for ${context.url}: ${error.message}. Is \`claude\` logged in (claude login), or CLAUDE_CODE_OAUTH_TOKEN set?`);
  });
  const result = JSON.parse(stdout);
  if (result.is_error || !result.structured_output) {
    throw new Error(`Claude Code did not return a note for ${context.url}: ${result.result ?? result.subtype}`);
  }
  return result.structured_output;
}
