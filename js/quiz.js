/* =========================================================
   やり方診断（5問）
   各選択肢は A〜D の4タイプのどれかに対応し、
   いちばん多く選ばれたタイプを結果として表示します。
   質問・結果の文章はこのファイルの QUESTIONS と RESULTS を編集してください。
   ========================================================= */
(function () {
  "use strict";

  var QUESTIONS = [
    {
      q: "勉強していて、いちばん近いのは？",
      options: [
        { text: "何から手をつければいいか分からない", type: "A" },
        { text: "やることは分かるが、続かない", type: "B" },
        { text: "やっているのに、伸びない", type: "C" },
        { text: "部活が忙しくて、勉強時間がない", type: "D" }
      ]
    },
    {
      q: "参考書や問題集を使うとき、どうしてる？",
      options: [
        { text: "どれを使えばいいか、決められない", type: "A" },
        { text: "最初の数ページで止まりがち", type: "B" },
        { text: "一通り解いたら、次の本に進む", type: "C" },
        { text: "すき間時間に少しずつしか進まない", type: "D" }
      ]
    },
    {
      q: "テスト前の勉強は、どんな感じ？",
      options: [
        { text: "範囲が広くて、何からやるか迷う", type: "A" },
        { text: "前日にまとめて詰め込む", type: "B" },
        { text: "たくさん解くのに、点数が上がらない", type: "C" },
        { text: "時間が足りず、範囲が終わらない", type: "D" }
      ]
    },
    {
      q: "間違えた問題は、そのあとどうしてる？",
      options: [
        { text: "自分が何を苦手なのか、よく分からない", type: "A" },
        { text: "あとで見直そうと思って、そのまま", type: "B" },
        { text: "答えを読んで、分かったつもりになる", type: "C" },
        { text: "見直す時間がとれない", type: "D" }
      ]
    },
    {
      q: "志望校について、いまの状況は？",
      options: [
        { text: "まだ決まっていない、何が必要か分からない", type: "A" },
        { text: "決まっているけど、行動に移せていない", type: "B" },
        { text: "模試の判定がなかなか上がらない", type: "C" },
        { text: "引退するまで、本格的に動けない", type: "D" }
      ]
    }
  ];

  var RESULTS = {
    A: {
      name: "計画迷子タイプ",
      desc: "やる気は十分。足りないのは「何を、どこまでやるか」の地図です。やることが決まらないまま時間だけが過ぎてしまうのが、いちばんもったいない状態です。",
      how: ["志望校と今の学力から逆算して、使う参考書と順番を決めます。", "「今日はこの本の何ページから何ページまで」まで具体的に決めるので、迷う時間がなくなります。"]
    },
    B: {
      name: "三日坊主タイプ",
      desc: "やるべきことは分かっている。あとは「続く仕組み」があれば一気に伸びるタイプです。部活で毎日練習を続けられたのは、決まったメニューと仲間の目があったから。",
      how: ["毎日やる範囲を宿題として決め、確認テストで本当にやったかをチェックします。", "週ごとの面談で進み具合を確認するので、一人で抱え込まずに続けられます。"]
    },
    C: {
      name: "やりっぱなしタイプ",
      desc: "勉強量はしっかりある。でも「解いた」と「できる」の間にすき間があるタイプです。何冊も手を広げるより、1冊を完璧にした方が点数は伸びます。",
      how: ["1冊を、何も見ずに解けるようになるまで繰り返します。", "確認テストで「分かったつもり」をなくし、完璧になってから次の1冊へ進みます。"]
    },
    D: {
      name: "時間不足タイプ",
      desc: "部活に全力だからこそ、時間が足りないのは当然です。限られた時間でやることを絞れば、引退後のスタートダッシュで十分に巻き返せます。",
      how: ["今の生活で無理なく続けられる量に、計画を調整します。", "引退後は勉強時間に合わせて一気にペースを上げ、最短ルートで志望校をめざします。"]
    }
  };

  var CTA_HREF = "#consult"; // 結果画面の「無料受験相談」ボタンのリンク先

  var root = document.querySelector("[data-quiz]");
  if (!root) return;
  var stage = root.querySelector("[data-q-stage]");
  var nowEl = root.querySelector("[data-q-now]");
  var totalEl = root.querySelector("[data-q-total]");
  var bar = root.querySelector("[data-q-bar]");
  var countEl = root.querySelector(".quiz__count");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var answers = [];
  var room = root.closest(".room");
  function setResultMode(on) { if (room) room.classList.toggle("is-result", on); }
  totalEl.textContent = QUESTIONS.length;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // 画面の切り替え（前の内容を左へ、新しい内容を右から）
  function swap(build, dir) {
    var old = stage.querySelector(".quiz__panel");
    var next = build();
    var d = dir === "back" ? -1 : 1;
    function enter() {
      Array.prototype.slice.call(stage.children).forEach(function (c) { if (c.tagName !== "NOSCRIPT") c.remove(); });
      stage.appendChild(next);
      if (!reduce && next.animate) {
        next.animate(
          [{ opacity: 0, transform: "translateX(" + 28 * d + "px)" }, { opacity: 1, transform: "none" }],
          { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      }
      var focusTarget = next.querySelector("[data-focus]");
      if (focusTarget && stage.dataset.started) focusTarget.focus({ preventScroll: true });
      stage.dataset.started = "1";
    }
    if (old && !reduce && old.animate) {
      var a = old.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(" + -28 * d + "px)" }],
        { duration: 180, easing: "ease-in", fill: "forwards" }
      );
      a.onfinish = enter;
    } else {
      enter();
    }
  }

  function renderQuestion(i, dir) {
    setResultMode(false);
    countEl.hidden = false;
    nowEl.textContent = i + 1;
    bar.style.width = ((i + 1) / QUESTIONS.length) * 100 + "%";

    swap(function () {
      var wrap = el("div", "quiz__panel");
      var q = el("p", "quiz__q", QUESTIONS[i].q);
      q.id = "quiz-q-" + i;
      q.tabIndex = -1;
      q.setAttribute("data-focus", "");
      var list = el("div", "quiz__options");
      list.setAttribute("role", "group");
      list.setAttribute("aria-labelledby", q.id);

      QUESTIONS[i].options.forEach(function (opt) {
        var b = el("button", "quiz__opt", opt.text);
        b.type = "button";
        if (answers[i] === opt.type) b.classList.add("is-picked");
        b.addEventListener("click", function () {
          answers[i] = opt.type;
          list.querySelectorAll(".quiz__opt").forEach(function (x) { x.classList.remove("is-picked"); });
          b.classList.add("is-picked");
          setTimeout(function () {
            if (i + 1 < QUESTIONS.length) renderQuestion(i + 1);
            else renderResult();
          }, reduce ? 0 : 260);
        });
        list.appendChild(b);
      });

      wrap.appendChild(q);
      wrap.appendChild(list);
      if (i > 0) {
        var back = el("button", "quiz__back", "ひとつ前の質問に戻る");
        back.type = "button";
        back.addEventListener("click", function () { renderQuestion(i - 1, "back"); });
        wrap.appendChild(back);
      }
      return wrap;
    }, dir);
  }

  function pickType() {
    var score = { A: 0, B: 0, C: 0, D: 0 };
    answers.forEach(function (t) { score[t] += 1; });
    // 同点のときは、1問目の答えを優先
    var best = answers[0];
    Object.keys(score).forEach(function (k) { if (score[k] > score[best]) best = k; });
    return best;
  }

  function renderResult() {
    var r = RESULTS[pickType()];
    nowEl.textContent = QUESTIONS.length;
    bar.style.width = "100%";
    countEl.hidden = true;
    setResultMode(true);

    swap(function () {
      var wrap = el("div", "quiz__panel qr");
      var label = el("p", "qr__label", "あなたの勉強は…");
      var type = el("p", "qr__type", r.name);
      type.tabIndex = -1;
      type.setAttribute("data-focus", "");
      var desc = el("p", "qr__desc", r.desc);
      var box = el("div", "qr__box");
      box.appendChild(el("p", "qr__box-title", "武田塾なら、こう変える"));
      r.how.forEach(function (t) { box.appendChild(el("p", null, t)); });

      var actions = el("div", "qr__actions");
      var cta = el("a", "qr__cta", "無料受験相談で、詳しく聞く");
      cta.href = CTA_HREF;
      cta.setAttribute("data-go", "");
      var retry = el("button", "qr__retry", "もう一度診断する");
      retry.type = "button";
      retry.addEventListener("click", function () {
        answers = [];
        renderQuestion(0, "back");
      });
      actions.appendChild(cta);
      actions.appendChild(retry);

      [label, type, desc, box, actions].forEach(function (n) { wrap.appendChild(n); });
      return wrap;
    });
  }

  renderQuestion(0);
})();
