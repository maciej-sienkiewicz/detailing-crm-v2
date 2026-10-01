import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1366, h: 1024 });
const J = { type: 'jpeg', quality: 93 };
await page.go('/settings');
await page.getByText('Cennik usług').first().click();
await page.waitForTimeout(1200);
// 1) PPF — potrzebna do rezerwacji, bez zdjęć
await page.getByRole('button', { name: /Dodaj usługę/ }).first().click();
await page.waitForTimeout(800);
await page.getByPlaceholder('np. Mycie detailingowe premium').fill('Oklejanie PPF – pełny przód');
await page.getByPlaceholder('np. 615,00').fill('3500,00');
await page.waitForTimeout(300);
await page.locator('button[type=submit]').filter({ hasText: 'Dodaj usługę' }).click();
await page.waitForTimeout(1500);
await page.shot('svc/list_before', J);
// 2) edycja ceny IGL — klatka po klatce
const row = page.locator('text=Powłoka ceramiczna IGL Eclipse').first();
const box = await row.boundingBox();
console.log('row', box);
await browser.close();
