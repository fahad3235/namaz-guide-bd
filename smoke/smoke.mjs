// Namaz Guide BD headless-Chrome smoke test (raw CDP, headless_shell).
// Run: node smoke/smoke.mjs
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(DIR, '..', 'index.html');
const CHROME = process.env.HEADLESS_SHELL ||
  (process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9232;
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'ngbd-smoke-'));

const results = [];
function check(name, cond, extra) {
  results.push([name, !!cond]);
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (extra !== undefined ? ' :: ' + extra : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await fn()) return true; } catch (e) { /* retry */ }
    await sleep(200);
  }
  throw new Error('timeout waiting for: ' + label);
}

async function main() {
  const child = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT, '--remote-debugging-address=127.0.0.1',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version = null;
    await waitFor(async () => {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (!res.ok) return false;
      version = await res.json();
      return true;
    }, 20000, 'debugger port');
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    const exceptions = [];
    const onMsg = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    ws.onmessage = onMsg;
    const send = (method, params) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const target = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?about:blank', { method: 'PUT' })).json();
    const tws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { tws.onopen = res; tws.onerror = rej; });
    const tpending = new Map();
    let tid = 0;
    tws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && tpending.has(msg.id)) {
        const { res, rej } = tpending.get(msg.id);
        tpending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails.exception?.description || 'exception');
      }
    };
    const tsend = (method, params) => new Promise((res, rej) => {
      const mid = ++tid;
      tpending.set(mid, { res, rej });
      tws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const teval = async (expr) => {
      const r = await tsend('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
      return r.result.value;
    };
    await tsend('Runtime.enable');
    await tsend('Page.enable');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 9, 10000, 'wudu steps render');

    // 1. Static render \u2014 wudu tab default.
    check('app title is Namaz Guide BD', await teval('document.querySelector("h1").textContent') === 'Namaz Guide BD');
    check('5 tabs render', (await teval('document.querySelectorAll(".tab").length')) === 5);
    check('9 wudu steps render', (await teval('document.querySelectorAll(".steps .card").length')) === 9);
    check('4 fard tags shown', (await teval('document.querySelectorAll(".tag.fard").length')) === 4);
    check('5 wudu breakers listed', (await teval('document.querySelectorAll(".breakers li").length')) === 5);
    check('footer disclaimer mentions not a fatwa', await teval('document.querySelector(".foot").textContent.includes("not a fatwa")'));

    // 2. Mark-as-learned toggles + persists.
    await teval('document.querySelectorAll("[data-learn]")[0].click()');
    await sleep(200);
    check('first wudu step marked learned', await teval('document.querySelectorAll(".steps .card.done").length') === 1);
    check('learned state saved to localStorage', await teval('JSON.parse(localStorage.getItem("namaz-guide-bd-v1")).learned["wudu-niyyah"] === true'));
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 9, 10000, 'reload');
    check('learned mark persists after reload', await teval('document.querySelectorAll(".steps .card.done").length') === 1);

    // 3. Rakats tab: 5 cards, totals 4/12/8/7/17, fard total 17.
    await teval('document.querySelector("[data-tab=rakats]").click()');
    await sleep(200);
    check('5 rakat cards render', (await teval('document.querySelectorAll(".rakat-card").length')) === 5);
    check('rakat totals are 4, 12, 8, 7, 17', await teval('[...document.querySelectorAll(".rakat-total b")].map(e => e.textContent).join(",")') === '4,12,8,7,17');
    check('fard total line shows 17', await teval('document.querySelector(".fard-total").textContent.includes("17")'));
    check('isha card shows Witr 3', await teval('[...document.querySelectorAll(".rakat-card")].some(c => c.textContent.includes("Isha") && c.textContent.includes("Witr"))'));

    // 4. Salah tab: 13 steps, Arabic + transliteration + meaning present.
    await teval('document.querySelector("[data-tab=salah]").click()');
    await sleep(200);
    check('13 salah steps render', (await teval('document.querySelectorAll(".steps .card").length')) === 13);
    check('arabic blocks render (12 recitations)', (await teval('document.querySelectorAll(".arabic").length')) === 12);
    check('fatiha arabic contains Alhamdu phrase', await teval('document.querySelectorAll(".arabic")[3].textContent.includes("\u0627\u0644\u062d\u0645\u062f \u0644\u0644\u0647 \u0631\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064a\u0646")'));
    check('tashahhud step present', await teval('document.getElementById("main").textContent.includes("Tashahhud")'));
    check('salam is last step', await teval('document.querySelectorAll(".steps .card .step-title")[12].textContent.includes("Salam")'));

    // 5. Mistakes tab: 8 items.
    await teval('document.querySelector("[data-tab=mistakes]").click()');
    await sleep(200);
    check('8 mistakes render', (await teval('document.querySelectorAll(".steps .card").length')) === 8);

    // 6. Quiz: start, answer Q1 correctly (option index 1 = "5"), wrong on Q2, finish 9/10.
    await teval('document.querySelector("[data-tab=quiz]").click()');
    await sleep(200);
    check('quiz start button shown', await teval('!!document.getElementById("quiz-start")'));
    await teval('document.getElementById("quiz-start").click()');
    await sleep(200);
    check('quiz Q1 shown', await teval('document.querySelector(".q-text").textContent.includes("fard")'));
    await teval('document.querySelectorAll(".opt")[1].click()'); // "5" correct
    await sleep(200);
    check('correct feedback shown for Q1', await teval('document.querySelector(".feedback").textContent.includes("Correct")'));
    await teval('document.getElementById("quiz-next").click()');
    await sleep(200);
    await teval('document.querySelectorAll(".opt")[0].click()'); // Q2 wrong ("4")
    await sleep(200);
    check('wrong feedback shows correct answer for Q2', await teval('document.querySelector(".feedback").textContent.includes("2")'));
    // answer remaining 8 correctly
    for (let q = 2; q < 10; q++) {
      await teval('document.getElementById("quiz-next").click()');
      await sleep(150);
      await teval('document.querySelectorAll(".opt")[window.NAMAZ_DATA.quiz[' + q + '].answer].click()');
      await sleep(150);
    }
    await teval('document.getElementById("quiz-next").click()');
    await sleep(300);
    check('quiz result shows 9 / 10', await teval('document.querySelector(".score").textContent.includes("9 / 10")'));
    check('best score 9 saved', await teval('JSON.parse(localStorage.getItem("namaz-guide-bd-v1")).best === 9'));
    check('review list has 10 items', (await teval('document.querySelectorAll(".review li").length')) === 10);

    // 7. Language toggle to Bangla + persistence.
    await teval('document.getElementById("lang-toggle").click()');
    await sleep(300);
    check('title switches to Bengali', await teval('document.querySelector("h1").textContent') === '\u09a8\u09be\u09ae\u09be\u099c \u0997\u09be\u0987\u09a1 \u09ac\u09bf\u09a1\u09bf');
    check('wudu tab shows Bengali title after switch', await teval('document.querySelector("[data-tab=wudu]").click(), document.getElementById("main").textContent.includes("\u0985\u099c\u09c1 \u0995\u09b0\u09be\u09b0 \u09a8\u09bf\u09af\u09bc\u09ae")'));
    await sleep(200);
    check('wudu step 1 shows Bengali digit \u09e7', await teval('document.querySelector(".steps .step-no").textContent') === '\u09e7');
    await tsend('Page.navigate', { url: PAGE });
    await waitFor(async () => (await teval('document.querySelectorAll(".steps .card").length')) === 9, 10000, 'reload BN');
    check('Bangla still active after reload', await teval('document.querySelector("h1").textContent') === '\u09a8\u09be\u09ae\u09be\u099c \u0997\u09be\u0987\u09a1 \u09ac\u09bf\u09a1\u09bf');
    await teval('document.getElementById("lang-toggle").click()');
    await sleep(300);
    check('toggle back to English', await teval('document.querySelector("h1").textContent') === 'Namaz Guide BD');

    // 8. Mobile 390px: no horizontal overflow.
    await tsend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    check('no overflow at 390px', await teval('document.documentElement.scrollWidth <= 391'));

    // 9. No console errors / exceptions.
    check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    check('zero page exceptions', exceptions.length === 0, exceptions.join(' | '));

    tws.close(); ws.close();
  } finally {
    child.kill();
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  const failed = results.filter((r) => !r[1]).length;
  console.log(failed === 0 ? 'SMOKE PASS: ' + results.length + '/' + results.length : 'SMOKE FAIL: ' + failed + ' failures');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
