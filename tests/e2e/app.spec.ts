import { test, expect } from "@playwright/test";
test("landing navigation, email feedback, and responsive layouts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Play together.",
  );
  await expect(page.locator("#games .game-card")).toHaveCount(3);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(() =>
      page
        .locator("#games .game-grid")
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(3);
  await page.getByRole("link", { name: "Explore games", exact: true }).click();
  await expect(page).toHaveURL(/#games$/);
  await expect(page.getByRole("link", { name: "Explore all games" })).toHaveAttribute("href", "/play");
  await expect(
    page.getByRole("button", { name: "Send your idea" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: /game night that starts/i }),
  ).toBeVisible();
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

test("developer contribution links and production sitemap are complete", async ({
  page,
  request,
}) => {
  await page.goto("/developers");
  await expect(
    page.getByRole("link", { name: "Submit your game" }),
  ).toHaveAttribute("href", /^mailto:pranavv736@gmail\.com\?subject=/);
  await expect(
    page.getByRole("link", { name: "Contribute to MindBop" }),
  ).toHaveAttribute("href", /^mailto:pranavv736@gmail\.com\?subject=/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  expect(xml).toContain("https://mindbop-gaming.onrender.com/play");
  expect(xml).toContain("/play/solo/neon-breach");
  expect(xml).not.toContain("localhost");
});
test("guest preferences, search, filters, invalid rooms, and accessible dialogs", async ({
  page,
}) => {
  await page.goto("/play");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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
    .getByRole("button", { name: "Creative party", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "MindBop Draw", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Select a game" }),
  ).toBeVisible();
  const selectedBefore = await page
    .locator(".game-picker-carousel > button.selected strong")
    .textContent();
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.getByRole("button", { name: "Surprise me" })).toBeEnabled();
  await expect(
    page.locator(".game-picker-carousel > button.selected strong"),
  ).not.toHaveText(selectedBefore ?? "");
  await page.keyboard.press("Escape");
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
  const searchBox = await page.locator(".search-field").boundingBox();
  const sortBox = await page.locator(".sort-shell").boundingBox();
  expect(searchBox?.height).toBeLessThanOrEqual(56);
  expect(sortBox?.height).toBeLessThanOrEqual(52);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("every game card route and multiplayer action is reachable", async ({
  page,
}) => {
  await page.goto("/play");
  const expectedRoutes = [
    "/play/game/mindbop-draw",
    "/play/solo/neon-breach",
    "/play/solo/echo-grid",
    "/play/game/mafia",
    "/play/game/two-truths",
    "/play/game/sky-scramble",
    "/play/game/comedy-chaos",
  ];
  const cards = page.locator(".catalog-grid .game-card");
  await expect(cards).toHaveCount(expectedRoutes.length);
  for (let index = 0; index < expectedRoutes.length; index += 1) {
    await cards.nth(index).click();
    await expect(page).toHaveURL(new RegExp(`${expectedRoutes[index]}$`));
    await page.goBack();
    await expect(cards).toHaveCount(expectedRoutes.length);
  }
  await page.goto("/play/game/mafia");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page).toHaveURL(/\/play\/room\/[A-Z2-9]{6}/, {
    timeout: 20_000,
  });
  await expect(page.getByRole("group", { name: "Select a game" })).toHaveCount(0);
  const skipTutorial = page.getByRole("button", { name: "Skip tutorial" });
  if (await skipTutorial.isVisible()) await skipTutorial.click();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  expect(await page.locator(".room-panel").evaluate((panel) => panel.scrollHeight <= panel.clientHeight + 1)).toBe(true);
});
