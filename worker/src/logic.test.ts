import { describe, expect, it } from "vitest";
import { answerKey, corsHeaders, dayOf, judge, LIMITS, normaliseQuestion, secondsUntilTomorrow, systemPrompt, textOf, visitorId } from "./logic";

describe("judge", () => {
  const fresh = { today: 0, visitor: 0 };

  it("accepts a trimmed question", () => {
    expect(judge("  What does Sharang\n work on? ", fresh)).toEqual({ ok: true, question: "What does Sharang work on?" });
  });

  it("rejects empty, non-string and over-long questions", () => {
    expect(judge("", fresh)).toMatchObject({ ok: false, status: 400, error: "empty" });
    expect(judge(42, fresh)).toMatchObject({ ok: false, status: 400 });
    expect(judge("x".repeat(LIMITS.questionChars + 1), fresh)).toMatchObject({ ok: false, status: 400, error: "too_long" });
  });

  it("stops at the daily cap before the visitor cap", () => {
    expect(judge("Hello?", { today: LIMITS.daily, visitor: 0 })).toMatchObject({ ok: false, status: 429, error: "daily_limit" });
    expect(judge("Hello?", { today: 1, visitor: LIMITS.perVisitorDaily })).toMatchObject({ ok: false, status: 429, error: "visitor_limit" });
  });
});

describe("the day", () => {
  it("keys counters by UTC date and expires them after midnight", () => {
    const now = new Date("2026-10-22T23:59:00Z");
    expect(dayOf(now)).toBe("2026-10-22");
    expect(secondsUntilTomorrow(now)).toBe(60);
    expect(secondsUntilTomorrow(new Date("2026-10-22T00:00:00Z"))).toBe(86_400);
  });
});

describe("textOf", () => {
  it("reads the answer from each result shape Workers AI uses", () => {
    expect(textOf("plain ")).toBe("plain");
    expect(textOf({ response: " llama style " })).toBe("llama style");
    expect(textOf({ choices: [{ message: { content: "chat style" } }] })).toBe("chat style");
    expect(textOf({ output: [{ type: "reasoning" }, { type: "message", content: [{ type: "output_text", text: "responses style" }] }] })).toBe("responses style");
    expect(textOf({ something: "else" })).toBe("");
  });
});

describe("corsHeaders", () => {
  const allowed = ["https://www.sharanggupta.dev", "http://localhost:3000"];

  it("allows a listed origin and nobody else", () => {
    expect(corsHeaders("https://www.sharanggupta.dev", allowed)["Access-Control-Allow-Origin"]).toBe("https://www.sharanggupta.dev");
    expect(corsHeaders("https://evil.example", allowed)).toEqual({});
    expect(corsHeaders(null, allowed)).toEqual({});
  });
});

describe("visitorId", () => {
  it("is stable for one address and salt, and differs otherwise", async () => {
    const a = await visitorId("203.0.113.9", "salt");
    expect(a).toBe(await visitorId("203.0.113.9", "salt"));
    expect(a).toHaveLength(24);
    expect(a).not.toBe(await visitorId("203.0.113.9", "other"));
    expect(a).not.toContain("203");
  });
});

describe("systemPrompt", () => {
  it("embeds the profile and the rules", () => {
    const prompt = systemPrompt("# Sharang Gupta\n## Who");
    expect(prompt).toContain("# Sharang Gupta");
    expect(prompt).toContain("Never share a phone number");
  });
});

describe("the answer cache key", () => {
  it("treats the same question with different casing, punctuation and spacing as one", async () => {
    expect(normaliseQuestion("  What has Sharang FIXED in Spring?! ")).toBe("what has sharang fixed in spring");
    const a = await answerKey("What has Sharang fixed in Spring?", "profile v1");
    expect(a).toBe(await answerKey("what has sharang   fixed in spring", "profile v1"));
    expect(a).toMatch(/^answer:[0-9a-f]{12}:[0-9a-f]{24}$/);
  });

  it("starts afresh when the profile changes or the question differs", async () => {
    const a = await answerKey("What has Sharang fixed in Spring?", "profile v1");
    expect(a).not.toBe(await answerKey("What has Sharang fixed in Spring?", "profile v2"));
    expect(a).not.toBe(await answerKey("Where does Sharang work?", "profile v1"));
  });
});
