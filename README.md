# sharanggupta.dev

My personal site: selected projects, open-source contributions, writing and experience.
Live at https://www.sharanggupta.dev

Built with Next.js (App Router), TypeScript and Tailwind CSS, on Node 24.

## Where things live

```
content/        The facts the site and the CV share (projects, jobs, links, quotes), one file per topic,
                with the few helpers that describe them. Headings and short intros sit beside the
                section component that shows them.
sections/       One folder per section of the page (Hero, Work, Writing, ...).
                Each folder holds everything for its section: component, CSS module, test.
components/
  ui/           Small building blocks used by several sections (Button, Card, Section, Reveal, ...).
  layout/       The frame around the page: Header, SiteMenu, ThemeToggle, ReadingProgress, Footer.
  brand/        The logo mark, the hexagon pattern and the generated social image and icon.
  seo/          JSON-LD structured data.
lib/            Logic without markup: theme, hooks, SEO metadata, small helpers.
app/            Next.js routes only: layout, page, robots, sitemap, manifest, icons, social images,
                and globals.css (colour tokens and base styles, nothing else).
scripts/        The CV generator: generate-cv.mjs runs, cv/ holds its parts.
tests/e2e/      Browser tests (Playwright).
public/         Static files, including the generated cv.pdf.
```

The home page reads top to bottom in `app/page.tsx`: Hero, Work, Open source, Writing, Experience,
Recommendations, Background, Contact. Section ids, menu entries and numbering live in
`content/sections.ts`, so adding a section means one entry there and one folder under `sections/`.
The one other page, `/open-source`, lists every open-source contribution in full.

## Open-source contributions

Nothing in the open-source section is typed in by hand:

- **The list** comes from the public GitHub search API (`lib/github/pull-requests.ts`): every pull
  request of mine merged in a repository that is not mine. No token is needed. Next.js caches the
  answer for a day, so a newly merged pull request shows up on its own.
- **The order** follows each project's star count, kept in `content/open-source.projects.json` with
  its display name. The home page features the best fix or feature of the eight most-starred projects.
- **The notes** (what the problem was, how it was fixed) live in `content/open-source.notes.json`.
  A pull request without a note is still shown, with the start of its own description.

`npm run contributions` refreshes all three files: it fetches the pull requests and star counts, and
for every pull request without a note it runs Claude Code headless (`claude -p`, with the pull
request's description, diff, linked issue and review thread) to write one. That uses the Claude
subscription, not an API key: locally it needs `claude` to be logged in; in CI it needs the token
from `claude setup-token` as the `CLAUDE_CODE_OAUTH_TOKEN` secret. `--dry-run` shows what would
change without writing or calling the model; `--rewrite <url>` writes one note again.

`.github/workflows/contributions.yml` runs it every morning and commits the result to `main`,
which Vercel deploys; a day with nothing new commits nothing. Star counts are only rewritten when
they move by a few percent, so the order stays stable. A generated note has `"source": "claude"`
in the file; edit it there if it reads wrong. A manual run of the workflow can pass a pull request
URL to write that note again. `content/open-source.snapshot.json`
is the copy of the GitHub data the site falls back on when GitHub cannot be reached at build time
(or always with `CONTRIBUTIONS_SOURCE=snapshot`); the same run refreshes it.

## The question box

A pill floats at the bottom of every page, with no band behind it, where a visitor can ask one
question at a time about Sharang. The answers come from an AI model, grounded only in `/ai-profile.txt`: a plain-text
version of everything on the site, built from the same `content/` files by `lib/ask/profile.ts`
(the phone number is left out on purpose; the box points people at email).

The backend is `worker/`, a Cloudflare Worker on the free plan, which includes 10,000 Workers AI
neurons a day. It answers `GET /status` (whether the box should show, and how many answers are
left today) and `POST /ask`. Limits, in `worker/src/logic.ts`: 45 model answers a day for everyone
together, 5 a day per visitor (a salted hash of the address, never the address), 3 a minute per
visitor, 300 characters a question, 1,500 output tokens (the model's reasoning counts against
them). Counters live in Workers KV and reset at UTC midnight.

Two things stretch the free allowance. The profile is kept compact (one line per contribution; the
problem and fix stay on the page), because every question carries the whole document and that is
most of an answer's cost. And every answer is cached in KV for a week, keyed by the normalised
question and the profile's hash: the same question again costs nothing and counts for nothing. The
bar (`components/ask/AskBar.tsx`) completes the questions in `content/ask.ts` in grey inside the
input as the visitor types (Tab or the right arrow accepts; a tappable line on touch screens), so
most visitors ask in words that are already answered. The pill is one line, with no small print; a
notice appears only when a limit is hit. The Worker logs
the model's reported token usage per answer, for tuning the daily cap. It keeps a copy of the last
good profile in KV and answers from it if the site refuses the fetch (Vercel's bot checks can).

The bar shows only while the Worker says answers are left, and goes away for the day when they run
out or the Worker fails, so nothing on the page breaks when the quota is spent. The model is
`@cf/openai/gpt-oss-120b`; `textOf()` in the Worker reads the answer from the result shapes Workers
AI uses.

Setting it up, once, from the repository root:

```bash
npx wrangler login
npx wrangler kv namespace create COUNTERS   # paste the id into worker/wrangler.toml
npx wrangler -c worker/wrangler.toml secret put VISITOR_SALT   # any long random string
npm run worker:deploy                       # prints the workers.dev URL
```

Then set `NEXT_PUBLIC_ASK_URL` to that URL in Vercel (and in `.env.local` for `npm run dev`) and
redeploy the site. Without the variable the site builds and runs with no box at all.
`npm run worker:dev` runs the Worker locally.

## How styling works

Look beside the component first: nothing is styled from a distant global file.

- **Tailwind utilities in the markup** for layout, spacing, type and colour. They read left to right
  in the component that owns them.
- **A `.module.css` next to the component** only for what utilities cannot say clearly: clip-path
  shapes, gradients, pseudo-elements, keyframes and selectors that depend on state or on a
  neighbour. The class names are local, so editing one file cannot change another component.
- **`app/globals.css`** holds only the colour variables for light and dark, spacing tokens, base
  element styles and the two shared entrance animations.
- Components that react to a hovered card use the `data-card` attribute as the hook (see `Card`
  and `ArrowLink`) instead of reaching into each other's class names.

Under `components/`, a component gets a folder only when it has a CSS module or a test of its
own; otherwise it is a single file. Every section under `sections/` gets a folder, so the page
maps one to one onto the directory.

## Commands

```bash
npm install
npm run dev         # local development on http://localhost:3000
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # TypeScript check
npm run lint        # oxlint
npm test            # unit and component tests (Vitest)
npm run test:e2e    # browser tests (Playwright, uses the Chrome on this machine; run a build first)
npm run cv          # regenerate public/cv.pdf
npm run worker:deploy  # deploy the question box's Worker (see below)
npm run contributions  # refresh the open-source data from GitHub and write missing notes
```

After changing `content/`, run `npm run cv` and commit the new PDF.

## Theme

Light or dark follows the saved choice, otherwise the system setting. A tiny inline script
(`lib/theme/theme-script.ts`) applies it before the first paint, so there is no flash.
