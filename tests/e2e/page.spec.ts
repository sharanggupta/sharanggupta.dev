import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("the page", () => {
  test("has one h1 and every section the menu links to", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText("Sharang Gupta");

    const menuTargets = await page.locator("#site-menu a[href^='/#']").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")!.slice(2)),
    );
    expect(menuTargets.length).toBeGreaterThanOrEqual(6);
    await Promise.all(menuTargets.map((id) => expect(page.locator(`#${id}`)).toHaveCount(1)));
  });

  test("shows all its content without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const headings = ["Selected work", "Where I have worked", "What colleagues say", "Get in touch"];
    await Promise.all(headings.map((name) => expect(page.getByRole("heading", { name })).toBeVisible()));
    await context.close();
  });

  test("shows revealed content straight away when motion is reduced", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const lastEntry = page.getByRole("heading", { name: /Software Engineer Intern/ });
    await expect(lastEntry).toBeVisible();
    const revealed = lastEntry.locator("xpath=ancestor::*[@data-reveal][1]");
    await expect(revealed).toHaveCSS("opacity", "1");
    await context.close();
  });
});

test.describe("the open-source page", () => {
  test("lists every contribution with a link to its pull request, grouped, and has one h1", async ({ page }) => {
    await page.goto("/open-source");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Bugs fixed" })).toBeVisible();
    const entries = page.locator("article h3 a[href*='/pull/']");
    expect(await entries.count()).toBeGreaterThanOrEqual(30);
    await expect(page.getByRole("link", { name: "Fix buffer leak in ProtobufDecoder on cancel" })).toBeVisible();
  });

  test("is reached from the home page and its menu leads back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^All \d+ contributions/ }).click();
    await expect(page).toHaveURL(/\/open-source$/);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Experience" }).click();
    await expect(page).toHaveURL(/\/#experience$/);
  });

  test("has no axe violations", async ({ browser }) => {
    // Reduced motion, as for the home page: axe must not scan mid-way through the header's fade-in.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/open-source");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0].target}`)).toEqual([]);
    await context.close();
  });
});

test.describe("old addresses", () => {
  const redirects = [
    ["/resume_latest.pdf", "/cv.pdf"],
    ["/resume", "/#experience"],
    ["/projects", "/#work"],
  ];
  for (const [from, to] of redirects) {
    test(`${from} goes to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers()["location"]).toBe(to);
    });
  }
});

test.describe("the menu", () => {
  test("opens, takes you to a section and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Experience" }).click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.locator("#site-menu")).toBeHidden();
  });

  test("closes with Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#site-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#site-menu")).toBeHidden();
  });

  test("offers the CV as a download", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download CV", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("Sharang-Gupta-CV.pdf");
  });
});

test.describe("the theme", () => {
  test("a saved choice wins over the system setting before the page paints", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    await context.addInitScript(() => localStorage.setItem("theme", "dark"));
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForFunction(() => document.documentElement.dataset.theme !== undefined);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await context.close();
  });

  test("the toggle switches and remembers", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("accessibility", () => {
  for (const [name, viewport] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 844 }]] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`no axe violations on ${name} in ${colorScheme} mode`, async ({ browser }) => {
        const context = await browser.newContext({ viewport, colorScheme, reducedMotion: "reduce" });
        const page = await context.newPage();
        await page.goto("/");
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes[0].target}`)).toEqual([]);
        await context.close();
      });
    }
  }
});
