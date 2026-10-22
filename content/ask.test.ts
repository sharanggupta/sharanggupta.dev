import { describe, expect, it } from "vitest";
import { completionFor, SUGGESTED_QUESTIONS } from "./ask";

describe("completionFor", () => {
  it("completes the first suggestion that starts with the typed text, keeping the typed casing", () => {
    expect(completionFor("what has")).toEqual({ full: "what has Sharang fixed in Spring?", rest: " Sharang fixed in Spring?" });
    expect(completionFor("Which")).toEqual({ full: "Which open-source projects has Sharang contributed to?", rest: " open-source projects has Sharang contributed to?" });
  });

  it("offers nothing before two characters, when the typing diverges, or once the question is complete", () => {
    expect(completionFor("w")).toBeUndefined();
    expect(completionFor("Where does")).toBeUndefined();
    expect(completionFor("What does Sharang do at THG?")).toBeUndefined();
  });

  it("offers questions that fit the question limit and end with a question mark", () => {
    for (const suggestion of SUGGESTED_QUESTIONS) {
      expect(suggestion.length).toBeLessThan(120);
      expect(suggestion.endsWith("?")).toBe(true);
    }
  });
});
