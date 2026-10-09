import { expect, test, type BrowserContext } from "@playwright/test";
import { ID } from "../../backend/ids";

const helgiUrl = `/kliendid/${ID.clientHelgi}/abi?as=${ID.helgi}&tone=client`;
const juriUrl = `/taitjad?as=${ID.juri}&tone=helper`;
const mariUrl = `/taitjad?as=${ID.mari}&tone=helper`;

async function quiet(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem("uppis_voice_enabled", "0");
  });
}

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/admin/reset", {
    headers: { "x-uppis-user": ID.anna },
  });
  expect(response.ok()).toBeTruthy();
});

test("eemaldab tühistatud kutse täitja järjekorrast", async ({ browser }) => {
  const helgiContext = await browser.newContext();
  const juriContext = await browser.newContext();
  await quiet(helgiContext);
  await quiet(juriContext);
  const helgi = await helgiContext.newPage();
  const juri = await juriContext.newPage();

  await helgi.goto(helgiUrl);
  await juri.goto(juriUrl);
  await expect(helgi.getByRole("button", { name: "Kutsu abistaja" })).toBeVisible({ timeout: 20000 });
  await expect(juri.getByText("Laen abipalveid")).toBeHidden({ timeout: 20000 });
  await helgi.getByRole("button", { name: "Kutsu abistaja" }).click();
  const card = juri.getByRole("heading", { name: "Helgi Tamm" });
  await expect(card).toBeVisible({ timeout: 5000 });

  await helgi.getByRole("button", { name: "Sain ise hakkama – tühista kutse" }).click();
  await helgi.getByRole("button", { name: "Kinnita tühistamine" }).click();
  await expect(card).toBeHidden({ timeout: 5000 });

  await helgiContext.close();
  await juriContext.close();
});

test("näitab teisele täitjale, et Jüri on teel", async ({ browser }) => {
  const juriContext = await browser.newContext();
  const mariContext = await browser.newContext();
  await quiet(juriContext);
  await quiet(mariContext);
  const helgiContext = await browser.newContext();
  await quiet(helgiContext);
  const helgi = await helgiContext.newPage();
  const juri = await juriContext.newPage();
  const mari = await mariContext.newPage();

  await helgi.goto(helgiUrl);
  await juri.goto(juriUrl);
  await mari.goto(mariUrl);
  await expect(helgi.getByRole("button", { name: "Kutsu abistaja" })).toBeVisible({ timeout: 20000 });
  await expect(juri.getByText("Laen abipalveid")).toBeHidden({ timeout: 20000 });
  await expect(mari.getByText("Laen abipalveid")).toBeHidden({ timeout: 20000 });
  await helgi.getByRole("button", { name: "Kutsu abistaja" }).click();
  await expect(juri.getByRole("heading", { name: "Helgi Tamm" })).toBeVisible({ timeout: 5000 });

  await juri.getByRole("button", { name: "5 min" }).click();
  await juri.getByRole("button", { name: "Võtan vastu" }).click();
  await expect(mari.getByText("Jüri Mets on teel")).toBeVisible({ timeout: 5000 });
  await expect(mari.getByRole("button", { name: "Võtan vastu" })).toHaveCount(0);

  await helgiContext.close();
  await juriContext.close();
  await mariContext.close();
});

test("näitab avalehel kolme telefoni ja kitsal ekraanil sakke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(page.locator("iframe")).toHaveCount(3);
  await expect(page.getByRole("navigation", { name: "Vaated" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Täitja" })).toBeVisible();
});
