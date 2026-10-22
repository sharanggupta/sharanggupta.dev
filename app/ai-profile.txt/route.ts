import { buildProfile } from "@/lib/ask/profile";
import { loadContributions } from "@/lib/open-source/load-contributions";

// Served at /ai-profile.txt: the document the question box (worker/) answers from. Refreshed daily, like the pages.
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const profile = buildProfile(await loadContributions());
  return new Response(profile, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
