import type { Metadata } from "next";
import { OPEN_SOURCE_PAGE } from "@/content/sections";
import { loadContributions } from "@/lib/open-source/load-contributions";
import AllContributions from "@/sections/open-source/AllContributions";

export async function generateMetadata(): Promise<Metadata> {
  const contributions = await loadContributions();
  return {
    title: OPEN_SOURCE_PAGE.title,
    description: `${contributions.all.length} pull requests that landed in ${contributions.projectCount} open-source projects, each with what the problem was and how it was fixed.`,
    alternates: { canonical: OPEN_SOURCE_PAGE.path },
    openGraph: { url: OPEN_SOURCE_PAGE.path, title: OPEN_SOURCE_PAGE.title },
  };
}

/** The second page of the site: every open-source contribution, in full. */
export default async function OpenSourcePage() {
  return (
    <main id="top">
      <AllContributions contributions={await loadContributions()} />
    </main>
  );
}
