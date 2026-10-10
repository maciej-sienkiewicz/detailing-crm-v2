// Rekonesans: świeże konto demo z dosiewkami i zrzuty widoków, na których stoją sceny.
// node explore.mjs [ścieżka ...]  → shots/explore/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { BASE, openDemo, wait } from './lib.mjs';
import { enableFullPlan, setupInvoicing, markKsefSynced, seedCostData, seedTeam, seedTasks, seedReturningCustomerLead, fixDemoTitles } from './seed.mjs';

const OUT = new URL('./shots/explore/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const demo = await openDemo({ width: 1440, height: 900, dpr: 1 });
const { page, studioId } = demo;
enableFullPlan(studioId);
fixDemoTitles(studioId);
await setupInvoicing(page, BASE);
markKsefSynced(studioId);
await seedCostData(page, BASE, studioId);
await seedTeam(page, BASE, studioId);
await seedTasks(page, BASE);
seedReturningCustomerLead(studioId);
writeFileSync(`${OUT}/studio.txt`, studioId);

const paths = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/', '/statistics', '/finance', '/zapytania', '/campaigns', '/employees', '/worktime', '/leave', '/settings', '/visits', '/calendar',
];
for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});
  await wait(page, 2500);
  const name = p.replace(/\W+/g, '_') || 'root';
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.screenshot({ path: `${OUT}/${name}_full.png`, fullPage: true });
  console.log(p, '→', page.url());
}
await demo.browser.close();
