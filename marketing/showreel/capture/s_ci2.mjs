import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1366, h: 1024 });
await page.go('/reservations/b37256db-fdb4-4b00-a285-983094dc2e22/checkin'); await page.getByText('Dalej').first().waitFor(); await page.waitForTimeout(800);
await page.getByPlaceholder('np. 45230').fill('12450');
for (const t of ['Kluczyki', 'Dowód rejestracyjny']) { await page.getByText(t, { exact: true }).first().click().catch(e => console.log('x', t)); }
await page.getByRole('button', { name: /Dalej/ }).click(); await page.waitForTimeout(1500);
await page.shot('ci_2');
console.log(await page.evaluate(() => document.querySelector('main')?.innerText.slice(0, 1500) || document.body.innerText.slice(-1500)));
console.log((await page.evaluate(() => [...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0 && b.getBoundingClientRect().x>400).map(b=>b.innerText.trim()).filter(Boolean))).join(' | '));
const fin = page.getByRole('button', { name: /Zakończ|Utwórz|Rozpocznij|Potwierdź|Przyjmij/ }).last();
console.log('fin', await fin.innerText().catch(()=>'-'));
await fin.click(); await page.waitForTimeout(2000);
await page.shot('ci_3');
console.log(await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d=>d.innerText.slice(0,1500)).join('\n----\n')));
await page.getByRole('button', { name: 'Zatwierdź i rozpocznij wizytę' }).click(); await page.waitForTimeout(3000);
console.log('URL', page.url());
await browser.close();
