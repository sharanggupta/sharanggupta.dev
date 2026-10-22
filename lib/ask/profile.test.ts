import { describe, expect, it } from "vitest";
import { buildContributions } from "@/content/open-source";
import snapshot from "@/content/open-source.snapshot.json";
import { PERSON } from "@/content/person";
import { buildProfile } from "./profile";

describe("buildProfile", () => {
  const profile = buildProfile(buildContributions(snapshot));

  it("covers every part of the site", () => {
    for (const heading of ["## Who", "## Experience", "## Education and skills", "## Personal projects", "## Writing", "## Open-source contributions", "## What colleagues say"]) {
      expect(profile).toContain(heading);
    }
    expect(profile).toContain("THG");
    expect(profile).toContain("Fix buffer leak in ProtobufDecoder on cancel");
    expect(profile).toContain("Charlotte Cozens");
  });

  it("gives the email but never the phone number", () => {
    expect(profile).toContain(PERSON.email);
    expect(profile).not.toContain(PERSON.phoneDisplay);
    expect(profile).not.toContain("7563");
  });

  it("stays small enough to send with every question", () => {
    expect(profile.length).toBeLessThan(20_000);
  });
});
