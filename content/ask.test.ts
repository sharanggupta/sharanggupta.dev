import { describe, expect, it } from "vitest";
import { matchingSuggestions, SUGGESTED_QUESTIONS, SUGGESTION_LIMIT } from "./ask";

describe("matchingSuggestions", () => {
  it("matches anywhere in a suggestion, case-insensitively, from two characters", () => {
    expect(matchingSuggestions("spring")).toEqual(["What has Sharang fixed in Spring?"]);
    expect(matchingSuggestions("CONTACT")).toEqual(["How can I contact Sharang?"]);
    expect(matchingSuggestions("s")).toEqual([]);
  });

  it("caps the list and leaves out a suggestion already typed in full", () => {
    expect(matchingSuggestions("Sharang").length).toBeLessThanOrEqual(SUGGESTION_LIMIT);
    expect(matchingSuggestions("what does sharang do at thg?")).toEqual([]);
  });

  it("offers questions that fit the question limit and end with a question mark", () => {
    for (const suggestion of SUGGESTED_QUESTIONS) {
      expect(suggestion.length).toBeLessThan(120);
      expect(suggestion.endsWith("?")).toBe(true);
    }
  });
});
