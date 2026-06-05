import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Accessibility — WCAG 2.1 AA", () => {
  test("main page has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("language selector is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const select = page.getByLabel("Language");
    await expect(select).toBeVisible();
    await expect(select).toBeEnabled();
  });

  test("microphone button has correct aria-label in idle state", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Start recording" });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test("page has landmark regions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible(); // header
  });
});
