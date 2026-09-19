import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function position(page: Page) {
  return page.getByTestId("player-position").evaluate((e) => ({
    x: Number(e.getAttribute("data-x")),
    z: Number(e.getAttribute("data-z")),
  }));
}
async function choose(page: Page, label: string, value: string) {
  await page.getByLabel(label).evaluate((element, next) => {
    const select = element as HTMLSelectElement;
    select.value = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
// Drive the same keyboard controls as a player; no state injection or teleport hook.
async function walk(page: Page, x: number, z: number) {
  await page.locator("h1").click();
  for (const axis of ["x", "z"] as const) {
    const target = axis === "x" ? x : z;
    const start = (await position(page))[axis],
      sign = Math.sign(target - start);
    if (Math.abs(target - start) < 0.2) continue;
    const key = axis === "x" ? (sign > 0 ? "d" : "a") : sign > 0 ? "s" : "w";
    await page.keyboard.down(key);
    try {
      await expect
        .poll(async () => sign * ((await position(page))[axis] - target), {
          timeout: 15000,
          intervals: [50],
        })
        .toBeGreaterThanOrEqual(-0.16);
    } finally {
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(150);
  }
}
async function inspect(page: Page, name: string) {
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page
    .locator(".nearby-objects")
    .getByRole("button", { name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect object", exact: true })
    .click();
  await expect(page.locator(".discovered-object")).toBeVisible();
  await expect(page.locator(".error-message[role=alert]")).toHaveCount(0);
}
test.setTimeout(600000);
test("two browser investigators explore all five areas, share findings, reconnect and solve the case", async ({
  browser,
}) => {
  const hc = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const gc = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const host = await hc.newPage(),
    guest = await gc.newPage();
  const errors: string[] = [];
  for (const page of [host, guest])
    page.on("pageerror", (e) => errors.push(e.message));
  try {
    await host.goto("/play");
    await expect(host.getByText("Connected & ready")).toBeVisible();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Create room" })
      .click();
    const code = await host.getByTestId("room-code").innerText();
    await guest.goto("/play?join=" + code);
    await guest
      .getByRole("dialog")
      .getByRole("button", { name: "Join room" })
      .click();
    await expect(host.getByText("2/6 players")).toBeVisible();
    await host.getByRole("button", { name: "I’m ready" }).click();
    await guest.getByRole("button", { name: "I’m ready" }).click();
    await host.getByRole("button", { name: "Start game" }).click();
    for (const page of [host, guest]) {
      await expect(page.getByTestId("scene-status")).toContainText(
        "Scene ready",
        { timeout: 90000 },
      );
      await page.getByLabel("Graphics quality").selectOption("low");
    }
    await host.getByRole("button", { name: "Begin investigation" }).click();
    await expect(guest.locator(".case-phase")).toHaveText("Investigation");
    await host.screenshot({
      path: "artifacts/last-guest-desktop.png",
      fullPage: true,
    });
    await guest.screenshot({
      path: "artifacts/last-guest-mobile.png",
      fullPage: true,
    });
    // Touch controls move the guest through the real server simulation.
    const start = await position(guest);
    const forward = guest.getByRole("button", {
      name: "Move forward",
      exact: true,
    });
    await forward.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      bubbles: true,
    });
    await guest.waitForTimeout(650);
    await forward.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
      bubbles: true,
    });
    await expect
      .poll(async () => (await position(guest)).z)
      .toBeLessThan(start.z - 0.5);
    await guest.getByRole("button", { name: "Team", exact: true }).click();
    await guest
      .getByLabel("Message to your group")
      .fill("I will compare the time records.");
    await guest.getByRole("button", { name: "Share note" }).click();
    await host.getByRole("button", { name: "Team", exact: true }).click();
    await expect(
      host.getByText("I will compare the time records.", { exact: true }),
    ).toBeVisible();
    await walk(host, -4.5, 5.3);
    await walk(host, -6.4, 5.3);
    await inspect(host, "Reception register");
    await walk(host, -9, 5.3);
    await inspect(host, "Inspect the service key");
    await guest.getByRole("button", { name: /^Evidence/ }).click();
    await expect(guest.getByTestId("evidence-key")).toBeVisible();
    const before = await position(guest);
    await guest.reload();
    await expect(guest.getByTestId("scene-status")).toContainText(
      "Scene ready",
      { timeout: 30000 },
    );
    expect(await position(guest)).toEqual(before);
    await guest.getByRole("button", { name: /^Evidence/ }).click();
    await expect(guest.getByTestId("evidence-key")).toBeVisible();
    await walk(host, -9, 6);
    await walk(host, 0, 6);
    await walk(host, 0, -1);
    await walk(host, -6, -1);
    await walk(host, -6, -3.7);
    await inspect(host, "Examine the study");
    await walk(host, -8, -4.3);
    await inspect(host, "Open account ledger");
    await walk(host, -6, -4.3);
    await walk(host, -6, -1);
    await walk(host, 0, -1);
    await walk(host, 0, -7.3);
    await walk(host, 1.5, -7.3);
    await inspect(host, "Hallway clock");
    await walk(host, 0, -7.3);
    await walk(host, 0, -4);
    await walk(host, 5, -4);
    await walk(host, 6.4, -3.5);
    await inspect(host, "Unsent letter");
    await walk(host, 10.4, -3.5);
    await inspect(host, "Laundry receipt");
    await walk(host, 5, -3.5);
    await walk(host, 5, -4);
    await walk(host, 0, -4);
    await walk(host, 0, 5);
    await walk(host, 5, 5);
    await walk(host, 5, 2.4);
    await walk(host, 8, 2.4);
    await inspect(host, "Tray and glass");
    await walk(host, 5, 2.4);
    await walk(host, 5, 7);
    await host
      .locator(".nearby-objects")
      .getByRole("button", { name: "June Ash · guest", exact: true })
      .click();
    await host
      .getByRole("button", { name: /Check her account against the clock/ })
      .click();
    await walk(host, 5, 5);
    await walk(host, 0, 5);
    await walk(host, -1.6, 0.8);
    await inspect(host, "Maintenance panel");
    await walk(host, 1.2, -1.5);
    await host
      .locator(".nearby-objects")
      .getByRole("button", { name: "Eli Ward · electrician", exact: true })
      .click();
    await host
      .getByRole("button", { name: /Compare the clock and breaker times/i })
      .click();
    await walk(host, 0, -1.5);
    await walk(host, 0, 6);
    await walk(host, -4.5, 6);
    await host
      .locator(".nearby-objects")
      .getByRole("button", { name: "Mara Vale · hotel manager", exact: true })
      .click();
    await host.getByRole("button", { name: /missing funds/i }).click();
    await guest.getByRole("button", { name: /^Evidence/ }).click();
    await expect(guest.getByTestId("evidence-breaker")).toBeVisible();
    for (const [a, b] of [
      ["clock", "breaker"],
      ["ledger", "key"],
    ]) {
      await guest.getByLabel("First clue").selectOption(a);
      await guest.getByLabel("Second clue").selectOption(b);
      await guest.getByRole("button", { name: "Connect evidence" }).click();
      await expect(guest.locator(".error-message[role=alert]")).toHaveCount(0);
    }
    await expect(host.locator(".case-phase")).toHaveText("Final deduction");
    await host
      .getByRole("button", { name: "Case", exact: true })
      .click({ force: true });
    await choose(host, "Who killed Adrian?", "mara");
    await choose(host, "How was he killed?", "letter-opener");
    await choose(host, "Why?", "embezzlement");
    for (const id of ["body", "ledger", "key"])
      await host
        .locator('input[type="checkbox"][value="' + id + '"]')
        .evaluate((element) => (element as HTMLInputElement).click());
    await expect(
      host.getByRole("button", { name: "Propose accusation" }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "Propose accusation" })
      .click({ force: true });
    await guest
      .getByRole("button", { name: "Case", exact: true })
      .click({ force: true });
    await expect(guest.getByTestId("case-proposal")).toBeVisible();
    await guest
      .getByRole("button", { name: "Agree and submit case" })
      .click({ force: true });
    for (const page of [host, guest])
      await expect(
        page.getByRole("heading", { name: "The alibi falls apart." }),
      ).toBeVisible();
    await host.screenshot({
      path: "artifacts/last-guest-resolution.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
    const axe = await new AxeBuilder({ page: host })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      axe.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await host
      .getByRole("button", { name: "Return everyone to lobby" })
      .click();
    await expect(
      guest.getByRole("heading", { name: "The crew’s getting together." }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "Start game" }),
    ).toBeDisabled();
  } finally {
    await hc.close();
    await gc.close();
  }
});
