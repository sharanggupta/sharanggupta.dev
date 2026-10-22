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

The list of contributions is not written by hand. `lib/github/pull-requests.ts` asks the public
GitHub search API for every pull request of mine merged in a repository that is not mine (no token
needed; `GITHUB_TOKEN` is used if set), and Next.js caches the answer for a day, so a newly merged
pull request shows up on its own. `content/open-source.ts` holds only what GitHub cannot know: the
projects in order of importance, and for each pull request a note with what the problem was and
how it was fixed. A pull request without a note is still shown, with the start of its own
description. Changes the maintainers applied as their own commit, which GitHub does not count as
merged, are listed there too.

`content/open-source.snapshot.json` is a copy of the GitHub data, used when GitHub cannot be
reached at build time, or always with `CONTRIBUTIONS_SOURCE=snapshot`. Refresh it with
`npm run contributions` now and then; a test checks that every note still matches a pull request
in it.

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
npm run contributions  # refresh content/open-source.snapshot.json from GitHub
```

After changing `content/`, run `npm run cv` and commit the new PDF.

## Theme

Light or dark follows the saved choice, otherwise the system setting. A tiny inline script
(`lib/theme/theme-script.ts`) applies it before the first paint, so there is no flash.
