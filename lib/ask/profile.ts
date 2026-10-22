// The plain-text profile the question box answers from: everything the site says, in one document.
// Served at /ai-profile.txt (app/ai-profile.txt/route.ts) and fetched by the Worker in worker/.
// Built from the same content files as the page, so it can never disagree with it. The phone
// number is left out on purpose: the box should point people at email.

import { DISSERTATION, education, skills } from "@/content/background";
import { experience } from "@/content/experience";
import { type ContributionSet, KIND_COPY } from "@/content/open-source";
import { LINKS, PERSON, SITE_URL } from "@/content/person";
import { alsoProjects, featuredProjects, repoUrl } from "@/content/projects";
import { recommendations } from "@/content/recommendations";
import { OPEN_SOURCE_PAGE } from "@/content/sections";
import { articles, SERIES_TITLE } from "@/content/writing";

function section(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines].join("\n");
}

function who(): string {
  return section("Who", [
    `${PERSON.name}, ${PERSON.jobTitle}, based in ${PERSON.location}.`,
    PERSON.intro,
    `Focus: ${PERSON.focus}. ${PERSON.tagline}`,
    `Website: ${SITE_URL}. Email: ${PERSON.email}. GitHub: ${LINKS.github}. LinkedIn: ${LINKS.linkedin}. Medium: ${LINKS.medium}.`,
    `CV (PDF): ${SITE_URL}/cv.pdf`,
  ]);
}

function work(): string {
  return section(
    "Experience, most recent first",
    experience.map((job) => `- ${job.title} at ${job.company}, ${job.period}, ${job.location}. ${job.highlights.join(" ")}`),
  );
}

function background(): string {
  return section("Education and skills", [
    ...education.map((item) => `- ${item.qualification}, ${item.institution}, ${item.period}.${item.dissertation ? ` ${item.dissertation.label}: ${item.dissertation.url}` : ""}`),
    `Dissertation: ${DISSERTATION.label} (${DISSERTATION.url}).`,
    ...skills.map((group) => `- ${group.group}: ${group.items.join(", ")}.`),
  ]);
}

function projects(): string {
  return section(
    "Personal projects",
    [...featuredProjects, ...alsoProjects].map(
      (project) =>
        `- ${project.name}${project.status ? ` (${project.status})` : ""}: ${project.description} Technologies: ${project.tags.join(", ")}. Code: ${repoUrl(project)}.${project.liveUrl ? ` Live: ${project.liveUrl}.` : ""}`,
    ),
  );
}

function writing(): string {
  return section(`Writing: ${SERIES_TITLE}, a series on Medium`, articles.map((article, index) => `- Part ${index + 1}: ${article.title}. ${article.url}`));
}

function openSource(contributions: ContributionSet): string {
  const lines = [
    `${contributions.all.length} pull requests landed in ${contributions.projectCount} open-source projects; ${contributions.openCount} more are open. Full list with details: ${SITE_URL}${OPEN_SOURCE_PAGE.path}`,
  ];
  // One line per contribution: the summary says what changed; the problem and fix stay on the page.
  // Every question carries this whole document, so its size is most of what an answer costs.
  for (const contribution of contributions.all) {
    const story = contribution.summary ?? contribution.description ?? "";
    lines.push(`- ${contribution.project.name} (${KIND_COPY[contribution.kind].title.toLowerCase()}, ${contribution.landed}): ${contribution.title}. ${story} ${contribution.pullRequest}`);
  }
  return section("Open-source contributions", lines);
}

function said(): string {
  return section(
    "What colleagues say (LinkedIn recommendations)",
    recommendations.map((recommendation) => `- ${recommendation.name} (${recommendation.relationship}, ${recommendation.year}): "${recommendation.quote}"`),
  );
}

/** The whole profile as plain text with markdown-style headings. */
export function buildProfile(contributions: ContributionSet): string {
  return [`# ${PERSON.name}`, who(), work(), background(), projects(), writing(), openSource(contributions), said()].join("\n\n");
}
