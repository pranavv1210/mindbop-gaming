import { test, expect } from "@playwright/test";

test("two players create, join, draw, guess, score, and retain a responsive game surface",async({browser})=>{
 test.setTimeout(60_000);
 const hostContext=await browser.newContext(); const guestContext=await browser.newContext();
 const host=await hostContext.newPage(); const guest=await guestContext.newPage();
 await host.goto("/play"); await expect(host.getByText("Connected & ready")).toBeVisible();
 await host.getByRole("button",{name:"Create room"}).first().click();
 await host.getByRole("dialog").getByRole("button",{name:"Create room"}).click();
 await expect(host).toHaveURL(/\/play\/room\/[A-Z2-9]{6}/,{timeout:20_000});
 const code=(await host.getByTestId("room-code").textContent())!.trim();
 await guest.goto(`/play?join=${code}`); await expect(guest.getByRole("dialog")).toBeVisible();
 await guest.getByRole("dialog").getByRole("button",{name:"Join room"}).click();
 await expect(guest).toHaveURL(new RegExp(`/play/room/${code}`));
 for(const page of [host,guest]){const skip=page.getByRole("button",{name:"Skip tutorial"});if(await skip.isVisible())await skip.click()}
 await guest.getByRole("button",{name:"I’m ready"}).click(); await host.getByRole("button",{name:"I’m ready"}).click();
 await host.getByRole("button",{name:"Start game"}).click();
 await expect(host.getByText("Choose your secret word")).toBeVisible();
 const choice=host.locator(".word-picker button").first(); const word=(await choice.textContent())!.trim(); await choice.click();
 await expect(guest.getByLabel("Guess the word")).toBeEnabled();
 const canvas=host.getByLabel("Shared drawing canvas"); const box=await canvas.boundingBox(); expect(box).toBeTruthy();
 await host.mouse.move(box!.x+30,box!.y+30); await host.mouse.down(); await host.mouse.move(box!.x+130,box!.y+100,{steps:5}); await host.mouse.up();
 await expect.poll(()=>guest.evaluate(()=>document.querySelector("canvas")?.width??0)).toBeGreaterThan(0);
 await guest.getByLabel("Guess the word").fill(word); await guest.getByRole("button",{name:"Send guess"}).click();
 await expect(guest.getByText("guessed it!",{exact:false})).toBeVisible();
 await guest.setViewportSize({width:390,height:844});
 await expect.poll(()=>guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(guest.getByLabel("Shared drawing canvas")).toBeVisible();
 await hostContext.close(); await guestContext.close();
});
