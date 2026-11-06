// Namaz Guide BD \u2014 app logic. Vanilla JS, no deps, localStorage only.
(function () {
  "use strict";
  var DATA = window.NAMAZ_DATA;
  var I18N = window.NAMAZ_I18N;
  var bnDigits = window.NAMAZ_BN_DIGITS;
  var LS_KEY = "namaz-guide-bd-v1";

  var state = loadState();
  var lang = state.lang || "en";
  var tab = "wudu";
  var quiz = null; // {idx, answers[], picked}

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) { var s = JSON.parse(raw); if (s && typeof s === "object") return s; }
    } catch (e) { /* corrupted storage -> fresh state */ }
    return { learned: {}, best: null, lang: "en" };
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }
  function t(key) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    return s;
  }
  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) {
      s = s.split("{" + k + "}").join(vars[k]);
    });
    return s;
  }
  function loc(n) { return lang === "bn" ? bnDigits(n) : String(n); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- learned tracking ----------
  function totalLearnable() {
    return DATA.wudu.length + DATA.salah.length + DATA.mistakes.length;
  }
  function learnedCount() {
    return Object.keys(state.learned || {}).filter(function (k) { return state.learned[k]; }).length;
  }
  function toggleLearned(id) {
    state.learned = state.learned || {};
    state.learned[id] = !state.learned[id];
    saveState();
    render();
  }

  // ---------- renderers ----------
  function wuduHTML() {
    var h = '<h2>' + esc(t("wuduTitle")) + '</h2><p class="intro">' + esc(t("wuduIntro")) + '</p>';
    h += '<ol class="steps">';
    DATA.wudu.forEach(function (s, i) {
      var id = "wudu-" + s.id;
      var done = !!(state.learned && state.learned[id]);
      h += '<li class="card step' + (done ? " done" : "") + '">'
        + '<div class="step-head"><span class="step-no">' + loc(i + 1) + '</span>'
        + '<span class="step-title">' + esc(s[lang].title) + '</span>'
        + '<span class="tag ' + s.tag + '">' + esc(t(s.tag === "fard" ? "fardTag" : "sunnahTag")) + '</span>'
        + '<span class="times">' + esc(fmt("timesLabel", { n: loc(s.times) })) + '</span></div>'
        + '<p>' + esc(s[lang].detail) + '</p>'
        + '<button class="learn-btn" data-learn="' + id + '">' + esc(t(done ? "learned" : "markLearned")) + '</button>'
        + '</li>';
    });
    h += '</ol>';
    h += '<h3>' + esc(t("wuduBreakersTitle")) + '</h3><ul class="breakers">';
    DATA.wuduBreakers.forEach(function (b) {
      h += '<li>' + esc(b[lang]) + '</li>';
    });
    h += '</ul>';
    return h;
  }

  function rakatsHTML() {
    var h = '<h2>' + esc(t("rakatsTitle")) + '</h2><p class="intro">' + esc(t("rakatsIntro")) + '</p>';
    var fardTotal = 0;
    DATA.rakats.forEach(function (p) {
      p.parts.forEach(function (part) { if (part.kind === "fard") fardTotal += part.count; });
    });
    h += '<div class="rakat-grid">';
    DATA.rakats.forEach(function (p) {
      h += '<div class="card rakat-card"><div class="rakat-name">' + esc(p[lang]) + '</div>';
      p.parts.forEach(function (part) {
        h += '<div class="rakat-part"><span>' + esc(part[lang]) + '</span><b>' + loc(part.count) + '</b></div>';
      });
      h += '<div class="rakat-total"><span>' + esc(t("totalLabel")) + '</span><b>' + loc(p.total) + '</b></div></div>';
    });
    h += '</div>';
    h += '<p class="fard-total">' + esc(t("fardTotalLabel")) + ': <b>' + loc(fardTotal) + '</b></p>';
    return h;
  }

  function salahHTML() {
    var h = '<h2>' + esc(t("salahTitle")) + '</h2><p class="intro">' + esc(t("salahIntro")) + '</p>';
    h += '<ol class="steps">';
    DATA.salah.forEach(function (s, i) {
      var id = "salah-" + s.id;
      var done = !!(state.learned && state.learned[id]);
      h += '<li class="card step' + (done ? " done" : "") + '">'
        + '<div class="step-head"><span class="step-no">' + loc(i + 1) + '</span>'
        + '<span class="step-title">' + esc(s[lang].title) + '</span></div>'
        + '<p>' + esc(s[lang].detail) + '</p>';
      if (s.ar) h += '<p class="arabic" dir="rtl" lang="ar">' + esc(s.ar) + '</p>';
      if (s.translit) h += '<p class="translit"><b>' + esc(t("transliterationLabel")) + ':</b> ' + esc(s.translit) + '</p>';
      if (s[lang].meaning) h += '<p class="meaning"><b>' + esc(t("meaningLabel")) + ':</b> ' + esc(s[lang].meaning) + '</p>';
      h += '<button class="learn-btn" data-learn="' + id + '">' + esc(t(done ? "learned" : "markLearned")) + '</button>'
        + '</li>';
    });
    h += '</ol>';
    return h;
  }

  function mistakesHTML() {
    var h = '<h2>' + esc(t("mistakesTitle")) + '</h2><p class="intro">' + esc(t("mistakesIntro")) + '</p>';
    h += '<ol class="steps">';
    DATA.mistakes.forEach(function (m, i) {
      var id = "mistake-" + i;
      var done = !!(state.learned && state.learned[id]);
      h += '<li class="card step' + (done ? " done" : "") + '">'
        + '<div class="step-head"><span class="step-no">' + loc(i + 1) + '</span>'
        + '<span class="step-title">' + esc(m[lang].title) + '</span></div>'
        + '<p>' + esc(m[lang].detail) + '</p>'
        + '<button class="learn-btn" data-learn="' + id + '">' + esc(t(done ? "learned" : "markLearned")) + '</button>'
        + '</li>';
    });
    h += '</ol>';
    return h;
  }

  function quizHTML() {
    var h = '<h2>' + esc(t("quizTitle")) + '</h2><p class="intro">' + esc(t("quizIntro")) + '</p>';
    if (state.best != null) h += '<p class="best">' + esc(fmt("bestLabel", { a: loc(state.best), b: loc(DATA.quiz.length) })) + '</p>';
    if (!quiz) {
      h += '<button class="primary" id="quiz-start">' + esc(t("startQuiz")) + '</button>';
      h += progressHTML();
      return h;
    }
    if (quiz.idx >= DATA.quiz.length) {
      var score = quiz.answers.filter(function (a, i) { return a === DATA.quiz[i].answer; }).length;
      h += '<p class="score">' + esc(fmt("scoreLabel", { a: loc(score), b: loc(DATA.quiz.length) })) + '</p>';
      h += '<ol class="review">';
      DATA.quiz.forEach(function (q, i) {
        var ok = quiz.answers[i] === q.answer;
        h += '<li class="card review-' + (ok ? "ok" : "bad") + '"><b>' + esc(q[lang].q) + '</b><p>'
          + esc(ok ? t("correctLabel") : fmt("wrongLabel", { a: q[lang].options[q.answer] })) + '</p>'
          + '<p class="why">' + esc(q[lang].why) + '</p></li>';
      });
      h += '</ol>';
      h += '<button class="primary" id="quiz-retake">' + esc(t("retakeQuiz")) + '</button>';
      return h;
    }
    var q = DATA.quiz[quiz.idx];
    var picked = quiz.picked;
    h += '<p class="q-count">' + esc(fmt("questionLabel", { a: loc(quiz.idx + 1), b: loc(DATA.quiz.length) })) + '</p>';
    h += '<div class="card quiz-card"><p class="q-text">' + esc(q[lang].q) + '</p><div class="options">';
    q[lang].options.forEach(function (opt, i) {
      var cls = "opt";
      if (picked != null) {
        if (i === q.answer) cls += " opt-correct";
        else if (i === picked) cls += " opt-wrong";
        else cls += " opt-dim";
      }
      h += '<button class="' + cls + '" data-opt="' + i + '"' + (picked != null ? " disabled" : "") + '>' + esc(opt) + '</button>';
    });
    h += '</div>';
    if (picked != null) {
      var ok = picked === q.answer;
      h += '<p class="feedback ' + (ok ? "fb-ok" : "fb-bad") + '">' + esc(ok ? t("correctLabel") : fmt("wrongLabel", { a: q[lang].options[q.answer] })) + '</p>';
      h += '<p class="why">' + esc(q[lang].why) + '</p>';
      h += '<button class="primary" id="quiz-next">' + esc(quiz.idx === DATA.quiz.length - 1 ? t("seeResults") : t("nextQuestion")) + '</button>';
    }
    h += '</div>';
    return h;
  }

  function progressHTML() {
    var total = totalLearnable();
    var done = learnedCount();
    var h = '<div class="card progress-card"><h3>' + esc(t("progressTitle")) + '</h3>'
      + '<p>' + esc(fmt("progressLearned", { a: loc(done), b: loc(total) })) + '</p>'
      + '<div class="bar"><div class="bar-fill" style="width:' + Math.round(100 * done / total) + '%"></div></div>'
      + '<p>' + (state.best != null ? esc(fmt("progressQuiz", { a: loc(state.best) })) : esc(t("progressEmpty"))) + '</p>'
      + '<button class="danger" id="reset-progress">' + esc(t("resetProgress")) + '</button></div>';
    return h;
  }

  function render() {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.getElementById("lang-toggle").textContent = t("langToggle");
    document.querySelectorAll(".tab").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-tab") === tab);
      el.setAttribute("aria-selected", el.getAttribute("data-tab") === tab ? "true" : "false");
    });
    var main = document.getElementById("main");
    if (tab === "wudu") main.innerHTML = wuduHTML();
    else if (tab === "rakats") main.innerHTML = rakatsHTML();
    else if (tab === "salah") main.innerHTML = salahHTML();
    else if (tab === "mistakes") main.innerHTML = mistakesHTML();
    else if (tab === "quiz") main.innerHTML = quizHTML();
  }

  // ---------- events ----------
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-tab],[data-learn],#lang-toggle,#quiz-start,#quiz-next,#quiz-retake,#reset-progress,[data-opt]");
    if (!el) return;
    if (el.hasAttribute("data-tab")) { tab = el.getAttribute("data-tab"); render(); return; }
    if (el.id === "lang-toggle") {
      lang = lang === "en" ? "bn" : "en";
      state.lang = lang; saveState(); render(); return;
    }
    if (el.hasAttribute("data-learn")) { toggleLearned(el.getAttribute("data-learn")); return; }
    if (el.id === "quiz-start") { quiz = { idx: 0, answers: [], picked: null }; render(); return; }
    if (el.id === "quiz-retake") { quiz = { idx: 0, answers: [], picked: null }; render(); return; }
    if (el.id === "quiz-next") {
      quiz.answers[quiz.idx] = quiz.picked;
      quiz.idx += 1; quiz.picked = null;
      if (quiz.idx >= DATA.quiz.length) {
        var score = quiz.answers.filter(function (a, i) { return a === DATA.quiz[i].answer; }).length;
        if (state.best == null || score > state.best) { state.best = score; saveState(); }
      }
      render(); return;
    }
    if (el.id === "reset-progress") {
      if (window.confirm(t("resetConfirm"))) {
        state.learned = {}; state.best = null; saveState(); render();
      }
      return;
    }
    if (el.hasAttribute("data-opt") && quiz && quiz.picked == null) {
      quiz.picked = parseInt(el.getAttribute("data-opt"), 10);
      render(); return;
    }
  });

  render();
})();
