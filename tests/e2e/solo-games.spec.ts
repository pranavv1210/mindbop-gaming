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

test("Echo Grid advances after the randomized sequence is reproduced",async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await page.goto("/play/solo/echo-grid");
 await expect(page.getByRole("button",{name:"Play in full screen"})).toBeVisible();
 const cells=page.locator(".echo-board button");
 await expect(cells).toHaveCount(16);
 const board=page.locator(".echo-board");
 const box=await board.boundingBox();
 expect(box?.width??0).toBeGreaterThan(500);
 expect(box?.height??0).toBeGreaterThan(500);
 await page.getByRole("button",{name:"Enter the grid"}).click();

 // Capture the first randomly selected pulse while the sequence is being shown.
 const active=page.locator(".echo-board button.active");
 await expect(active).toHaveCount(1,{timeout:3000});
 const label=await active.getAttribute("aria-label");
 expect(label).toMatch(/^Pulse [1-9]|Pulse 1[0-6]$/);
 await expect(page.getByRole("button",{name:label!})).toBeEnabled({timeout:3000});
 await page.getByRole("button",{name:label!}).click();
 await expect(page.getByText("Level 2",{exact:true})).toBeVisible({timeout:3000});

 // The game should accept a new start and produce another sequence without
 // leaking the previous round's input state.
 await page.getByRole("button",{name:"Reconnect"}).click();
 await expect(page.locator(".echo-board button.active")).toHaveCount(1,{timeout:3000});
 await expect(page.getByText("Level 1",{exact:true})).toBeVisible();
});

test("Echo Grid fits a phone viewport",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/play/solo/echo-grid");
 await expect(page.getByRole("button",{name:"Enter the grid"})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator(".echo-board")).toBeVisible();
});
