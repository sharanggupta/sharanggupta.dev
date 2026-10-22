import ArrowLink from "@/components/ui/ArrowLink";
import Container from "@/components/ui/Container";
import Kicker from "@/components/ui/Kicker";
import TextLink from "@/components/ui/TextLink";
import { type Contribution, type ContributionSet, KIND_COPY, KIND_ORDER, ofKind } from "@/content/open-source";
import { LINKS } from "@/content/person";
import { OPEN_SOURCE_PAGE, SECTION } from "@/content/sections";
import { longDate } from "@/lib/format";

const TERM = "font-mono text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-accent";

function Meta({ contribution }: { contribution: Contribution }) {
  return (
    <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted">
      <TextLink href={contribution.project.url}>{contribution.project.name}</TextLink>
      <span aria-hidden="true">·</span>
      <span>
        Landed <time dateTime={contribution.landed}>{longDate(contribution.landed)}</time>
      </span>
      {contribution.issue && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Issue <TextLink href={contribution.issue.url}>{contribution.issue.label}</TextLink>
          </span>
        </>
      )}
      {contribution.commit && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Applied as <TextLink href={contribution.commit.url}>{contribution.commit.label}</TextLink>
          </span>
        </>
      )}
    </p>
  );
}

/** The problem and the fix when there is a note; otherwise the start of the pull request's own description. */
function Story({ contribution }: { contribution: Contribution }) {
  if (contribution.problem && contribution.fix) {
    return (
      <dl className="mt-4 grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-3">
        <dt className={TERM}>Problem</dt>
        <dd className="text-muted">{contribution.problem}</dd>
        <dt className={TERM}>Fix</dt>
        <dd className="text-muted">{contribution.fix}</dd>
      </dl>
    );
  }
  if (contribution.description) {
    return <p className="mt-4 text-muted">{contribution.description}</p>;
  }
  return null;
}

/** One contribution: title (a link to the pull request), where and when it landed, then its story. */
function ContributionEntry({ contribution }: { contribution: Contribution }) {
  return (
    <article className="border-b border-border py-7">
      <h3 className="text-lg font-semibold">
        <a className="hover:text-accent" href={contribution.pullRequest}>
          {contribution.title}
        </a>
      </h3>
      <Meta contribution={contribution} />
      <Story contribution={contribution} />
    </article>
  );
}

/** The page at /open-source: every contribution that landed, grouped by what it did. */
export default function AllContributions({ contributions }: { contributions: ContributionSet }) {
  const groups = KIND_ORDER.map((kind) => ({ kind, entries: ofKind(contributions, kind) })).filter((group) => group.entries.length > 0);
  return (
    <Container className="pb-8 pt-32">
      <Kicker>Open source</Kicker>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{OPEN_SOURCE_PAGE.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        {contributions.all.length} pull requests that landed in {contributions.projectCount} projects, each with what the problem was
        and how it was fixed.
      </p>
      <p className="mt-4 text-muted">
        {contributions.openCount} more are in review: <TextLink href={LINKS.openPullRequests}>open pull requests on GitHub</TextLink>.
      </p>
      <nav className="mt-8" aria-label="Groups">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {groups.map(({ kind, entries }) => (
            <li key={kind}>
              <TextLink href={`#${kind}`}>
                {KIND_COPY[kind].title} ({entries.length})
              </TextLink>
            </li>
          ))}
        </ul>
      </nav>
      {groups.map(({ kind, entries }) => (
        <section key={kind} id={kind} aria-labelledby={`${kind}-heading`} className="mt-16 scroll-mt-20">
          <h2 id={`${kind}-heading`} className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {KIND_COPY[kind].title}
          </h2>
          <p className="mt-2 max-w-2xl text-muted">{KIND_COPY[kind].intro}</p>
          <div className="mt-4 border-t border-border">
            {entries.map((contribution) => (
              <ContributionEntry key={contribution.pullRequest} contribution={contribution} />
            ))}
          </div>
        </section>
      ))}
      <p className="mt-14">
        <ArrowLink href={`/#${SECTION.openSource}`}>Back to the home page</ArrowLink>
      </p>
    </Container>
  );
}
