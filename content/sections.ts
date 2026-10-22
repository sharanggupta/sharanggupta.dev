// The sections of the one-page site, in reading order: their ids, headings and the menu that links to them.
// Section ids live here only: the page, the menu and the redirects in next.config.ts all read them.
// Menu links start with "/" so that they also work from the open-source page.

import { CV } from "./person.ts";
import { SERIES_TITLE, seriesIntro } from "./writing.ts";

/** The one page besides the home page. */
export const OPEN_SOURCE_PAGE = { path: "/open-source", title: "Everything that landed upstream" } as const;

export const SECTION = {
  work: "work",
  openSource: "open-source",
  writing: "writing",
  experience: "experience",
  recommendations: "recommendations",
  education: "education",
  contact: "contact",
} as const;

export type SectionId = (typeof SECTION)[keyof typeof SECTION];

type SectionCopy = {
  /** The short name, shown in the menu and in the small numbered label above the heading. */
  label: string;
  title: string;
  intro?: string;
};

export const SECTION_COPY: Record<SectionId, SectionCopy> = {
  [SECTION.work]: {
    label: "Work",
    title: "Selected work",
    intro: "Small, complete projects, each built test-first to show one idea.",
  },
  [SECTION.openSource]: {
    label: "Open source",
    title: "Fixes that landed upstream",
    intro: "A selection of the merged pull requests in libraries I use.",
  },
  [SECTION.writing]: { label: "Writing", title: SERIES_TITLE, intro: seriesIntro() },
  [SECTION.experience]: { label: "Experience", title: "Where I have worked" },
  [SECTION.recommendations]: {
    label: "Recommendations",
    title: "What colleagues say",
    intro: "From LinkedIn recommendations; names and context as shown there.",
  },
  [SECTION.education]: { label: "Background", title: "Education and skills" },
  [SECTION.contact]: {
    label: "Contact",
    title: "Get in touch",
    intro: "Open to hearing about interesting engineering roles.",
  },
};

const READING_ORDER: readonly SectionId[] = Object.values(SECTION);

/** The small numbered label above a section heading, for example "01 · Work". */
export function sectionKicker(id: SectionId): string {
  const number = READING_ORDER.indexOf(id) + 1;
  return `${String(number).padStart(2, "0")} · ${SECTION_COPY[id].label}`;
}

/** What the Section component needs to show a section's heading. */
export function sectionHeading(id: SectionId) {
  const { title, intro } = SECTION_COPY[id];
  return { id, kicker: sectionKicker(id), title, intro };
}

export type MenuItem = { href: string; label: string; download?: string };

const MENU_SECTIONS: readonly SectionId[] = [
  SECTION.work,
  SECTION.openSource,
  SECTION.writing,
  SECTION.experience,
  SECTION.recommendations,
  SECTION.contact,
];

export const MENU_ITEMS: readonly MenuItem[] = [
  ...MENU_SECTIONS.map((id) => ({ href: `/#${id}`, label: SECTION_COPY[id].label })),
  { href: CV.path, label: CV.menuLabel, download: CV.downloadName },
];
