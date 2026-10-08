/* =========================================================
   武田塾 部活引退生応援 特設サイト：スクロール演出
   使用ライブラリ：GSAP + ScrollTrigger（演出）、Lenis（PCのなめらかスクロール）
   「動きを減らす」設定の人や、ライブラリが読み込めない場合は演出なしで全文を表示します。
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasLibs = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (reduceMotion || !hasLibs) return;

  document.documentElement.classList.add("motion");
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return gsap.utils.toArray(s, r); };
  var isMobile = function () { return window.innerWidth < 768; };

  /* ---------- Lenis（PCのホイールだけ慣性。スマホは端末本来のスクロール） ---------- */
  if (typeof window.Lenis !== "undefined") {
    var lenis = new Lenis({ lerp: 0.12, anchors: { offset: -60 } });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- 進捗バー（CSSで動かせないブラウザ向け） ---------- */
  if (!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) {
    gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
  }

  /* ---------- 文字を1文字ずつ span に分ける（<em>や<br>はそのまま） ---------- */
  function splitChars(el) {
    var original = el.textContent;
    var visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    function walk(src, dest) {
      src.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          Array.from(n.textContent).forEach(function (c) {
            if (c === "\n" || c === " ") { dest.appendChild(document.createTextNode(c)); return; }
            var s = document.createElement("span");
            s.className = "ch";
            s.style.display = "inline-block";
            s.textContent = c;
            dest.appendChild(s);
          });
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false);
          dest.appendChild(clone);
          walk(n, clone);
        }
      });
    }
    walk(el, visual);
    var sr = document.createElement("span");
    sr.className = "visually-hidden";
    sr.textContent = original;
    el.textContent = "";
    el.appendChild(sr);
    el.appendChild(visual);
    return visual.querySelectorAll(".ch");
  }

  /* ---------- 手書き文字を「書いていく」ように表示 ---------- */
  function writeIn(el, opts) {
    return gsap.fromTo(el,
      { clipPath: "inset(-20% 100% -20% 0%)" },
      Object.assign({ clipPath: "inset(-20% 0% -20% 0%)", duration: 1.3, ease: "power1.inOut" }, opts || {})
    );
  }

  /* =========================================================
     1. ヒーロー：写真がカードから画面いっぱいに広がる
     ========================================================= */
  var heroLines = $$(".hero__line");
  var heroNote = $(".hero__note .write");
  var heroPhoto = $(".hero__photo");
  var heroImg = $(".hero__photo img");
  var heroSub = $$(".hero__sub .ln");

  // 読み込み時の登場
  gsap.from(heroLines, { yPercent: 45, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.14, delay: 0.1 });
  gsap.from(heroPhoto, { autoAlpha: 0, y: 40, duration: 1.1, ease: "power3.out", delay: 0.3 });
  writeIn(heroNote, { delay: 0.9 });
  gsap.set(heroSub, { autoAlpha: 0, yPercent: 50 });

  var mm = gsap.matchMedia();

  mm.add("(max-width: 767px)", function () {
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=170%", pin: true, scrub: 0.6, anticipatePin: 1 }
    });
    tl.to(heroPhoto, { top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0, duration: 0.5, ease: "power1.inOut" }, 0)
      .fromTo(heroImg, { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
      .to(".hero__copy", { y: -60, autoAlpha: 0, duration: 0.3 }, 0.08)
      .to(heroPhoto, { "--shade": 1, duration: 0.3 }, 0.35)
      .to(heroSub, { autoAlpha: 1, yPercent: 0, stagger: 0.08, duration: 0.25, ease: "power2.out" }, 0.45)
      .to({}, { duration: 0.15 });
  });

  mm.add("(min-width: 768px)", function () {
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=110%", pin: true, scrub: 0.6, anticipatePin: 1 }
    });
    tl.to(heroPhoto, { top: 0, right: 0, bottom: 0, left: "50%", borderRadius: 0, duration: 0.5, ease: "power1.inOut" }, 0)
      .fromTo(heroImg, { scale: 1.15 }, { scale: 1, duration: 1 }, 0)
      .to(heroSub, { autoAlpha: 1, yPercent: 0, stagger: 0.08, duration: 0.25, ease: "power2.out" }, 0.3)
      .to({}, { duration: 0.2 });
  });

  /* ---------- スマホ下部ボタン：ヒーローを抜けたら出し、申し込み欄では隠す ---------- */
  ScrollTrigger.create({
    trigger: ".cheer",
    start: "top 85%",
    endTrigger: ".cta",
    end: "top 70%",
    toggleClass: { targets: ".dock", className: "is-shown" }
  });

  /* =========================================================
     2. メッセージ：写真が広がり、言葉が浮かび上がる
     ========================================================= */
  gsap.fromTo(".cheer__photo",
    { clipPath: "inset(14% 18% 14% 18% round 18px)" },
    {
      clipPath: "inset(0% 0% 0% 0% round 18px)",
      ease: "none",
      scrollTrigger: { trigger: ".cheer__photo", start: "top 92%", end: "center 52%", scrub: true }
    }
  );
  gsap.fromTo(".cheer__photo img", { scale: 1.25 }, {
    scale: 1, ease: "none",
    scrollTrigger: { trigger: ".cheer__photo", start: "top 92%", end: "center 52%", scrub: true }
  });

  var cheerChars = splitChars($(".cheer__title"));
  gsap.fromTo(cheerChars, { opacity: 0.12 }, {
    opacity: 1, ease: "none", stagger: 0.05,
    scrollTrigger: { trigger: ".cheer__title", start: "top 85%", end: "bottom 55%", scrub: true }
  });

  /* =========================================================
     3. 協賛：スタジアムの奥行き → 応援の声とカードが流れる
     ========================================================= */
  gsap.fromTo(".support__stadium img", { yPercent: -10, scale: 1.2 }, {
    yPercent: 10, scale: 1.2, ease: "none",
    scrollTrigger: { trigger: ".support__stadium", start: "top bottom", end: "bottom top", scrub: true }
  });

  var supportChars = splitChars($(".support__title"));
  gsap.from(supportChars, {
    y: 36, autoAlpha: 0, rotate: 8, duration: 0.6, ease: "back.out(2.2)", stagger: 0.045,
    scrollTrigger: { trigger: ".support__title", start: "top 82%", once: true }
  });

  var rail = $(".rally__rail");
  var shout1 = $(".shout--1 .shout__text");
  var shout2 = $(".shout--2 .shout__text");
  var cards = $$(".rally__card");

  function railShift() { return Math.max(0, rail.scrollWidth - window.innerWidth); }
  function pinLength() { return Math.max(railShift() * 1.2, window.innerHeight * 0.9); }

  var rallyTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: ".rally-zone",
      start: "top top",
      end: function () { return "+=" + pinLength(); },
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  });
  rallyTl
    .fromTo(rail, { x: function () { return isMobile() ? 0 : railShift() / 2; } }, { x: function () { return -railShift(); }, duration: 1 }, 0)
    .fromTo(shout1, { x: 0 }, { x: function () { return -shout1.scrollWidth * 0.35; }, duration: 1 }, 0)
    .fromTo(shout2, { x: function () { return -shout2.scrollWidth * 0.35; } }, { x: 0, duration: 1 }, 0);

  // カードは画面に入ってくる途中で、上下から交互に飛び込んでくる
  gsap.from(cards, {
    y: function (i) { return i % 2 ? 110 : -110; },
    rotate: function (i) { return i % 2 ? 8 : -8; },
    autoAlpha: 0,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".rally-zone", start: "top 85%", end: "top 15%", scrub: 0.5 }
  });
  cards.forEach(function (card) {
    rallyTl.fromTo(card.querySelector("img"), { xPercent: -6 }, { xPercent: 6, duration: 1 }, 0);
  });

  // 協賛一覧：手書き文字と、各大会が順に並ぶ
  writeIn(".sponsor__note .write", { scrollTrigger: { trigger: ".sponsor__note", start: "top 85%", once: true } });
  $$(".season").forEach(function (season) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: season, start: "top 82%", once: true } });
    tl.from(season.querySelector(".season__tag"), { scale: 0.4, autoAlpha: 0, duration: 0.5, ease: "back.out(2.5)" })
      .from(season.querySelectorAll("li"), { x: -24, autoAlpha: 0, duration: 0.45, stagger: 0.07, ease: "power2.out" }, 0.1)
      .from(season.querySelectorAll("li svg"), { scale: 0, rotate: -90, duration: 0.5, stagger: 0.07, ease: "back.out(2.5)" }, 0.15);
  });

  /* =========================================================
     4. 逆転のしくみ：画面を固定し、サイクルが1周する
     ========================================================= */
  var nodes = $$(".node");
  var steps = $$(".cycle__step");
  var current = -1;
  function setStep(i) {
    if (i === current) return;
    current = i;
    nodes.forEach(function (n, k) { n.classList.toggle("is-on", k <= i); });
    steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
  }
  setStep(0);

  gsap.timeline({
    scrollTrigger: {
      trigger: ".why",
      start: "top top",
      end: "+=260%",
      pin: true,
      scrub: 0.4,
      anticipatePin: 1,
      onUpdate: function (self) {
        setStep(Math.min(3, Math.floor(self.progress * 4 * 0.999)));
      }
    }
  })
    .fromTo(".cycle__bar", { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", duration: 1 })
    .fromTo(".cycle__center p", { scale: 0.85 }, { scale: 1, ease: "none", duration: 1 }, 0);

  /* =========================================================
     4-2. 実績：数字のカウントアップと、グラフの伸び
     ========================================================= */
  function formatNum(v, decimals) {
    return v.toLocaleString("ja-JP", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function countTo(el, value, opts) {
    var d = +(el.dataset.decimals || 0);
    var prefix = el.dataset.prefix || "";
    var o = { v: 0 };
    return gsap.to(o, Object.assign({
      v: value,
      ease: "power2.out",
      onUpdate: function () { el.textContent = prefix + formatNum(o.v, d); }
    }, opts || {}));
  }

  $$(".stat .count").forEach(function (el) {
    el.textContent = (el.dataset.prefix || "") + formatNum(0, +(el.dataset.decimals || 0));
    countTo(el, +el.dataset.to, { duration: 1.6, scrollTrigger: { trigger: ".stats", start: "top 82%", once: true } });
  });
  gsap.from(".stat", {
    y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
    scrollTrigger: { trigger: ".stats", start: "top 85%", once: true }
  });

  var before = $(".bar--before .count");
  var after = $(".bar--after .count");
  var chartTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: ".chart", start: "top 78%", end: "bottom 70%", scrub: 0.5 }
  });
  chartTl
    .fromTo(".bar--before .bar__fill", { scaleY: 0 }, { scaleY: 1, duration: 0.3 }, 0)
    .fromTo(".bar--before .bar__num", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0)
    .add(countTo(before, 41, { duration: 0.3, ease: "none" }), 0)
    .fromTo(".chart__arrow-line", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3 }, 0.3)
    .fromTo(".chart__arrow-head", { autoAlpha: 0, scale: 0.4, transformOrigin: "100% 0%" }, { autoAlpha: 1, scale: 1, duration: 0.08 }, 0.55)
    .fromTo(".bar--after .bar__fill", { scaleY: 0 }, { scaleY: 1, duration: 0.35 }, 0.55)
    .fromTo(".bar--after .bar__num", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.55)
    .add(countTo(after, 63, { duration: 0.35, ease: "none" }), 0.55);

  writeIn(".chart__note .write", { scrollTrigger: { trigger: ".chart__note", start: "top 88%", once: true } });
  gsap.from(".chips li", {
    scale: 0.6, autoAlpha: 0, duration: 0.5, stagger: 0.07, ease: "back.out(2.2)",
    scrollTrigger: { trigger: ".chips", start: "top 92%", once: true }
  });

  /* =========================================================
     5. 診断：カードがせり上がる（中の切り替えは quiz.js）
     ========================================================= */
  gsap.from(".quiz", {
    y: 60, autoAlpha: 0, duration: 0.9, ease: "power3.out",
    scrollTrigger: { trigger: ".quiz", start: "top 88%", once: true }
  });
  // 診断の内容が変わって高さが変わったら、下の演出位置を計算し直す
  if ("ResizeObserver" in window) {
    var t;
    new ResizeObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { ScrollTrigger.refresh(); }, 200);
    }).observe($(".quiz"));
  }

  /* =========================================================
     6. CTA：写真がゆっくり寄り、言葉が立ち上がる
     ========================================================= */
  gsap.fromTo(".cta__photo img", { scale: 1.25, yPercent: -6 }, {
    scale: 1, yPercent: 0, ease: "none",
    scrollTrigger: { trigger: ".cta__photo", start: "top bottom", end: "bottom 40%", scrub: true }
  });
  var ctaChars = splitChars($(".cta__title"));
  gsap.from(ctaChars, {
    yPercent: 70, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: "power3.out",
    scrollTrigger: { trigger: ".cta__title", start: "top 85%", once: true }
  });
  gsap.from(".btn-cta", {
    y: 24, autoAlpha: 0, scale: 0.94, duration: 0.7, ease: "back.out(1.8)",
    scrollTrigger: { trigger: ".btn-cta", start: "top 92%", once: true }
  });

  /* ---------- フォントや画像の読み込み後に位置を再計算 ---------- */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
