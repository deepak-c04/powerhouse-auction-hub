/* Power House UX layer — shared by the hub and every league page.
   Adds: command menu (⌘K), shortcut hints, undo toasts, prerendering,
   league menus with a safe triangle, swipe-to-dismiss + back-gesture close
   for sheets, hit slop, BlurHash placeholders and the room-code field.
   Everything here is additive: if this file fails, the pages still work. */
(function () {
  "use strict";
  var d = document, w = window;
  var ROOT = new URL("..", (d.currentScript && d.currentScript.src) || location.href).href;
  var FINE = w.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var REDUCED = w.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var LEAGUES = [
    { k: "ipl", n: "IPL", p: ["home", "play", "players", "teams", "leaders", "unsold", "schedule", "how-to-play", "support"] },
    { k: "wpl", n: "WPL", p: ["home", "play", "players", "teams", "leaders", "unsold", "schedule", "how-to-play", "support"] },
    { k: "kabaddi", n: "Kabaddi", p: ["home", "play", "players", "teams", "starting-7", "rules"] },
    { k: "bbl", n: "BBL", p: ["home", "play", "players", "teams", "leaders", "unsold", "schedule", "how-to-play", "support"] }
  ];
  function label(p) { return p === "starting-7" ? "Starting 7" : p.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function href(l, p) { return ROOT + l + "/" + p + ".html"; }
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function typing(t) { t = t || d.activeElement; return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  function visible(e) { return !!e && e.offsetParent !== null && !e.disabled; }

  /* ------------------------------------------------------------ toasts */
  var stack;
  function toast(msg, opt) {
    opt = opt || {};
    if (!stack) { stack = el("div", "ux-toasts"); stack.setAttribute("role", "status"); stack.setAttribute("aria-live", "polite"); d.body.appendChild(stack); }
    var ms = opt.ms || (opt.undo ? 5000 : 2600), done = false;
    var t = el("div", "ux-toast", "<span>" + esc(msg) + "</span>");
    t.style.position = "relative";
    if (opt.undo) {
      var u = el("button", null, "Undo"); u.type = "button"; t.appendChild(u);
      var bar = el("i", "bar"); t.appendChild(bar);
      if (!REDUCED && bar.animate) bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: ms, easing: "linear", fill: "forwards" });
      u.onclick = function () { if (done) return; done = true; clearTimeout(timer); try { opt.undo(); } finally { hide(); } };
    }
    stack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("on"); });
    var timer = setTimeout(function () { if (done) return; done = true; if (opt.commit) opt.commit(); hide(); }, ms);
    function hide() { t.classList.remove("on"); setTimeout(function () { t.remove(); }, 260); }
    return t;
  }

  /* ------------------------------------------- close watcher (back gesture) */
  /* CloseWatcher lets Android's back gesture (and Esc) close the top sheet
     instead of leaving the page. Browsers without it fall back to Esc. */
  function watchClose(onClose) {
    if (!w.CloseWatcher) return { destroy: function () {} };
    try { var cw = new CloseWatcher(); cw.onclose = onClose; return cw; } catch (e) { return { destroy: function () {} }; }
  }

  /* ----------------------------------------------------- swipe to dismiss */
  /* Drag a sheet down to close it. The drag starts from wherever the sheet
     currently is, so a sheet still animating in can be grabbed mid-way. */
  function swipeDismiss(sheet, close, handleSel) {
    if (!sheet || sheet.__uxSwipe) return; sheet.__uxSwipe = true;
    var y0 = 0, dy = 0, t0 = 0, on = false;
    sheet.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" || e.button) return;
      var scroller = e.target.closest && e.target.closest("ul,[style*=overflow],.ux-scroll,#chatm,#sbl");
      if (scroller && scroller.scrollTop > 0) return;
      if (handleSel && !(e.target.closest && e.target.closest(handleSel))) return;
      y0 = e.clientY; dy = 0; t0 = e.timeStamp; on = true;
    }, { passive: true });
    sheet.addEventListener("pointermove", function (e) {
      if (!on) return; dy = Math.max(0, e.clientY - y0);
      if (dy > 6) { sheet.classList.add("ux-dragging"); sheet.style.translate = "0 " + dy + "px"; }
    }, { passive: true });
    function end(e) {
      if (!on) return; on = false; sheet.classList.remove("ux-dragging");
      var v = dy / Math.max(1, e.timeStamp - t0);
      if (dy > Math.min(140, sheet.offsetHeight * .3) || (dy > 30 && v > .5)) {
        sheet.style.transition = "translate .2s ease"; sheet.style.translate = "0 100vh";
        setTimeout(function () { sheet.style.transition = ""; sheet.style.translate = ""; close(); }, 180);
      } else {
        sheet.style.transition = "translate .22s cubic-bezier(.2,.9,.25,1)"; sheet.style.translate = "";
        setTimeout(function () { sheet.style.transition = ""; }, 240);
      }
    }
    sheet.addEventListener("pointerup", end); sheet.addEventListener("pointercancel", end);
  }

  /* Page sheets that open by gaining class "on": players card, compare,
     squad, chat and scoreboard panels. Each gets swipe + back-gesture close. */
  var SHEETS = [["#pm", ".bx"], ["#phxc-o", null], ["#sq", ".sh"], ["#chatp", null], ["#sbp", null], ["#m", ".fl"], ["#cm", ".cmp"]];
  function isOpen(host) { return !host.hidden && (host.classList.contains("on") || host.hasAttribute("hidden-managed")); }
  function closeSheet(host) {
    var x = host.querySelector(".x,.mx,.ch button,[data-close],button[aria-label^='Close'],button[aria-label^='close']");
    if (x) x.click(); else if (host.hasAttribute("hidden-managed")) host.hidden = true; else host.classList.remove("on");
  }
  function hookSheets() {
    SHEETS.forEach(function (s) {
      var host = d.querySelector(s[0]); if (!host || host.__uxSheet) return; host.__uxSheet = true;
      if (host.hasAttribute("hidden")) host.setAttribute("hidden-managed", "");
      var cw = null;
      new MutationObserver(function () {
        var open = isOpen(host);
        if (open && !cw) {
          cw = watchClose(function () { cw = null; if (isOpen(host)) closeSheet(host); });
          if (matchMedia("(max-width: 800px)").matches) swipeDismiss(s[1] ? host.querySelector(s[1]) || host : host, function () { closeSheet(host); });
        } else if (!open && cw) { var c = cw; cw = null; c.destroy(); }
      }).observe(host, { attributes: true, attributeFilter: ["class", "hidden"] });
    });
  }

  /* -------------------------------------------------------- command menu */
  var cmd, scrim, input, list, items = [], sel = 0, cmdWatch = null, lastFocus = null;
  function here() { var m = location.pathname.match(/\/(ipl|wpl|bbl|kabaddi)\//); return m ? m[1] : null; }
  function actions() {
    var a = [], cur = here();
    function add(t, k, fn, grp) { a.push({ t: t, k: k, fn: fn, g: grp || "On this page" }); }
    if (visible(d.getElementById("bid"))) add("Place the next bid", "B", function () { d.getElementById("bid").click(); });
    if (visible(d.getElementById("mk"))) add("Create a room", "", function () { var n = d.getElementById("nm"); if (n && !n.value) { n.focus(); toast("Add your name, then create"); } else d.getElementById("mk").click(); });
    if (d.getElementById("jc") && visible(d.getElementById("jc"))) add("Join a room with a code", "", function () { d.getElementById("jc").focus(); });
    if (d.getElementById("fxsnd")) add("Toggle sound", "M", function () { d.getElementById("fxsnd").click(); });
    if (visible(d.getElementById("chatb"))) add("Open chat", "C", function () { d.getElementById("chatb").click(); });
    var q = d.querySelector("#q,input[type=search]");
    if (q && visible(q)) add("Search players", "/", function () { q.focus(); q.select && q.select(); });
    if (cur) LEAGUES.forEach(function (l) { if (l.k === cur) l.p.forEach(function (p) { add(l.n + " · " + label(p), "", function () { location.href = href(l.k, p); }, l.n); }); });
    add("Power House hub", "", function () { location.href = ROOT; }, "Go to");
    LEAGUES.forEach(function (l) { if (l.k !== cur) l.p.forEach(function (p) { add(l.n + " · " + label(p), "", function () { location.href = href(l.k, p); }, "Go to"); }); });
    return a;
  }
  function score(t, q) {
    t = t.toLowerCase(); if (!q) return 1; if (t.indexOf(q) > -1) return 3 - t.indexOf(q) / 100;
    var i = 0; for (var c = 0; c < t.length && i < q.length; c++) if (t[c] === q[i]) i++;
    return i === q.length ? 1 : 0;
  }
  function draw() {
    var q = input.value.trim().toLowerCase(), all = actions();
    items = all.map(function (a) { return { a: a, s: score(a.t, q) }; }).filter(function (x) { return x.s > 0; });
    if (q) items.sort(function (x, y) { return y.s - x.s; });
    sel = Math.min(sel, Math.max(0, items.length - 1));
    var h = "", g = null;
    items.forEach(function (x, i) {
      if (!q && x.a.g !== g) { g = x.a.g; h += '<li class="grp" role="presentation">' + esc(g) + "</li>"; }
      h += '<li class="it' + (i === sel ? " sel" : "") + '" role="option" id="ux-o' + i + '" aria-selected="' + (i === sel) + '" data-i="' + i + '"><span>' + esc(x.a.t) + "</span>" + (x.a.k ? "<kbd>" + esc(x.a.k) + "</kbd>" : "") + "</li>";
    });
    list.innerHTML = h || '<li class="none">No matches</li>';
    input.setAttribute("aria-activedescendant", items.length ? "ux-o" + sel : "");
    var s = list.querySelector(".sel"); if (s) s.scrollIntoView({ block: "nearest" });
  }
  function buildCmd() {
    scrim = el("div", "ux-scrim"); cmd = el("div", "ux-cmd");
    cmd.setAttribute("role", "dialog"); cmd.setAttribute("aria-modal", "true"); cmd.setAttribute("aria-label", "Command menu");
    input = el("input"); input.type = "text"; input.placeholder = "Jump to a page or action…"; input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true"); input.setAttribute("aria-controls", "ux-list"); input.autocomplete = "off"; input.spellcheck = false;
    list = el("ul"); list.id = "ux-list"; list.setAttribute("role", "listbox");
    var foot = el("div", "foot", "<span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span><span style='margin-left:auto'><kbd>B</kbd> bid · <kbd>M</kbd> sound · <kbd>C</kbd> chat · <kbd>/</kbd> search</span>");
    cmd.appendChild(input); cmd.appendChild(list); cmd.appendChild(foot);
    d.body.appendChild(scrim); d.body.appendChild(cmd);
    scrim.onclick = closeCmd;
    input.addEventListener("input", function () { sel = 0; draw(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); run(sel); }
      else if (e.key === "Escape") { e.preventDefault(); closeCmd(); }
      else if (e.key === "Tab") e.preventDefault();
    });
    list.addEventListener("click", function (e) { var li = e.target.closest("li.it"); if (li) run(+li.dataset.i); });
    list.addEventListener("pointermove", function (e) { var li = e.target.closest("li.it"); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; list.querySelectorAll(".it").forEach(function (x) { x.classList.toggle("sel", +x.dataset.i === sel); }); } });
    swipeDismiss(cmd, closeCmd);
  }
  function run(i) { var x = items[i]; if (!x) return; closeCmd(); setTimeout(x.a.fn, 0); }
  function openCmd() {
    if (!cmd) buildCmd();
    if (cmd.classList.contains("on")) return;
    lastFocus = d.activeElement; input.value = ""; sel = 0; draw();
    scrim.classList.add("on"); cmd.classList.add("on");
    setTimeout(function () { input.focus(); }, 30);
    cmdWatch = watchClose(function () { cmdWatch = null; closeCmd(); });
  }
  function closeCmd() {
    if (!cmd || !cmd.classList.contains("on")) return;
    scrim.classList.remove("on"); cmd.classList.remove("on");
    if (cmdWatch) { var c = cmdWatch; cmdWatch = null; c.destroy(); }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  function trigger() {
    var t = el("button", "ux-trigger", '<span aria-hidden="true">⌕</span><span>Search</span><span class="ux-kbd">' + (MAC ? "⌘K" : "Ctrl K") + "</span>");
    t.type = "button"; t.setAttribute("aria-label", "Open command menu"); t.title = "Command menu (" + (MAC ? "⌘K" : "Ctrl+K") + ")";
    t.onclick = openCmd;
    var nav = d.querySelector(".un-in"), hub = d.querySelector("header.nav .nav-links");
    if (!nav && hub) { hub.parentNode.insertBefore(t, hub.nextSibling); t.classList.add("ux-trigger--hub"); return; }
    if (nav) { var hub = nav.querySelector(".un-hub"); nav.insertBefore(t, hub ? hub.nextSibling : nav.firstChild); t.style.marginLeft = "0"; }
    else { t.classList.add("ux-trigger--float"); d.body.appendChild(t); }
  }
  d.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); cmd && cmd.classList.contains("on") ? closeCmd() : openCmd(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (cmd && cmd.classList.contains("on")) return;
    if (e.key === "m" || e.key === "M") { var s = d.getElementById("fxsnd"); if (s) { e.preventDefault(); s.click(); toast(/on/i.test(s.textContent) ? "Sound on" : "Sound off", { ms: 1200 }); } }
    else if (e.key === "c" || e.key === "C") { var c = d.getElementById("chatb"); if (visible(c)) { e.preventDefault(); c.click(); } }
    else if (e.key === "?") { e.preventDefault(); openCmd(); }
  });

  /* ---------------------------------------- shortcut hints on existing UI */
  function hints() {
    if (!FINE) return;
    var q = d.querySelector("#q,input[type=search]");
    if (q && q.placeholder && q.placeholder.indexOf("(/)") < 0) q.placeholder += "  (/)";
    var s = d.getElementById("fxsnd"); if (s) s.title = "Sound (M)";
    var c = d.getElementById("chatb"); if (c) c.title = "Chat (C)";
    var b = d.getElementById("bid"); if (b) b.title = "Bid (B)";
  }

  /* --------------------------------------------------------- prerendering */
  /* Chromium prerenders a league page the moment you hover its link, so the
     click lands on a finished page. Play pages open live rooms, so they are
     only prefetched, never run ahead of time. */
  function speculate() {
    if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    var base = new URL(ROOT).pathname;
    var s = d.createElement("script"); s.type = "speculationrules";
    s.textContent = JSON.stringify({
      prerender: [{ where: { and: [{ href_matches: base + "*" }, { not: { href_matches: "*/play.html*" } }, { not: { href_matches: "*live-auction*" } }, { not: { selector_matches: "[target=_blank]" } }] }, eagerness: "moderate" }],
      prefetch: [{ where: { href_matches: "*/play.html*" }, eagerness: "moderate" }]
    });
    d.head.appendChild(s);
  }

  /* --------------------------------------- league menus with safe triangle */
  /* Hovering a league in the switcher opens its page list. Moving the mouse
     diagonally down towards that list may cross the next league; while the
     pointer stays inside the triangle from where it was to the list's top
     corners, the open menu is kept instead of switching. */
  function megaMenus() {
    if (!FINE) return;
    var sw = d.querySelector(".un-sw"); if (!sw) return;
    var menu = el("div", "ux-mega"); menu.setAttribute("role", "menu"); d.body.appendChild(menu);
    var openFor = null, pts = [], pend = null, closeT = null;
    function lg(a) { var m = (a.getAttribute("href") || "").match(/\/(ipl|wpl|bbl|kabaddi)\//); return m && LEAGUES.filter(function (l) { return l.k === m[1]; })[0]; }
    function show(a) {
      var l = lg(a); if (!l) return; clearTimeout(closeT);
      if (openFor !== a) {
        openFor = a;
        menu.innerHTML = '<div class="hd">' + esc(l.n) + "</div>" + l.p.map(function (p) { return '<a role="menuitem" href="' + href(l.k, p) + '">' + esc(label(p)) + "</a>"; }).join("");
        var r = a.getBoundingClientRect(); menu.style.left = Math.max(8, Math.min(r.left, innerWidth - 240)) + "px"; menu.style.top = (r.bottom + 10) + "px";
      }
      menu.classList.add("on");
    }
    function hide() { closeT = setTimeout(function () { menu.classList.remove("on"); openFor = null; }, 160); }
    function sign(p, a, b) { return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y); }
    function inTri(p, a, b, c) { var d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); }
    function aiming() {
      if (!menu.classList.contains("on") || pts.length < 2) return false;
      var r = menu.getBoundingClientRect(), from = pts[0], now = pts[pts.length - 1];
      return inTri(now, from, { x: r.left - 4, y: r.top }, { x: r.right + 4, y: r.top });
    }
    d.addEventListener("mousemove", function (e) { pts.push({ x: e.clientX, y: e.clientY }); if (pts.length > 4) pts.shift(); }, { passive: true });
    sw.querySelectorAll("a").forEach(function (a) {
      a.setAttribute("aria-haspopup", "menu");
      a.addEventListener("mouseenter", function () {
        clearTimeout(pend);
        if (openFor && openFor !== a && aiming()) { pend = setTimeout(function () { if (a.matches(":hover")) show(a); }, 220); return; }
        show(a);
      });
      a.addEventListener("mouseleave", function () { clearTimeout(pend); hide(); });
    });
    menu.addEventListener("mouseenter", function () { clearTimeout(closeT); clearTimeout(pend); });
    menu.addEventListener("mouseleave", hide);
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") { menu.classList.remove("on"); openFor = null; } });
    addEventListener("scroll", function () { menu.classList.remove("on"); openFor = null; }, { passive: true });
  }

  /* ------------------------------------------------------------- hit slop */
  /* Small tap targets get an invisible 8px halo, but only when that does not
     clash with the element's own positioning or pseudo-elements. */
  function hitSlop(root) {
    (root || d).querySelectorAll("a[href],button,[role=button],input[type=checkbox],input[type=radio]").forEach(function (e) {
      if (e.__uxHs) return; e.__uxHs = true;
      var r = e.getBoundingClientRect(); if (!r.width || (r.width >= 44 && r.height >= 44)) return;
      if (getComputedStyle(e).position !== "static") return;
      if (getComputedStyle(e, "::after").content !== "none") return;
      e.classList.add("ux-hs");
    });
  }

  /* ----------------------------------------------------------- BlurHash */
  var B83 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
  function d83(s) { var v = 0; for (var i = 0; i < s.length; i++) v = v * 83 + B83.indexOf(s[i]); return v; }
  function s2l(v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
  function l2s(v) { v = Math.max(0, Math.min(1, v)); return Math.round((v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055) * 255); }
  function sp(v, e) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e); }
  function blurhash(h, W, H) {
    var sz = d83(h[0]), nx = sz % 9 + 1, ny = Math.floor(sz / 9) + 1, mx = (d83(h[1]) + 1) / 166, C = [];
    for (var i = 0; i < nx * ny; i++) {
      if (!i) { var v = d83(h.substr(2, 4)); C.push([s2l(v >> 16), s2l(v >> 8 & 255), s2l(v & 255)]); }
      else { var q = d83(h.substr(4 + i * 2, 2)); C.push([sp((Math.floor(q / 361) - 9) / 9, 2) * mx, sp((Math.floor(q / 19) % 19 - 9) / 9, 2) * mx, sp((q % 19 - 9) / 9, 2) * mx]); }
    }
    var c = d.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d"), img = x.createImageData(W, H);
    for (var y = 0; y < H; y++) for (var X = 0; X < W; X++) {
      var r = 0, g = 0, b = 0;
      for (var j = 0; j < ny; j++) for (var k = 0; k < nx; k++) {
        var f = Math.cos(Math.PI * X * k / W) * Math.cos(Math.PI * y * j / H), cc = C[k + j * nx]; r += cc[0] * f; g += cc[1] * f; b += cc[2] * f;
      }
      var o = 4 * (X + y * W); img.data[o] = l2s(r); img.data[o + 1] = l2s(g); img.data[o + 2] = l2s(b); img.data[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }
  function blurhashes() {
    d.querySelectorAll("[data-blurhash]").forEach(function (e) {
      try { e.style.backgroundImage = "url(" + blurhash(e.getAttribute("data-blurhash"), 24, 32) + ")"; } catch (err) {}
    });
  }

  /* ---------------------------------------------------- room-code field */
  /* Behaves like a one-time-code box: iOS can offer a code a friend texted,
     typing normalises to PH-XXXXX, Enter joins, a pasted message containing
     a code fills it, and ?room=PH-XXXXX links pre-fill it. */
  function roomCode() {
    var jc = d.getElementById("jc"), jb = d.getElementById("jb"); if (!jc) return;
    jc.setAttribute("autocomplete", "one-time-code"); jc.setAttribute("inputmode", "text");
    jc.setAttribute("autocapitalize", "characters"); jc.setAttribute("enterkeyhint", "go"); jc.spellcheck = false;
    jc.setAttribute("aria-label", "Room code");
    var RX = /\bPH-?([A-Z0-9]{4,8})\b/i;
    function norm(v) { v = v.toUpperCase().replace(/\s+/g, ""); var m = /^PH-?([A-Z0-9]{4,8})$/.exec(v); return m ? "PH-" + m[1] : v; }
    jc.addEventListener("input", function () { var v = norm(jc.value); if (v !== jc.value) { jc.value = v; try { jc.setSelectionRange(v.length, v.length); } catch (e) {} } });
    jc.addEventListener("keydown", function (e) { if (e.key === "Enter" && jb) { e.preventDefault(); jb.click(); } });
    d.addEventListener("paste", function (e) {
      if (typing(e.target) || !visible(jc)) return;
      var t = (e.clipboardData || w.clipboardData).getData("text"), m = RX.exec(t || "");
      if (m) { e.preventDefault(); jc.value = "PH-" + m[1].toUpperCase(); jc.focus(); toast("Room code pasted · press Enter to join"); }
    });
    var q = new URLSearchParams(location.search).get("room");
    if (q && RX.test(q)) { jc.value = norm(q); setTimeout(function () { jc.focus(); jc.scrollIntoView({ block: "center" }); }, 400); }
  }

  /* A cross-page view transition that the browser skips (tab hidden, page
     prerendered) rejects its promises; that is expected, not an error. */
  ["pagereveal", "pageswap"].forEach(function (ev) {
    addEventListener(ev, function (e) {
      var vt = e.viewTransition; if (!vt) return;
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { if (p && p.catch) p.catch(function () {}); });
    });
  });

  /* --------------------------------------------------------------- boot */
  w.UX = { toast: toast, open: openCmd, close: closeCmd, swipeDismiss: swipeDismiss, watchClose: watchClose };
  function boot() {
    trigger(); hints(); speculate(); megaMenus(); hookSheets(); blurhashes(); roomCode();
    setTimeout(function () { hitSlop(); }, 600);
    var mo = new MutationObserver(function () { if (mo.t) return; mo.t = setTimeout(function () { mo.t = 0; hitSlop(); hookSheets(); }, 500); });
    mo.observe(d.body, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})();
