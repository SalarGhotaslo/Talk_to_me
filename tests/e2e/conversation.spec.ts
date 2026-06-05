import { expect, test } from "@playwright/test";

test.describe("Conversation flow", () => {
  test("page loads and shows the language selector and mic button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByLabel("Language")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible();
  });

  test("language can be changed", async ({ page }) => {
    await page.goto("/");
    const select = page.getByLabel("Language");
    await select.selectOption("sv");
    await expect(select).toHaveValue("sv");
  });

  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    const body = await response.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  test("shows unsupported browser message when Speech API unavailable", async ({
    page,
    context,
  }) => {
    // Grant permissions to suppress browser dialogs but override SpeechRecognition
    await context.addInitScript(() => {
      Object.defineProperty(window, "SpeechRecognition", { value: undefined, writable: true });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        value: undefined,
        writable: true,
      });
    });

    await page.goto("/");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/Browser Not Supported/i)).toBeVisible();
  });
});
