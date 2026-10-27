'use strict';
// Isolated rendering of the real form/CSS. No account, mission, network, or live browser session.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {webkit} = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const attentionRenderers = source.slice(source.indexOf('function renderToldAttentionIssues('), source.indexOf('function installF50PilotReviewPanel('));
const widths = [320, 375, 390, 393, 430, 600, 700, 701, 744, 768, 810, 820, 834, 850, 851, 1000, 1024, 1100, 1180, 1194, 1366, 1440];

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
            for (const id of ['homeView', 'newtripView', 'opsView', 'f900bmissionView', 'toldView', 'f900bView', 'archiveView']) {
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
        await page.evaluate(() => {
          for (const id of ['homeView', 'newtripView', 'opsView', 'f900bmissionView', 'toldView', 'f900bView', 'archiveView']) {
            const el = document.getElementById(id); if (el) el.style.display = id === 'archiveView' ? 'block' : 'none';
          }
          window.refreshTapCount = 0;
          window.refreshFlightPlans = () => { window.refreshTapCount++; };
        });
        const refresh = page.locator('#refreshFlightPlansBtn');
        const size = await refresh.evaluate(el => {
          const r = el.getBoundingClientRect(), style = getComputedStyle(el);
          return {width:r.width,height:r.height,left:r.left,right:r.right,whiteSpace:style.whiteSpace,overflow:el.scrollWidth-el.clientWidth};
        });
        assert(size.width >= 108 && size.height >= 44 && size.height <= 64, `${locale} ${width}px: Refresh wrapping or touch size`);
        assert(size.left >= 0 && size.right <= width && size.overflow <= 1, `${locale} ${width}px: Refresh exceeds its available space`);
        assert.equal(size.whiteSpace, 'nowrap');
        await refresh.tap();
        assert.equal(await page.evaluate(() => window.refreshTapCount), 1);
        cases++;
        if ([375, 768, 1440].includes(width)) {
          for (const view of ['toldView', 'f900bView']) {
            const result = await page.evaluate(({view, attentionRenderers}) => {
              for (const id of ['homeView', 'newtripView', 'opsView', 'f900bmissionView', 'toldView', 'f900bView', 'archiveView']) {
                const el = document.getElementById(id); if (el) el.style.display = id === view ? 'block' : 'none';
              }
              window.$ = id => document.getElementById(id);
              window.textOf = id => window.$(id)?.textContent || '';
              window.missionAttentionNavigate = target => { window.lastAttentionTarget = target; };
              window.eval(attentionRenderers);
              document.querySelectorAll('#attentionTestButton').forEach(el => el.removeAttribute('id'));
              const isF9 = view === 'f900bView';
              const box = document.getElementById(isF9 ? 'f9ToldOverall' : 'toldOverall');
              const gates = ['f9GateWB','f9GateFOB','f9GateWx','f9GateNotam','f9GateRunwayPerf','f9GateReturn','f9GateLocalData'];
              const style = el => {const c = getComputedStyle(el); return {background:c.backgroundColor, color:c.color, border:c.borderLeftColor, text:el.textContent};};
              if (isF9) {
                gates.forEach(id => {document.getElementById(id).textContent = 'PASS';});
                document.getElementById('f9GateNotam').textContent = 'CHECK';
                renderF9ToldAttentionIssues();
              } else renderToldAttentionIssues([{label:'NOTAM VERIFICATION REQUIRED',target:'missionDestinationRunwayReview'}]);
              const button = box.querySelector('button');
              button.id = 'attentionTestButton';
              const warn = style(button);
              const rect = button.getBoundingClientRect();
              let stop;
              if (!isF9) {
                renderToldAttentionIssues([{label:'PILOT OBSTACLE CONFLICT RECORDED',severity:'bad',target:'missionPilotReviewPanel'}]);
                stop = style(box.querySelector('button'));
                renderToldAttentionIssues([]);
              } else {gates.forEach(id => {document.getElementById(id).textContent = 'PASS';});renderF9ToldAttentionIssues();}
              const clear = style(box);
              if (isF9) {document.getElementById('f9GateNotam').textContent = 'CHECK';renderF9ToldAttentionIssues();}
              else renderToldAttentionIssues([{label:'NOTAM VERIFICATION REQUIRED',target:'missionDestinationRunwayReview'}]);
              box.querySelector('button').id = 'attentionTestButton';
              return {warn,stop,clear,height:rect.height,width:rect.width,buttonCount:box.querySelectorAll('button').length};
            }, {view, attentionRenderers});
            const label = `${locale} ${width}px ${view} attention`;
            assert.equal(result.warn.background, 'rgb(122, 82, 0)', label + ': warning must remain amber after shared theme');
            assert.equal(result.warn.color, 'rgb(255, 242, 191)', label + ': warning contrast');
            assert(result.warn.text.startsWith('⚠ '), label + ': non-color warning cue');
            assert(result.height >= 44 && result.width > 0, label + ': touch target');
            if (result.stop) {
              assert.equal(result.stop.background, 'rgb(119, 31, 41)', label + ': explicit conflict red');
              assert(result.stop.text.startsWith('STOP — '), label + ': non-color stop cue');
            }
            assert.equal(result.clear.background, 'rgb(18, 59, 42)', label + ': cleared summary green');
            assert(result.clear.text.includes('SUMMARY CURRENT'), label + ': clear text');
            await page.locator('#attentionTestButton').tap();
            assert.equal(await page.evaluate(() => window.lastAttentionTarget), view === 'f900bView' ? 'f9CanonicalPerformanceCard' : 'missionDestinationRunwayReview', label + ': review navigation');
            cases++;
          }
        }
      }
      await context.close();
    }
    console.log(`PASS WebKit tablet/mobile form layout: ${cases} cases, ${widths.length} widths, 2 locales, New Trip, both aircraft Mission forms Flight Plans Refresh and TOLD attention severity.`);
    console.log('Emulated WebKit coverage; physical iPad Safari/PWA acceptance remains separate.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
