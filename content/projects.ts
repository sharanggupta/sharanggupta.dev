// The projects on show: four featured, two in an "Also" row.
// Descriptions and technologies come from each repository's own README.

import { LINKS } from "./person.ts";

export type Project = {
  name: string;
  /** Repository name under the owner's GitHub account. */
  repo: string;
  status?: string;
  /** The short label on the card's art. Without it, the status is shown, or else the first tag. */
  badge?: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  /** One short line for the CV; the website shows the full description. */
  cvSummary: string;
};

/** The short label on a project's art: its status, else its badge, else its first technology. */
export function projectBadge(project: Pick<Project, "status" | "badge" | "tags">): string {
  return project.status ?? project.badge ?? project.tags[0];
}

export function repoUrl(project: Pick<Project, "repo">): string {
  return `${LINKS.github}/${project.repo}`;
}

export const featuredProjects: Project[] = [
  {
    name: "Orderly",
    repo: "orderly",
    cvSummary: "Hexagonal architecture, one failing test at a time.",
    status: "Work in progress",
    tags: ["Java 21", "Maven", "Hexagonal architecture", "TDD"],
    description:
      "A learning project: moving from controller-service-repository habits to a hexagonal design, one failing test at a time. Each layer is a Maven module that lists only what it may depend on, so an inward import from the domain is a compile error, not a review comment. The domain is built and the application layer has started; the REST API, database and Spring Boot application are planned.",
  },
  {
    name: "Flight search",
    repo: "flight-search",
    cvSummary: "Spring Boot REST API, hexagonal architecture, test-first.",
    badge: "Spring Boot",
    tags: ["Hexagonal architecture", "Spring Boot 3.4", "Java 21", "GitHub Actions"],
    description:
      "A Spring Boot REST API for searching flights, built test-first with hexagonal architecture. The domain and application code is plain Java; all framework code (Spring, JPA, REST) sits outside and depends inward, never the other way. Java 21, Spring Boot 3.4, with CI on GitHub Actions.",
  },
  {
    name: "EazyBank",
    repo: "eazybank",
    cvSummary: "Four Spring Boot microservices behind a gateway.",
    tags: ["Spring Boot", "Kubernetes", "PostgreSQL", "GitHub Actions"],
    description:
      "A banking application split into four Spring Boot microservices: a gateway as the single entry point, and account, card and loan services, each with its own PostgreSQL database. Runs on Kubernetes, with GitHub Actions workflows to build and deploy each service, and an observability stack (Prometheus, Grafana, Loki and Tempo) for metrics, logs and traces.",
  },
  {
    name: "OAuth2 product",
    repo: "oauth2product",
    cvSummary: "Resource server and client, built test-first.",
    tags: ["Spring Boot", "OAuth2", "Docker Compose", "TDD"],
    description:
      "An OAuth2 resource server and client with Spring Boot, built test-first and run end to end with Docker Compose. The article series below follows this code.",
  },
];

export const alsoProjects: Project[] = [
  {
    name: "Batch data migration",
    repo: "batch-data-migration",
    cvSummary: "NoSQL to SQL with Spring Batch.",
    tags: ["Spring Batch", "MongoDB", "PostgreSQL"],
    description: "Data migration from NoSQL to SQL using Spring Batch.",
  },
  {
    name: "Thiasil",
    repo: "thiasil",
    cvSummary: "Next.js website for a glass-works client.",
    tags: ["Next.js", "React", "Tailwind CSS", "Redis"],
    liveUrl: "https://www.thiasil.com/",
    description:
      "Website for Thia Glass Works: a Next.js application with a product catalogue, admin panel and PDF catalogue.",
  },
];
