// The question box's backend: a Cloudflare Worker on the free plan.
//   GET  /status  -> { available, remaining }   whether the box should show, and answers left today
//   POST /ask     -> { answer, remaining }      one answer, grounded in the site's /ai-profile.txt
// Limits (worker/src/logic.ts): a global daily cap, a per-visitor daily cap, and a per-minute rate
// limit per visitor, so one person cannot use up the day. Counters live in KV and reset at UTC midnight.
import {
  ANSWER_CACHE_SECONDS,
  answerKey,
  cleanQuestion,
  corsHeaders,
  dayOf,
  LIMITS,
  MODEL,
  secondsUntilTomorrow,
  systemPrompt,
  textOf,
  visitorId,
  withinQuota,
} from "./logic";

export interface Env {
  AI: Ai;
  COUNTERS: KVNamespace;
  ASK_RATE: RateLimit;
  /** Where the site runs; /ai-profile.txt is fetched from here. */
  SITE_URL: string;
  /** Comma-separated origins allowed to call the Worker. */
  ALLOWED_ORIGINS: string;
  /** A secret that salts the visitor hash (wrangler secret put VISITOR_SALT). */
  VISITOR_SALT: string;
}

const PROFILE_CACHE_SECONDS = 3600;

function json(body: unknown, httpStatus: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status: httpStatus, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });
}

async function count(env: Env, key: string): Promise<number> {
  return Number((await env.COUNTERS.get(key)) ?? 0);
}

async function increment(env: Env, key: string, value: number, now: Date): Promise<void> {
  await env.COUNTERS.put(key, String(value), { expirationTtl: secondsUntilTomorrow(now) + 3600 });
}

async function profileOf(env: Env): Promise<string> {
  const response = await fetch(`${env.SITE_URL}/ai-profile.txt`, { cf: { cacheTtl: PROFILE_CACHE_SECONDS, cacheEverything: true } });
  if (!response.ok) throw new Error(`profile ${response.status}`);
  return response.text();
}

async function status(env: Env, now: Date, cors: Record<string, string>): Promise<Response> {
  const today = await count(env, `day:${dayOf(now)}`);
  const remaining = Math.max(0, LIMITS.daily - today);
  return json({ available: remaining > 0, remaining }, 200, cors);
}

async function ask(request: Request, env: Env, now: Date, cors: Record<string, string>): Promise<Response> {
  const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const visitor = await visitorId(address, env.VISITOR_SALT);
  const { success } = await env.ASK_RATE.limit({ key: visitor });
  if (!success) return json({ error: "slow_down" }, 429, cors);

  const body = (await request.json().catch(() => ({}))) as { question?: unknown };
  const cleaned = cleanQuestion(body.question);
  if (!cleaned.ok) return json({ error: cleaned.error }, cleaned.status, cors);
  const dayKey = `day:${dayOf(now)}`;
  const visitorKey = `visitor:${visitor}:${dayOf(now)}`;

  // A question already answered for this version of the profile costs nothing and counts for nothing.
  let profile: string;
  try {
    profile = await profileOf(env);
  } catch (error) {
    console.error("profile failed", error);
    return json({ error: "unavailable" }, 503, cors);
  }
  const key = await answerKey(cleaned.question, profile);
  const [cached, today, mine] = await Promise.all([env.COUNTERS.get(key), count(env, dayKey), count(env, visitorKey)]);
  if (cached) return json({ answer: cached, remaining: Math.max(0, LIMITS.daily - today), cached: true }, 200, cors);

  const quota = withinQuota({ today, visitor: mine });
  if (!quota.ok) return json({ error: quota.error, remaining: Math.max(0, LIMITS.daily - today) }, quota.status, cors);

  let answer: string;
  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: systemPrompt(profile) },
        { role: "user", content: cleaned.question },
      ],
      max_tokens: LIMITS.answerTokens,
    });
    answer = textOf(result);
    // For tuning LIMITS.daily: what one answer cost, as the model reports it.
    console.log("usage", JSON.stringify((result as { usage?: unknown }).usage ?? null));
  } catch (error) {
    console.error("answer failed", error);
    return json({ error: "unavailable" }, 503, cors);
  }
  if (!answer) return json({ error: "unavailable" }, 503, cors);

  await Promise.all([
    increment(env, dayKey, today + 1, now),
    increment(env, visitorKey, mine + 1, now),
    env.COUNTERS.put(key, answer, { expirationTtl: ANSWER_CACHE_SECONDS }),
  ]);
  return json({ answer, remaining: Math.max(0, LIMITS.daily - today - 1) }, 200, cors);
}

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS.split(",").map((item) => item.trim()));
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (origin && !("Access-Control-Allow-Origin" in cors)) return json({ error: "forbidden" }, 403, {});

    const { pathname } = new URL(request.url);
    const now = new Date();
    if (request.method === "GET" && pathname === "/status") return status(env, now, cors);
    if (request.method === "POST" && pathname === "/ask") return ask(request, env, now, cors);
    return json({ error: "not_found" }, 404, cors);
  },
} satisfies ExportedHandler<Env>;
