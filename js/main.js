/* =========================================================
   武田塾 部活引退生応援 特設サイト（部屋めぐり版）

   ・スクロールすると、横に並んだ部屋を1つずつ移動します（GSAP + ScrollTrigger）。
   ・移動中はカメラが少し引いて、部屋と部屋のあいだの廊下が見えます。
   ・部屋に入ると、その部屋の演出が1回だけ再生されます。
   ・「動きを減らす」設定の人や、ライブラリが読み込めない場合は、
     部屋を縦に並べた普通のページとして表示します。
   ========================================================= */
(function () {
  "use strict";

  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var rooms = $$(".room");
  var N = rooms.length;
  var navLinks = $$(".nav__list a");
  var segs = $$(".roombar span");
  var menuBtn = $(".menu-btn");
  var current = -1;

  /* =========================================================
     どちらのモードでも使う部品
     ========================================================= */

  /* ---------- スマホのメニュー ---------- */
  function setMenu(open) {
    html.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    $(".menu-btn__label").textContent = open ? "メニューを閉じる" : "メニュー";
    if (open) {
      var here = $(".nav__list a[aria-current='true']") || navLinks[0];
      here.focus({ preventScroll: true });
    }
  }
  menuBtn.addEventListener("click", function () {
    setMenu(!html.classList.contains("menu-open"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && html.classList.contains("menu-open")) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* ---------- いまいる部屋を、メニュー・区切り・PCの表示に反映 ---------- */
  var hereNo = $("[data-here-no]");
  var hereName = $("[data-here-name]");
  var walkBtns = $$("[data-walk]");
  function setCurrent(i) {
    if (i === current) return;
    current = i;
    navLinks.forEach(function (a, k) {
      if (k === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (hereNo) hereNo.textContent = pad(i + 1);
    if (hereName) hereName.textContent = rooms[i].dataset.name;
    walkBtns.forEach(function (b) {
      var d = +b.dataset.walk;
      b.disabled = (i + d < 0 || i + d > N - 1);
    });
  }
  function setSegments(r) {
    segs.forEach(function (s, k) { s.style.setProperty("--f", clamp(r - (k - 1), 0, 1)); });
  }

  /* ---------- 協賛大会の「春 / 夏」タブ（スマホ） ---------- */
  var tabs = $$(".season-tabs [role='tab']");
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute("aria-selected", String(on));
      x.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(x.getAttribute("aria-controls"));
      panel.hidden = !on;
      if (on && panel.animate && !reduce) {
        panel.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      }
    });
  }
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      e.stopPropagation();
      var next = tabs[(k + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  /* ---------- 逆転のしくみ：4つのステップ ---------- */
  var nodes = $$(".node");
  var steps = $$(".cycle__step");
  var ring = $(".cycle__ring");
  var methodRoom = $(".room--method");
  var autoTimer = null;
  var stepNow = 0;
  function setStep(i) {
    stepNow = i;
    nodes.forEach(function (n, k) {
      n.classList.toggle("is-on", k === i);
      n.classList.toggle("is-done", k < i);
      n.setAttribute("aria-pressed", String(k === i));
    });
    steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
    ring.style.setProperty("--ring", String(1 - (i + 1) / 4));
  }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; }
  function startAuto() {
    stopAuto();
    autoTimer = setInterval(function () {
      // 部屋にいないあいだは進めない
      if (html.classList.contains("rooms") && !methodRoom.classList.contains("is-here")) return;
      setStep((stepNow + 1) % 4);
    }, 2600);
  }
  nodes.forEach(function (n) {
    n.addEventListener("click", function () {
      stopAuto();
      setStep(+n.dataset.step);
    });
  });

  /* =========================================================
     モードの決定
     ========================================================= */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasLibs = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  selectTab(tabs[0]);

  if (reduce || !hasLibs) {
    flowMode();
  } else {
    roomsMode();
  }

  /* =========================================================
     普通のページ（部屋を縦に並べる）
     ========================================================= */
  function flowMode() {
    setStep(0);
    // <head>で外した #部屋名 を戻して、その場所へ移動
    if (window.__startHash) {
      var t = document.getElementById(window.__startHash);
      if (history.replaceState) history.replaceState(null, "", "#" + window.__startHash);
      if (t) t.scrollIntoView();
    }
    // メニューのリンクを押したらメニューを閉じる（移動はブラウザ標準のページ内リンク）
    document.addEventListener("click", function (e) {
      if (e.target.closest("a[href^='#']")) setMenu(false);
    });
    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var cur = 0;
      rooms.forEach(function (r, k) { if (r.getBoundingClientRect().top <= line) cur = k; });
      setCurrent(cur);
      setSegments(cur);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* =========================================================
     部屋めぐり
     ========================================================= */
  function roomsMode() {
    html.classList.add("rooms");
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var stage = $(".stage");
    var lens = $(".lens");
    var track = $(".track");
    var isMobile = function () { return window.innerWidth < 768; };

    /* ---------- 部屋と部屋のあいだに、次の部屋の名札を置く ---------- */
    rooms.forEach(function (room, i) {
      if (i === N - 1) return;
      var g = document.createElement("div");
      g.className = "gap";
      g.setAttribute("aria-hidden", "true");
      g.innerHTML = '<p class="gap__no">' + pad(i + 2) + '</p><p class="gap__name"></p>';
      g.querySelector(".gap__name").textContent = rooms[i + 1].dataset.name;
      room.after(g);
    });

    /* ---------- 応援カードを2周分に増やして、切れ目なく流す ---------- */
    var rail = $(".rally__rail");
    $$(".rally__card", rail).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelector("img").alt = "";
      rail.appendChild(c);
    });

    /* ---------- スクロールの長さ（1部屋につき画面1つぶん） ---------- */
    var runway = document.createElement("div");
    runway.className = "runway";
    document.body.appendChild(runway);
    function setRunway() {
      runway.style.height = ((N - 1) * window.innerHeight + window.innerHeight) + "px";
    }
    setRunway();

    function stepPx() {
      var g = $(".gap");
      return rooms[0].offsetWidth + (g ? g.offsetWidth : 0);
    }

    /* ---------- 部屋の移動（スクロール量に合わせて再生） ---------- */
    var visualR = 0;
    var move = gsap.timeline({
      defaults: { ease: "none" },
      onUpdate: function () { onMove(move.progress() * (N - 1)); },
      scrollTrigger: {
        trigger: runway,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
        invalidateOnRefresh: true,
        snap: {
          snapTo: 1 / (N - 1),
          inertia: false,
          duration: { min: 0.3, max: 0.8 },
          delay: 0.05,
          ease: "power1.inOut"
        }
      }
    });

    for (var i = 0; i < N - 1; i++) {
      (function (i) {
        var zoom = function () { return isMobile() ? 0.8 : 0.86; };
        move
          // 廊下を歩く
          .fromTo(track, { x: function () { return -i * stepPx(); } },
            { x: function () { return -(i + 1) * stepPx(); }, duration: 1, ease: "power2.inOut", immediateRender: false }, i)
          // 歩きながらカメラが少し引いて、着いたら寄る
          .fromTo(lens, { scale: 1 }, { scale: zoom, duration: 0.5, ease: "sine.out", immediateRender: false }, i)
          .fromTo(lens, { scale: zoom }, { scale: 1, duration: 0.5, ease: "sine.in", immediateRender: false }, i + 0.5)
          // 引いているあいだは部屋の角が丸くなる
          .fromTo(track, { "--r": "0px" }, { "--r": "24px", duration: 0.5, ease: "sine.out", immediateRender: false }, i)
          .fromTo(track, { "--r": "24px" }, { "--r": "0px", duration: 0.5, ease: "sine.in", immediateRender: false }, i + 0.5);

        // 写真は部屋より少し遅れて動き、奥行きを出す
        var leave = $$(".room__bg img", rooms[i]);
        var arrive = $$(".room__bg img", rooms[i + 1]);
        if (leave.length) move.fromTo(leave, { xPercent: 0 }, { xPercent: 9, duration: 1, immediateRender: false }, i);
        if (arrive.length) move.fromTo(arrive, { xPercent: -9 }, { xPercent: 0, duration: 1, immediateRender: false }, i);
      })(i);
    }

    var st = move.scrollTrigger;
    function scrollYFor(i) { return st.start + (st.end - st.start) * (i / (N - 1)); }

    /* ---------- 移動中の処理 ---------- */
    var entered = [];
    function onMove(r) {
      visualR = r;
      setSegments(r);
      setCurrent(clamp(Math.round(r), 0, N - 1));
      rooms.forEach(function (room, k) {
        var d = Math.abs(r - k);
        room.classList.toggle("is-here", d < 0.5);
        if (d < 0.35 && !entered[k]) enter(k);
      });
    }

    /* ---------- 部屋への移動（メニュー・ボタン・キー操作） ---------- */
    var curtain = $(".curtain");
    function jumpTo(i) {
      window.scrollTo(0, scrollYFor(i));
      ScrollTrigger.update();
      var tw = st.getTween && st.getTween();
      if (tw) tw.progress(1);
      move.progress(i / (N - 1));
      onMove(i);
    }
    function goTo(i, opts) {
      i = clamp(i, 0, N - 1);
      opts = opts || {};
      if (opts.jump) { jumpTo(i); return; }
      if (Math.abs(i - visualR) <= 1.05) {
        // となりの部屋：そのまま歩いて移動
        window.scrollTo(0, scrollYFor(i));
        return;
      }
      // 離れた部屋：幕を下ろして移動
      $(".curtain__no", curtain).textContent = pad(i + 1);
      $(".curtain__name", curtain).textContent = rooms[i].dataset.name;
      gsap.timeline()
        .to(curtain, { autoAlpha: 1, duration: 0.28, ease: "power1.out" })
        .from([".curtain__no", ".curtain__name"], { y: 16, autoAlpha: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" }, 0.08)
        .add(function () { jumpTo(i); }, 0.4)
        .to(curtain, { autoAlpha: 0, duration: 0.45, ease: "power1.inOut" }, 0.75);
    }

    // ページ内リンク（メニュー、申し込みボタンなど）
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href^='#']");
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      var target = id && document.getElementById(id);
      var room = target && target.closest(".room");
      if (!room) return;
      e.preventDefault();
      var wasOpen = html.classList.contains("menu-open");
      setMenu(false);
      var k = rooms.indexOf(room);
      if (wasOpen) setTimeout(function () { goTo(k); }, 120);
      else goTo(k);
      if (history.replaceState) history.replaceState(null, "", k === 0 ? location.pathname : "#" + room.id);
    });

    // PCの前後ボタン
    walkBtns.forEach(function (b) {
      b.addEventListener("click", function () { goTo(current + +b.dataset.walk); });
    });

    // 左右キーでも移動
    document.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (e.target.closest && e.target.closest("input, textarea, select, [role='tab']")) return;
      if (html.classList.contains("menu-open")) return;
      e.preventDefault();
      goTo(current + (e.key === "ArrowRight" ? 1 : -1));
    });

    // Tabキーで別の部屋の要素に移ったら、その部屋へ
    document.addEventListener("focusin", function (e) {
      var room = e.target.closest && e.target.closest(".room");
      if (!room) return;
      var k = rooms.indexOf(room);
      if (k !== current) goTo(k, { jump: true });
    });
    // フォーカスでブラウザが部屋の中を勝手にスクロールしないようにする
    stage.addEventListener("scroll", function (e) {
      var t = e.target;
      if (t.scrollLeft || t.scrollTop) { t.scrollLeft = 0; t.scrollTop = 0; }
    }, true);

    // 画面サイズが変わっても、いまいる部屋にとどまる
    var keep = 0;
    var pendingStart = -1;
    ScrollTrigger.addEventListener("refreshInit", function () {
      keep = pendingStart >= 0 ? pendingStart : current;
      setRunway();
    });
    ScrollTrigger.addEventListener("refresh", function () { jumpTo(keep); });

    /* =========================================================
       部屋ごとの演出（はじめて部屋に入ったときに1回再生）
       ========================================================= */
    function splitChars(el) {
      var original = el.textContent;
      var visual = document.createElement("span");
      visual.setAttribute("aria-hidden", "true");
      (function walk(src, dest) {
        Array.prototype.forEach.call(src.childNodes, function (n) {
          if (n.nodeType === 3) {
            Array.from(n.textContent).forEach(function (c) {
              if (/\s/.test(c)) { dest.appendChild(document.createTextNode(c)); return; }
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
      })(el, visual);
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = original;
      el.textContent = "";
      el.appendChild(sr);
      el.appendChild(visual);
      return $$(".ch", visual);
    }
    function writeIn(tl, el, at) {
      tl.fromTo(el, { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 1.2, ease: "power1.inOut" }, at);
    }
    function fmt(v, d) { return v.toLocaleString("ja-JP", { minimumFractionDigits: d, maximumFractionDigits: d }); }
    function countUp(tl, el, at, dur) {
      var d = +(el.dataset.decimals || 0);
      var prefix = el.dataset.prefix || "";
      var o = { v: 0 };
      el.textContent = prefix + fmt(0, d);
      tl.to(o, {
        v: +el.dataset.to, duration: dur || 1.4, ease: "power2.out",
        onUpdate: function () { el.textContent = prefix + fmt(o.v, d); }
      }, at);
    }

    var builders = {
      /* 01 トップ */
      "room--hero": function (room, tl) {
        tl.from($$(".hero__line", room), { yPercent: 45, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.14 }, 0.1)
          .from($(".hero__photo", room), { opacity: 0, duration: 1.2, ease: "power2.out" }, 0)
          .from($(".hero__photo img", room), { scale: 1.45, duration: 1.8, ease: "power3.out" }, 0);
        writeIn(tl, $(".hero__note .write", room), 0.8);
        tl.from($$(".hero__sub .ln", room), { y: 18, opacity: 0, duration: 0.8, ease: "power2.out", stagger: 0.12 }, 1.1)
          .from($(".hint", room), { opacity: 0, duration: 0.6 }, 1.8);
      },
      /* 02 メッセージ */
      "room--message": function (room, tl) {
        var chars = splitChars($(".message__title", room));
        tl.fromTo($(".message__photo", room), { clipPath: "inset(16% 22% 16% 22% round 18px)" }, { clipPath: "inset(0% 0% 0% 0% round 18px)", duration: 1.1, ease: "power3.inOut" }, 0)
          .from($(".message__photo img", room), { scale: 1.5, duration: 1.4, ease: "power3.out" }, 0)
          .from($(".pill", room), { opacity: 0, y: 10, duration: 0.5 }, 0.6)
          .fromTo(chars, { opacity: 0.1 }, { opacity: 1, duration: 0.2, stagger: 0.035, ease: "none" }, 0.7)
          .from($(".message__text", room), { opacity: 0, y: 14, duration: 0.6 }, 1.5);
      },
      /* 03 応援 */
      "room--cheer": function (room, tl) {
        var chars = splitChars($(".cheer__title", room));
        tl.from($(".pill", room), { opacity: 0, y: 10, duration: 0.5 }, 0.1)
          .from(chars, { y: 34, opacity: 0, rotate: 10, duration: 0.6, ease: "back.out(2.4)", stagger: 0.045 }, 0.2)
          .from($(".cheer__lead", room), { opacity: 0, y: 14, duration: 0.6 }, 0.8)
          .from($(".shout", room), { opacity: 0, duration: 0.8 }, 0.6)
          .from($(".rally__window", room), { xPercent: 30, opacity: 0, duration: 1, ease: "power3.out" }, 0.5);
      },
      /* 04 協賛大会 */
      "room--sponsor": function (room, tl) {
        tl.from($(".sponsor__title", room), { opacity: 0, y: 20, duration: 0.7, ease: "power2.out" }, 0);
        writeIn(tl, $(".sponsor__note .write", room), 0.4);
        tl.from([$(".sponsor__lead", room), $(".season-tabs", room)], { opacity: 0, y: 12, duration: 0.5, stagger: 0.1 }, 0.3)
          .from($$(".season__tag", room), { scale: 0.4, opacity: 0, duration: 0.5, ease: "back.out(2.5)" }, 0.5)
          .from($$(".season__list li", room), { x: -22, opacity: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" }, 0.55)
          .from($$(".season__list svg", room), { scale: 0, rotate: -90, duration: 0.5, stagger: 0.06, ease: "back.out(2.5)" }, 0.6);
      },
      /* 05 逆転のしくみ */
      "room--method": function (room, tl) {
        ring.style.setProperty("--ring", "1");
        tl.from($(".method__head", room), { opacity: 0, y: 18, duration: 0.7 }, 0)
          .from($$(".node", room), { scale: 0, duration: 0.6, stagger: 0.12, ease: "back.out(2)", clearProps: "transform,translate,rotate,scale" }, 0.3)
          .from($(".cycle__center", room), { opacity: 0, scale: 0.8, duration: 0.6 }, 0.6)
          .from($(".cycle__steps", room), { opacity: 0, y: 16, duration: 0.6 }, 0.9)
          .add(function () { setStep(0); startAuto(); }, 0.9);
      },
      /* 06 実績 */
      "room--results": function (room, tl) {
        tl.from($(".results__title", room), { opacity: 0, y: 20, duration: 0.7 }, 0)
          .from($(".results__lead", room), { opacity: 0, y: 12, duration: 0.5 }, 0.2)
          .from($$(".stat", room), { opacity: 0, y: 24, duration: 0.6, stagger: 0.1, ease: "power2.out" }, 0.3);
        $$(".stat .count", room).forEach(function (el) { countUp(tl, el, 0.45, 1.5); });
        tl.from($(".chart", room), { opacity: 0, y: 24, duration: 0.6 }, 0.5)
          .fromTo($(".bar--before .bar__fill", room), { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: "power2.out" }, 0.9)
          .from($(".bar--before .bar__num", room), { opacity: 0, duration: 0.3 }, 0.9);
        countUp(tl, $(".bar--before .count", room), 0.9, 0.8);
        tl.fromTo($(".chart__arrow-line", room), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power1.inOut" }, 1.5)
          .from($(".chart__arrow-head", room), { opacity: 0, scale: 0.4, transformOrigin: "100% 0%", duration: 0.25 }, 2.0)
          .fromTo($(".bar--after .bar__fill", room), { scaleY: 0 }, { scaleY: 1, duration: 1, ease: "power3.out" }, 2.0)
          .from($(".bar--after .bar__num", room), { opacity: 0, duration: 0.3 }, 2.0);
        countUp(tl, $(".bar--after .count", room), 2.0, 1);
        writeIn(tl, $(".chart__note .write", room), 2.6);
        tl.from($$(".chips li", room), { scale: 0.6, opacity: 0, duration: 0.45, stagger: 0.06, ease: "back.out(2.2)" }, 2.4);
      },
      /* 07 やり方診断 */
      "room--diagnosis": function (room, tl) {
        tl.from($$(".diag__head > *", room), { opacity: 0, y: 18, duration: 0.6, stagger: 0.1 }, 0)
          .from($(".quiz", room), { opacity: 0, y: 40, duration: 0.8, ease: "power3.out" }, 0.3)
          .from($(".quiz__stage", room), { opacity: 0, y: 14, duration: 0.6 }, 0.7);
      },
      /* 08 無料相談 */
      "room--consult": function (room, tl) {
        var chars = splitChars($(".consult__title", room));
        tl.from($(".consult__photo img", room), { scale: 1.5, duration: 1.6, ease: "power3.out" }, 0)
          .from($(".pill", room), { opacity: 0, y: 10, duration: 0.5 }, 0.3)
          .from(chars, { yPercent: 70, opacity: 0, duration: 0.7, stagger: 0.05, ease: "power3.out" }, 0.4)
          .from($(".consult__text", room), { opacity: 0, y: 14, duration: 0.6 }, 0.9)
          .from($(".btn-cta", room), { opacity: 0, y: 20, scale: 0.92, duration: 0.7, ease: "back.out(1.8)" }, 1.2);
      }
    };

    var entrances = rooms.map(function (room) {
      var tl = gsap.timeline({ paused: true });
      Object.keys(builders).some(function (cls) {
        if (room.classList.contains(cls)) { builders[cls](room, tl); return true; }
        return false;
      });
      return tl;
    });
    function enter(k) {
      entered[k] = true;
      entrances[k].play();
    }

    /* ---------- はじめの表示 ---------- */
    onMove(0);

    // 共有されたURLに #部屋名 が付いていたら、その部屋から始める
    // （#は<head>の中でいったん外してあるので、ここで付け直す）
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var startRoom = window.__startHash && document.getElementById(window.__startHash);
    var startIndex = startRoom ? rooms.indexOf(startRoom.closest(".room")) : -1;
    if (startIndex > 0) {
      pendingStart = startIndex;
      jumpTo(startIndex);
      if (history.replaceState) history.replaceState(null, "", "#" + rooms[startIndex].id);
      window.addEventListener("load", function () {
        setTimeout(function () { pendingStart = -1; }, 300);
      });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }
})();
