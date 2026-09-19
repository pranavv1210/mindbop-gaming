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
    .getByRole("button", { name: "Social deduction", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Odd One In" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Brainwave", exact: true }),
  ).toHaveCount(0);
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
test("two browser sessions complete a game, reconnect, view results, and rematch", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
    await host.goto("/play");
    await expect(host.getByText("Connected & ready")).toBeVisible();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await host.getByLabel("Number of rounds").selectOption("3");
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Create room" })
      .click();
    const code = await host.getByTestId("room-code").innerText();
    await expect(
      host.getByRole("button", { name: "Start game" }),
    ).toBeDisabled();
    await guest.goto(`/play?join=${code}`);
    await expect(guest.getByText("Connected & ready")).toBeVisible();
    await guest
      .getByRole("dialog")
      .getByRole("button", { name: "Join room" })
      .click();
    await expect(guest.getByTestId("room-code")).toHaveText(code);
    await expect(host.getByText("2/8 players")).toBeVisible();
    await guest.screenshot({
      path: "artifacts/lobby-mobile.png",
      fullPage: true,
    });
    await host.screenshot({
      path: "artifacts/lobby-desktop.png",
      fullPage: true,
    });
    await guest.reload();
    await expect(guest.getByTestId("room-code")).toHaveText(code);
    await expect(host.getByText("2/8 players")).toBeVisible();
    await host.getByRole("button", { name: "I’m ready" }).click();
    await guest.getByRole("button", { name: "I’m ready" }).click();
    await host.getByRole("button", { name: "Start game" }).click();
    for (let round = 1; round <= 3; round++) {
      await expect(
        host.getByText(`Brainwave · Round ${round} of 3`, { exact: true }),
      ).toBeVisible({ timeout: 12000 });
      await expect(
        guest.getByText(`Brainwave · Round ${round} of 3`, { exact: true }),
      ).toBeVisible({ timeout: 12000 });
      await expect(host.locator(".answers .answer").first()).toBeEnabled();
      await host.locator(".answers .answer").first().click();
      await guest.locator(".answers .answer").nth(1).click();
      await expect(host.locator(".answer-feedback")).toBeVisible();
      await expect(guest.locator(".answer-feedback")).toBeVisible();
      if (round === 1) {
        await guest.screenshot({
          path: "artifacts/gameplay-mobile.png",
          fullPage: true,
        });
        await host.screenshot({
          path: "artifacts/gameplay-desktop.png",
          fullPage: true,
        });
      }
    }
    await expect(
      host.getByRole("button", { name: "One more round" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      guest.getByText("Your host can bring everyone back to the lobby."),
    ).toBeVisible();
    await host.screenshot({
      path: "artifacts/results-desktop.png",
      fullPage: true,
    });
    await host.getByRole("button", { name: "One more round" }).click();
    await expect(
      guest.getByRole("heading", { name: "The crew’s getting together." }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start game" }),
    ).toBeDisabled();
    await hostContext.close();
    await expect(
      guest.getByRole("button", { name: "Start game" }),
    ).toBeVisible();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
