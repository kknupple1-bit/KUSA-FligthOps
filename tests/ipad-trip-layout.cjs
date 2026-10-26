'use strict';
// Isolated rendering of the real form/CSS. No account, mission, network, or live browser session.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {webkit} = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const widths = [320, 390, 600, 700, 701, 744, 768, 810, 820, 834, 850, 851, 1000, 1024, 1100, 1180, 1194, 1366, 1440];

(async () => {
  const browser = await webkit.launch({headless: true});
  let cases = 0;
  try {
    for (const locale of ['en-US', 'de-DE']) {
      const context = await browser.newContext({viewport: {width: 768, height: 1024}, isMobile: true, hasTouch: true, locale});
      await context.route('**/*', route => route.abort());
      const page = await context.newPage();
      await page.setContent(html);
      for (const width of widths) {
        await page.setViewportSize({width, height: width < 1000 ? 1024 : 820});
        for (const view of [
          {id: 'newtripView', date: 'homeTripDate', alternate: 'homeAlt'},
          {id: 'opsView', date: 'activeTripDate', alternate: 'alt'},
          {id: 'f900bmissionView', date: 'f9mTripDate', alternate: 'f9mAlt'}
        ]) {
          await page.evaluate(({view}) => {
            for (const id of ['homeView', 'newtripView', 'opsView', 'f900bmissionView', 'toldView', 'f900bView']) {
              const el = document.getElementById(id); if (el) el.style.display = id === view.id ? 'block' : 'none';
            }
            document.getElementById(view.date).value = '2026-10-26';
          }, {view});
          await page.locator('#' + view.alternate).fill('KIAH');
          const geometry = await page.evaluate(({view}) => {
            const date = document.getElementById(view.date), alternate = document.getElementById(view.alternate);
            const rect = el => {const r = el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const d = rect(date), a = rect(alternate), parent = rect(date.parentElement);
            const sameRow = d.top < a.bottom && a.top < d.bottom;
            const hitDate = document.elementFromPoint(d.left + d.width / 2, d.top + d.height / 2);
            return {date:d, alternate:a, parent, sameRow, dateHit:hitDate?.id,
              appearance:getComputedStyle(date).webkitAppearance,
              pageWidth:document.documentElement.clientWidth};
          }, {view});
          const label = `${locale} ${width}px ${view.id}`;
          assert(geometry.date.width > 0 && geometry.date.height >= 44, `${label}: date is visible and touch sized`);
          assert(geometry.date.left >= geometry.parent.left - 1 && geometry.date.right <= geometry.parent.right + 1,
            `${label}: date exceeds its field`);
          assert(geometry.date.right <= width + 1, `${label}: date exceeds viewport`);
          assert(!geometry.sameRow || geometry.date.right <= geometry.alternate.left - 8 || geometry.alternate.right <= geometry.date.left - 8,
            `${label}: date/alternate overlap`);
          assert.equal(geometry.appearance, 'none', `${label}: native intrinsic sizing is active`);
          // Bring the fields into view, then verify that each remains independently tappable.
          await page.locator('#' + view.date).scrollIntoViewIfNeeded();
          await page.locator('#' + view.date).tap();
          await page.keyboard.press('Escape');
          await page.locator('#' + view.alternate).tap();
          assert.equal(await page.locator('#' + view.alternate).inputValue(), 'KIAH', `${label}: alternate changed`);
          assert.equal(await page.locator('#' + view.date).inputValue(), '2026-10-26', `${label}: date changed`);
          cases++;
        }
      }
      await context.close();
    }
    console.log(`PASS WebKit tablet/mobile form layout: ${cases} cases, ${widths.length} widths, 2 locales, New Trip and both aircraft Mission forms.`);
    console.log('Emulated WebKit coverage; physical iPad Safari/PWA acceptance remains separate.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
