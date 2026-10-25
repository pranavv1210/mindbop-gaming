import { expect, test } from "@playwright/test";

test("Neon Breach is playable and responsive",async({page})=>{
 await page.goto("/play");await page.locator("article.game-card",{hasText:"Neon Breach"}).click();await expect(page).toHaveURL(/\/play\/solo\/neon-breach/);
 await expect(page.getByRole("heading",{name:"Breach the grid."})).toBeVisible();
 await page.getByRole("button",{name:"Initiate breach"}).click();
 const target=page.getByRole("button",{name:"Hit signal"});await expect(target).toBeVisible();
 await target.dispatchEvent("pointerdown");await expect(page.locator(".solo-header").getByText(/\d+/).first()).not.toHaveText("0");
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("Echo Grid advances after a correct sequence",async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto("/play/solo/echo-grid");
 await expect(page.getByRole("button",{name:"Play in full screen"})).toBeVisible();
 const cells=page.locator(".echo-board button");await expect(cells).toHaveCount(16);
 const lastCell=await cells.last().boundingBox();expect((lastCell?.y??9999)+(lastCell?.height??0)).toBeLessThanOrEqual(768);
 await page.getByRole("button",{name:"Enter the grid"}).click();
 const button=page.getByRole("button",{name:"Pulse 5"});await expect(button).toBeEnabled({timeout:3000});await button.click();
 await expect(page.getByText("Level 2",{exact:true})).toBeVisible();
});
