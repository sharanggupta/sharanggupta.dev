import { describe, expect, it } from "vitest";
import { starsMoved } from "./stars.mjs";

describe("starsMoved", () => {
  it("ignores small drift and notices a real move, either way", () => {
    expect(starsMoved(60_000, 60_900)).toBe(false);
    expect(starsMoved(60_000, 62_000)).toBe(true);
    expect(starsMoved(60_000, 58_000)).toBe(true);
    expect(starsMoved(418, 425)).toBe(false);
    expect(starsMoved(418, 432)).toBe(true);
  });

  it("always writes a count for a project with none", () => {
    expect(starsMoved(undefined, 5)).toBe(true);
    expect(starsMoved(0, 0)).toBe(false);
    expect(starsMoved(0, 1)).toBe(true);
  });
});
