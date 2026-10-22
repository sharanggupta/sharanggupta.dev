import { describe, expect, it } from "vitest";
import { initials, longDate } from "./format";

describe("initials", () => {
  it("takes the first letter of each word", () => {
    expect(initials("Charlotte Cozens")).toBe("CC");
  });

  it("treats any run of whitespace as one separator", () => {
    expect(initials("Steve   Moss")).toBe("SM");
  });

  it("ignores leading and trailing whitespace", () => {
    expect(initials("  Ahmad Aussaili ")).toBe("AA");
  });
});

describe("longDate", () => {
  it("writes an ISO date the British way", () => {
    expect(longDate("2026-10-22")).toBe("22 October 2026");
  });
});
