import { expect, test, type Page } from "@playwright/test";

async function skip(page: Page) {
  const button = page.getByRole("button", { name: "Skip tutorial" });
  await button.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
  if (await button.isVisible()) await button.click();
}

test("two browsers enter the synchronized Arena match", async ({ browser }) => {
  test.setTimeout(70_000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
    await host.goto("/play?game=mindbop-arena");
    await expect(host.getByText("Connected & ready")).toBeVisible();
    const create = host.getByRole("dialog");
    await create.getByRole("button", { name: /MindBop Arena/i }).click();
    await create.getByRole("button", { name: "Create room" }).click();
    const code = (await host.getByTestId("room-code").textContent())!.trim();
    await guest.goto(`/play?join=${code}`);
    await guest.getByRole("dialog").getByRole("button", { name: "Join room" }).click();
    await skip(host); await skip(guest);
    await host.getByRole("button", { name: "I’m ready" }).click();
    await guest.getByRole("button", { name: "I’m ready" }).click();
    await host.getByRole("button", { name: "Start game" }).click();
    for (const page of [host, guest]) {
      await expect(page.getByLabel("MindBop Arena first-person combat map")).toBeVisible();
      await expect(page.getByText(/CAPTURE ZONE/)).toBeVisible();
      await expect(page.getByText("server authoritative")).toBeVisible();
      await expect(page.getByRole("button", { name: /Enter the arena/ })).toBeEnabled({ timeout: 20_000 });
      await expect(page.getByText(/Pulse/)).toBeVisible();
      await expect(page.getByText(/Striker/)).toBeVisible();
    }
  } finally {
    await Promise.allSettled([host.close(), guest.close()]);
  }
});
