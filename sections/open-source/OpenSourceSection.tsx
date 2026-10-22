import ArrowLink from "@/components/ui/ArrowLink";
import Reveal from "@/components/ui/Reveal/Reveal";
import { STAGGER_MS } from "@/lib/motion";
import Section from "@/components/ui/Section/Section";
import TextLink from "@/components/ui/TextLink";
import { LINKS } from "@/content/person";
import { OPEN_SOURCE_PAGE, SECTION, sectionHeading } from "@/content/sections";
import { loadContributions } from "@/lib/open-source/load-contributions";

export default async function OpenSourceSection() {
  const contributions = await loadContributions();
  return (
    <Section {...sectionHeading(SECTION.openSource)} tuck>
      {/* A list, not a table: each row stacks on phones and becomes two columns from "sm" up. */}
      <ul className="border-t border-border">
        {contributions.featured.map((contribution, index) => (
          <li key={contribution.pullRequest} className="border-b border-border">
            <Reveal delay={index * STAGGER_MS.listRow} className="py-4 sm:grid sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
              <ArrowLink href={contribution.pullRequest}>{contribution.project.name}</ArrowLink>
              <p className="mt-1 text-sm text-muted sm:mt-0">{contribution.summary}</p>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <ArrowLink href={OPEN_SOURCE_PAGE.path}>
          All {contributions.all.length} contributions in {contributions.projectCount} projects, with what each problem was and how it
          was fixed
        </ArrowLink>
      </p>
      <p className="mt-4 text-muted">
        {contributions.openCount} more are in review: <TextLink href={LINKS.openPullRequests}>open pull requests on GitHub</TextLink>.
      </p>
    </Section>
  );
}
