import { test, expect, type Browser, type Page } from "@playwright/test";

async function startMatch(browser: Browser, gameId: string) {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.goto(`/play?game=${gameId}`);
  await expect(host.getByRole("dialog")).toBeVisible();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Create room" })
    .click();
  const code = (await host.getByTestId("room-code").textContent())!.trim();
  await guest.goto(`/play?join=${code}`);
  await guest
    .getByRole("dialog")
    .getByRole("button", { name: "Join room" })
    .click();
  await host.getByRole("button", { name: "Skip tutorial" }).click();
  await guest.getByRole("button", { name: "Skip tutorial" }).click();
  await host.getByRole("button", { name: "I’m ready" }).click();
  await guest.getByRole("button", { name: "I’m ready" }).click();
  await host.getByRole("button", { name: "Start game" }).click();
  return {
    host,
    guest,
    close: async () => {
      await hostContext.close();
      await guestContext.close();
    },
  };
}

async function playWord(page: Page, word: string) {
  await page.getByLabel("Your word").fill(word);
  await page.getByRole("button", { name: "Lock word" }).click();
}

test("Word Chain runs a synchronized multiplayer round", async ({
  browser,
}) => {
  const { host, guest, close } = await startMatch(browser, "word-chain");
  await expect(host.getByRole("heading", { name: "Word Chain" })).toBeVisible();
  await playWord(host, "spark");
  await playWord(guest, "kite");
  await expect(host.getByText("spark", { exact: true })).toBeVisible();
  await expect(host.getByText("kite", { exact: true })).toBeVisible();
  await expect(host.locator(".word-letter strong")).toHaveText("e");
  await close();
});

test("Quiz Rush advances all five shared questions and finishes", async ({
  browser,
}) => {
  const { host, guest, close } = await startMatch(browser, "quiz-rush");
  await expect(host.getByRole("heading", { name: "Quiz Rush" })).toBeVisible();
  for (let round = 0; round < 5; round++) {
    await host.locator(".quiz-options button").first().click();
    await guest.locator(".quiz-options button").nth(1).click();
  }
  await expect(host.locator(".party-result h2")).toBeVisible();
  await expect(host.getByRole("button", { name: "New quiz" })).toBeVisible();
  await close();
});
