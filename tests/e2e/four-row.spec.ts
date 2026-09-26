import { test, expect } from "@playwright/test";

test("two players complete and rematch a Four in a Row game", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto("/play?game=four-row");
  await expect(host.getByRole("dialog")).toBeVisible();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "Create room" })
    .click();
  await expect(host.getByText("Your private room code")).toBeVisible();
  const code = (await host.getByTestId("room-code").textContent())!.trim();

  await guest.goto(`/play?join=${code}`);
  await expect(guest.getByRole("dialog")).toBeVisible();
  await guest
    .getByRole("dialog")
    .getByRole("button", { name: "Join room" })
    .click();
  await expect(guest.getByText("Your private room code")).toBeVisible();

  await host.getByRole("button", { name: "I’m ready" }).click();
  await guest.getByRole("button", { name: "I’m ready" }).click();
  await host.getByRole("button", { name: "Start game" }).click();
  await expect(
    host.getByRole("grid", { name: "Four in a Row board" }),
  ).toBeVisible();

  for (let turn = 0; turn < 3; turn++) {
    await host.getByRole("button", { name: "Drop disc in column 1" }).click();
    await guest.getByRole("button", { name: "Drop disc in column 2" }).click();
  }
  await host.getByRole("button", { name: "Drop disc in column 1" }).click();
  await expect(host.getByText(/wins!/)).toContainText("Guest");
  await expect(host.locator(".board-slot.winning")).toHaveCount(4);
  await host.getByRole("button", { name: "Play again" }).click();
  await expect(host.getByText("Your private room code")).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
