import { expect, test, type BrowserContext } from "@playwright/test";
import { ID } from "../../backend/ids";

const helgiUrl = `/kliendid/${ID.clientHelgi}/abi?as=${ID.helgi}&tone=client`;
const juriUrl = `/taitjad?as=${ID.juri}&tone=helper`;

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

test("viib kutse vastuvõtust lõpetamiseni", async ({ browser }) => {
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
  await expect(helgi.getByText("Kutse on saadetud")).toBeVisible();
  await expect(juri.getByRole("heading", { name: "Helgi Tamm" })).toBeVisible({ timeout: 5000 });

  await juri.getByRole("button", { name: "5 min" }).click();
  await juri.getByRole("button", { name: "Võtan vastu" }).click();
  await expect(helgi.getByText("Jüri Mets")).toBeVisible({ timeout: 5000 });

  await juri.getByRole("button", { name: "Olen kohal" }).click();
  await expect(helgi.getByText("on kohal")).toBeVisible({ timeout: 5000 });

  await juri.getByRole("button", { name: "Lõpeta juhtum" }).click();
  await juri.getByRole("button", { name: "Aitasin üles" }).click();
  await expect(juri.getByRole("heading", { name: "Helgi Tamm" })).toBeHidden({ timeout: 5000 });
  await expect(helgi.getByText("Abi on lõpetatud")).toBeVisible({ timeout: 5000 });

  await helgiContext.close();
  await juriContext.close();
});
