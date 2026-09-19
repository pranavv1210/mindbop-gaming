import { test, expect } from "@playwright/test";
test("landing navigation, honest feedback state, and responsive layouts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your friends.",
  );
  await page.getByRole("link", { name: "Explore games", exact: true }).click();
  await expect(page).toHaveURL(/#games$/);
  await expect(
    page.getByRole("button", { name: "Send your idea" }),
  ).toBeDisabled();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `artifacts/landing-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});
test("guest preferences, search, filters, invalid rooms, and accessible dialogs", async ({
  page,
}) => {
  await page.goto("/play");
  await expect(page.getByText("Connected & ready")).toBeVisible();
  await page.getByRole("button", { name: "Edit your profile" }).click();
  await page.getByLabel("Display name").fill("Pranav");
  await page.getByRole("button", { name: "Avatar 3", exact: true }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pranav");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pranav");
  await page.getByLabel("Search games").fill("zzzz");
  await expect(page.getByText("No games found.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "Cooperative murder mystery", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The Last Guest", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await page.getByLabel("Room code", { exact: true }).fill("AAAAAA");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Join room" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Room not found",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 700 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
