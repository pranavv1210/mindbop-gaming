import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("landing, hub, and room forms meet automated accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/play"]) {
    await page.goto(route);
    if (route === "/play")
      await expect(page.getByText("Connected & ready")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          failure: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
test("API rejects foreign origins and truthfully reports unavailable feedback", async ({
  request,
}) => {
  const rejected = await request.post("/api/session", {
    headers: { Origin: "https://untrusted.example" },
  });
  expect(rejected.status()).toBe(403);
  const status = await request.get("/api/feedback");
  expect(await status.json()).toEqual({ available: false });
  const feedback = await request.post("/api/feedback", {
    headers: { Origin: "http://localhost:3000" },
    data: { message: "A test message" },
  });
  expect(feedback.status()).toBe(503);
  const accepted = await request.post("/api/session", {
    headers: { Origin: "http://localhost:3000" },
  });
  expect(accepted.status()).toBe(200);
  expect(accepted.headers()["set-cookie"]).toContain("HttpOnly");
});
