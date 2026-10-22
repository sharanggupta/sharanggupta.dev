import { describe, expect, it } from "vitest";
import { education, skills } from "./background";
import { experience } from "./experience";
import { APPLIED_BY_MAINTAINERS, NOTES } from "./open-source";
import { LINKS, PERSON, PROFILES } from "./person";
import { alsoProjects, featuredProjects, projectBadge, repoUrl } from "./projects";
import { recommendations } from "./recommendations";
import { MENU_ITEMS, SECTION, sectionKicker } from "./sections";
import { SEO } from "./seo";
import { articleCountWord, articles, seriesIntro } from "./writing";

const everything = JSON.stringify([
  PERSON, LINKS, featuredProjects, alsoProjects, NOTES, APPLIED_BY_MAINTAINERS, articles, experience, recommendations, education, skills, SEO,
]);

describe("wording that must never appear", () => {
  it.each(["Senior", "sharang1996", "sharang96", "Computing Science", "portfolio"])("%s", (forbidden) => {
    expect(everything).not.toContain(forbidden);
  });
});

describe("links", () => {
  const urls = [
    ...Object.values(LINKS),
    ...Object.keys(NOTES),
    ...Object.values(NOTES).flatMap((note) => (note.issue ? [note.issue.url] : [])),
    ...APPLIED_BY_MAINTAINERS.flatMap((change) => [change.pullRequest, change.commit.url]),
    ...articles.map((article) => article.url),
    ...featuredProjects.concat(alsoProjects).flatMap((project) => [repoUrl(project), ...(project.liveUrl ? [project.liveUrl] : [])]),
  ];

  it("are all https", () => {
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
  });

  it("include every profile in PROFILES", () => {
    expect(PROFILES.map((profile) => profile.href)).toEqual([LINKS.github, LINKS.linkedin, LINKS.medium]);
  });
});

describe("sections", () => {
  it("have unique ids", () => {
    const ids = Object.values(SECTION);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("are all reachable from the menu on any page, which also offers the CV", () => {
    const anchors = MENU_ITEMS.filter((item) => item.href.startsWith("/#")).map((item) => item.href.slice(2));
    for (const id of anchors) expect(Object.values(SECTION)).toContain(id);
    expect(MENU_ITEMS.some((item) => item.download)).toBe(true);
  });

  it("number their kickers in reading order", () => {
    expect(sectionKicker(SECTION.work)).toBe("01 · Work");
    expect(sectionKicker(SECTION.contact)).toBe("07 · Contact");
  });
});

describe("projects", () => {
  it("never headline a card with a language version", () => {
    for (const project of [...featuredProjects, ...alsoProjects]) expect(projectBadge(project)).not.toMatch(/^Java \d+$/);
    expect(projectBadge({ status: "Work in progress", badge: "Spring Boot", tags: ["Java 21"] })).toBe("Work in progress");
    expect(projectBadge({ badge: "Spring Boot", tags: ["Java 21"] })).toBe("Spring Boot");
    expect(projectBadge({ tags: ["Spring Batch"] })).toBe("Spring Batch");
  });

  it("have unique repositories and at least one tag", () => {
    const projects = [...featuredProjects, ...alsoProjects];
    expect(new Set(projects.map((project) => project.repo)).size).toBe(projects.length);
    for (const project of projects) expect(project.tags.length).toBeGreaterThan(0);
  });
});

describe("writing", () => {
  it("describes the series using the real article count", () => {
    expect(articles).toHaveLength(4);
    expect(articleCountWord()).toBe("four");
    expect(seriesIntro()).toBe("A four-part series, each part with a working app.");
  });
});

describe("recommendations", () => {
  it("have a substantial quote and a four-digit year", () => {
    for (const recommendation of recommendations) {
      expect(recommendation.quote.length).toBeGreaterThan(40);
      expect(recommendation.year).toMatch(/^\d{4}$/);
    }
  });
});

describe("experience", () => {
  it("lists the most recent job first and gives every job a period and location", () => {
    expect(experience[0].company).toBe("THG");
    for (const job of experience) {
      expect(job.period).toContain(" to ");
      expect(job.location).not.toBe("");
    }
  });
});
