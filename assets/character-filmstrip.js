/* Character Filmstrip from ThreeUI (@designcodeio/threeui, MIT), variant
   "filmstrip", source SHA-256 4c98939e0e2b. The page below is the authored
   source unchanged except for its sample people, which are replaced by the
   players in the room. mount() is a plain-JS port of <CharacterCarousel />:
   the same sandboxed iframe, injected clock/scale controls, pause when hidden,
   and opacity/hue/saturation/brightness filter props. */
(function () {
  "use strict";
  var SOURCE = "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#d8c9ad\">\n  <title>Character Filmstrip</title>\n  <style>\n    :root {\n      color-scheme: light;\n      font-family: \"Arial Narrow\", \"Helvetica Neue\", Arial, sans-serif;\n      background: #d8c9ad;\n    }\n\n    * {\n      box-sizing: border-box;\n    }\n\n    html,\n    body {\n      width: 100%;\n      height: 100%;\n      margin: 0;\n      overflow: hidden;\n      background: #d8c9ad;\n    }\n\n    body {\n      user-select: none;\n      -webkit-tap-highlight-color: transparent;\n    }\n\n    button {\n      font: inherit;\n    }\n\n    .stage {\n      --pointer-x: 50%;\n      position: relative;\n      width: 100%;\n      height: 100%;\n      min-height: 440px;\n      overflow: hidden;\n      isolation: isolate;\n      perspective: 1450px;\n      cursor: ew-resize;\n      touch-action: none;\n      background:\n        linear-gradient(90deg, rgba(80, 58, 31, 0.08) 1px, transparent 1px) 50% 0 / 25% 100%,\n        repeating-linear-gradient(\n          0deg,\n          transparent 0,\n          transparent 109px,\n          rgba(72, 52, 30, 0.13) 110px,\n          transparent 111px\n        ),\n        radial-gradient(circle at var(--pointer-x) 48%, rgba(255, 246, 220, 0.78), transparent 34%),\n        #d8c9ad;\n    }\n\n    .stage::before {\n      content: \"\";\n      position: absolute;\n      inset: 0;\n      z-index: 5;\n      pointer-events: none;\n      opacity: 0.27;\n      background:\n        repeating-radial-gradient(circle at 12% 18%, rgba(71, 51, 30, 0.17) 0 0.5px, transparent 0.7px 4px),\n        repeating-radial-gradient(circle at 78% 71%, rgba(255, 255, 255, 0.35) 0 0.5px, transparent 0.8px 5px);\n      mix-blend-mode: multiply;\n    }\n\n    .stage::after {\n      content: \"\";\n      position: absolute;\n      inset: 0;\n      z-index: 4;\n      pointer-events: none;\n      background: linear-gradient(\n        90deg,\n        rgba(84, 58, 29, 0.19),\n        transparent 14%,\n        transparent 86%,\n        rgba(84, 58, 29, 0.19)\n      );\n    }\n\n    .deck {\n      position: absolute;\n      inset: 0;\n      z-index: 2;\n      transform-style: preserve-3d;\n    }\n\n    .card {\n      --focus: 0;\n      position: absolute;\n      top: 50%;\n      left: 50%;\n      width: clamp(154px, 16.8vw, 238px);\n      aspect-ratio: 0.72;\n      padding: 7px;\n      overflow: hidden;\n      border: 1px solid rgba(47, 34, 19, 0.42);\n      border-radius: 4px;\n      color: #f3e7ce;\n      background: #e7d9bd;\n      box-shadow:\n        0 calc(10px + var(--focus) * 24px) calc(18px + var(--focus) * 36px)\n          rgba(57, 38, 19, calc(0.2 + var(--focus) * 0.26)),\n        inset 0 0 0 1px rgba(255, 255, 255, 0.64);\n      appearance: none;\n      outline: none;\n      transform-style: preserve-3d;\n      will-change: transform, opacity, filter;\n      cursor: pointer;\n    }\n\n    .card::before {\n      content: \"\";\n      position: absolute;\n      inset: 5px;\n      z-index: 3;\n      border: 1px solid rgba(28, 22, 14, calc(0.12 + var(--focus) * 0.12));\n      pointer-events: none;\n    }\n\n    .card:focus-visible {\n      box-shadow:\n        0 26px 50px rgba(57, 38, 19, 0.42),\n        0 0 0 4px rgba(197, 79, 25, 0.34);\n    }\n\n    .portrait {\n      position: absolute;\n      inset: 7px 7px 25%;\n      overflow: hidden;\n      background: #766a58;\n    }\n\n    .portrait img {\n      display: block;\n      width: 100%;\n      height: 100%;\n      object-fit: cover;\n      transform: scale(calc(1.04 + (1 - var(--focus)) * 0.06));\n      filter:\n        sepia(calc((1 - var(--focus)) * 0.24))\n        saturate(calc(0.66 + var(--focus) * 0.34))\n        contrast(1.04);\n    }\n\n    .footer {\n      position: absolute;\n      right: 7px;\n      bottom: 7px;\n      left: 7px;\n      height: calc(25% - 7px);\n      display: grid;\n      grid-template-columns: clamp(26px, 3.2vw, 43px) 1fr;\n      align-items: center;\n      gap: clamp(6px, 0.7vw, 11px);\n      padding: clamp(7px, 0.8vw, 12px);\n      color: #f0dfc2;\n      background: #171612;\n      text-align: left;\n    }\n\n    .index {\n      display: grid;\n      width: clamp(23px, 2.7vw, 37px);\n      aspect-ratio: 1;\n      place-items: center;\n      border: 1px solid #ce5d20;\n      border-radius: 50%;\n      color: #d86724;\n      font: 600 clamp(7px, 0.68vw, 11px)/1 ui-monospace, \"SFMono-Regular\", monospace;\n    }\n\n    .meta {\n      min-width: 0;\n    }\n\n    .name,\n    .role {\n      display: block;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      text-transform: uppercase;\n      white-space: nowrap;\n    }\n\n    .name {\n      color: #f3e6cc;\n      font-size: clamp(8px, 0.86vw, 13px);\n      font-weight: 800;\n      letter-spacing: 0.08em;\n      line-height: 1.1;\n    }\n\n    .role {\n      margin-top: clamp(3px, 0.35vw, 5px);\n      color: #d46a27;\n      font-size: clamp(5px, 0.48vw, 7px);\n      font-weight: 700;\n      letter-spacing: 0.15em;\n      line-height: 1;\n    }\n\n    .sr-only {\n      position: absolute;\n      width: 1px;\n      height: 1px;\n      padding: 0;\n      margin: -1px;\n      overflow: hidden;\n      clip: rect(0, 0, 0, 0);\n      white-space: nowrap;\n      border: 0;\n    }\n\n    @media (max-width: 650px) {\n      .stage {\n        min-height: 560px;\n        cursor: ns-resize;\n        background:\n          linear-gradient(90deg, rgba(80, 58, 31, 0.08) 1px, transparent 1px) 50% 0 / 50% 100%,\n          repeating-linear-gradient(\n            0deg,\n            transparent 0,\n            transparent 87px,\n            rgba(72, 52, 30, 0.13) 88px,\n            transparent 89px\n          ),\n          radial-gradient(circle at 50% 50%, rgba(255, 246, 220, 0.78), transparent 35%),\n          #d8c9ad;\n      }\n\n      .card {\n        width: clamp(142px, 47vw, 180px);\n      }\n    }\n\n    @media (prefers-reduced-motion: reduce) {\n      .card {\n        will-change: auto;\n      }\n    }\n  </style>\n</head>\n<body>\n  <main class=\"stage\" id=\"stage\" aria-label=\"Interactive editorial character filmstrip\">\n    <h1 class=\"sr-only\">Character Filmstrip</h1>\n    <p class=\"sr-only\">Move, scroll, or use the arrow keys to browse the portraits.</p>\n    <div class=\"deck\" id=\"deck\" data-testid=\"filmstrip\"></div>\n  </main>\n\n  <script>\n    (() => {\n      const portraits = __PH_PORTRAITS__;\n\n      const profiles = __PH_PROFILES__.map(([name, role, portrait]) => ({ name, role, portrait }));\n\n      const stage = document.querySelector(\"#stage\");\n      const deck = document.querySelector(\"#deck\");\n      const cards = profiles.map((profile, index) => {\n        const card = document.createElement(\"button\");\n        card.className = \"card\";\n        card.type = \"button\";\n        card.dataset.index = String(index);\n        card.setAttribute(\"aria-label\", `Focus ${profile.name}, ${profile.role}`);\n        card.innerHTML = `\n          <span class=\"portrait\">\n            <img src=\"${portraits[profile.portrait]}\" alt=\"Portrait of ${profile.name}\">\n          </span>\n          <span class=\"footer\">\n            <span class=\"index\">${String(index + 1).padStart(2, \"0\")}</span>\n            <span class=\"meta\">\n              <span class=\"name\">${profile.name}</span>\n              <span class=\"role\">${profile.role}</span>\n            </span>\n          </span>`;\n        deck.append(card);\n        return card;\n      });\n\n      const count = cards.length;\n      const reducedMotion = matchMedia(\"(prefers-reduced-motion: reduce)\").matches;\n      const state = {\n        phase: 3,\n        target: 3,\n        base: 3,\n        pointerX: 0,\n        pointerY: 0,\n        active: false,\n        lastInput: performance.now()\n      };\n\n      function wrappedDelta(index, phase) {\n        let delta = index - phase;\n        while (delta > count / 2) delta -= count;\n        while (delta < -count / 2) delta += count;\n        return delta;\n      }\n\n      function nearestIndex() {\n        return (Math.round(state.phase) % count + count) % count;\n      }\n\n      function moveTo(index) {\n        const current = nearestIndex();\n        let delta = index - current;\n        if (delta > count / 2) delta -= count;\n        if (delta < -count / 2) delta += count;\n        state.base += delta;\n        state.target = state.base;\n        state.active = false;\n        state.lastInput = performance.now();\n      }\n\n      cards.forEach((card, index) => {\n        card.addEventListener(\"click\", () => moveTo(index));\n        card.addEventListener(\"focus\", () => moveTo(index));\n      });\n\n      stage.addEventListener(\"pointermove\", (event) => {\n        const rect = stage.getBoundingClientRect();\n        const nx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));\n        const ny = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));\n        state.pointerX = nx;\n        state.pointerY = ny;\n        state.active = true;\n        state.target = state.base + (innerWidth < 650 ? ny * 2.2 : nx * 3.1);\n        state.lastInput = performance.now();\n        stage.style.setProperty(\"--pointer-x\", `${(nx + 1) * 50}%`);\n      });\n\n      stage.addEventListener(\"pointerleave\", () => {\n        state.active = false;\n        state.pointerX = 0;\n        state.pointerY = 0;\n        state.target = state.base;\n        stage.style.setProperty(\"--pointer-x\", \"50%\");\n      });\n\n      stage.addEventListener(\"wheel\", (event) => {\n        event.preventDefault();\n        const direction = Math.sign(Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX);\n        if (!direction) return;\n        state.base += direction;\n        state.target = state.base;\n        state.active = false;\n        state.lastInput = performance.now();\n      }, { passive: false });\n\n      addEventListener(\"keydown\", (event) => {\n        const forward = event.key === \"ArrowRight\" || event.key === \"ArrowDown\";\n        const backward = event.key === \"ArrowLeft\" || event.key === \"ArrowUp\";\n        if (!forward && !backward) return;\n        event.preventDefault();\n        state.base += forward ? 1 : -1;\n        state.target = state.base;\n        state.active = false;\n        state.lastInput = performance.now();\n      });\n\n      let previousTime = performance.now();\n\n      function render(time) {\n        const deltaTime = Math.min(32, time - previousTime);\n        previousTime = time;\n        const ease = reducedMotion ? 1 : 1 - Math.pow(0.001, deltaTime / 1000);\n\n        if (!state.active && time - state.lastInput > 3600) {\n          const idle = time - state.lastInput - 3600;\n          state.target = state.base + Math.sin(idle * 0.00042) * 2.45;\n        }\n\n        state.phase += (state.target - state.phase) * ease;\n        const compact = innerWidth < 650;\n        const activeIndex = nearestIndex();\n        const horizontalSpacing = Math.min(168, Math.max(112, innerWidth * 0.116));\n        const verticalSpacing = Math.min(122, Math.max(88, innerHeight * 0.112));\n\n        cards.forEach((card, index) => {\n          const delta = wrappedDelta(index, state.phase);\n          const distance = Math.abs(delta);\n          const focus = Math.exp(-distance * distance * 1.28);\n          const side = Math.max(0, 1 - distance / 5);\n          const direction = Math.sign(delta);\n          const x = compact\n            ? delta * 24 + Math.sin(delta * 0.9) * 25\n            : delta * horizontalSpacing;\n          const y = compact\n            ? delta * verticalSpacing\n            : distance * 8 + state.pointerY * focus * 10;\n          const z = focus * 145 - distance * 148;\n          const scale = 0.54 + side * 0.15 + focus * 0.54;\n          const rotateX = compact ? delta * 2.1 : -state.pointerY * focus * 3.5;\n          const rotateY = compact\n            ? -delta * 5\n            : -direction * (distance > 0.2 ? 14 + Math.min(distance, 3) * 5 : 0) + state.pointerX * focus * 3;\n          const rotateZ = compact ? delta * -1.4 : delta * 0.7;\n\n          card.style.setProperty(\"--focus\", focus.toFixed(4));\n          card.style.zIndex = String(Math.round(1000 - distance * 100));\n          card.style.opacity = String(Math.max(0.13, side * 0.76 + focus * 0.24));\n          card.style.filter = `blur(${Math.max(0, distance - 1.5) * 0.38}px)`;\n          card.style.transform = [\n            \"translate(-50%, -50%)\",\n            `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px)`,\n            `rotateX(${rotateX.toFixed(2)}deg)`,\n            `rotateY(${rotateY.toFixed(2)}deg)`,\n            `rotateZ(${rotateZ.toFixed(2)}deg)`,\n            `scale(${scale.toFixed(4)})`\n          ].join(\" \");\n          card.setAttribute(\"aria-current\", index === activeIndex ? \"true\" : \"false\");\n        });\n\n        requestAnimationFrame(render);\n      }\n\n      requestAnimationFrame(render);\n    })();\n  </script>\n</body>\n</html>\n";

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function buildFocusedDocument(portraits, profiles) {
    var focusStyles = '<style data-character-carousel-focus>\n' +
      ':root { --character-carousel-scale: 1; }\n' +
      'html, body, .stage { width: 100%; height: 100%; margin: 0; overflow: hidden; }\n' +
      '.stage { min-height: 0 !important; }\n' +
      '.deck { transform: scale(var(--character-carousel-scale)); transform-origin: 50% 50%; }\n' +
      '</style>';
    var controls = '<script data-character-carousel-controls>\n' +
      '(function () {\n' +
      '  var nativeFrame = window.requestAnimationFrame.bind(window);\n' +
      '  var clock = { real: null, virtual: null };\n' +
      '  var controls = window.__CHARACTER_CAROUSEL_CONTROLS = { speed: 1, scale: 1, paused: false };\n' +
      '  window.__CHARACTER_CAROUSEL_NOW = function () {\n' +
      '    return clock.virtual === null ? performance.now() : clock.virtual;\n' +
      '  };\n' +
      '  window.requestAnimationFrame = function (callback) {\n' +
      '    function tick(realTime) {\n' +
      '      if (clock.real === null) {\n' +
      '        clock.real = realTime;\n' +
      '        clock.virtual = realTime;\n' +
      '      } else {\n' +
      '        if (!controls.paused) clock.virtual += (realTime - clock.real) * controls.speed;\n' +
      '        clock.real = realTime;\n' +
      '      }\n' +
      '      if (controls.paused) {\n' +
      '        return nativeFrame(tick);\n' +
      '      }\n' +
      '      callback(clock.virtual);\n' +
      '    }\n' +
      '    return nativeFrame(tick);\n' +
      '  };\n' +
      "  window.addEventListener('message', function (event) {\n" +
      "    if (!event.data || event.data.type !== 'character-carousel-controls') return;\n" +
      '    var next = event.data.controls || {};\n' +
      '    if (Number.isFinite(next.speed)) controls.speed = Math.max(0, Math.min(2.5, next.speed));\n' +
      '    if (Number.isFinite(next.scale)) controls.scale = Math.max(0.7, Math.min(1.3, next.scale));\n' +
      '    controls.paused = Boolean(next.paused);\n' +
      "    document.documentElement.style.setProperty('--character-carousel-scale', String(controls.scale));\n" +
      '  });\n' +
      '})();\n' +
      '</scr' + 'ipt>';
    // JSON in a script: close-tag sequences must not end the script early
    function data(v) { return JSON.stringify(v).replace(/</g, "\\u003c"); }
    return SOURCE
      .split("performance.now()").join("window.__CHARACTER_CAROUSEL_NOW()")
      .replace("__PH_PORTRAITS__", function () { return data(portraits); })
      .replace("__PH_PROFILES__", function () { return data(profiles); })
      .replace(/<script[^>]+cloudflareinsights\.com[^>]*><\/script>/gi, "")
      .replace("</head>", function () { return focusStyles + controls + "</head>"; });
  }

  /* opts: { portraits: {key: dataURI}, profiles: [[name, role, portraitKey], ...] in lot order,
     speed, scale, opacity, hue, saturation, brightness } */
  function mount(host, opts) {
    opts = opts || {};
    var speed = clamp(opts.speed == null ? 1 : opts.speed, 0, 2.5);
    var scale = clamp(opts.scale == null ? 1 : opts.scale, 0.7, 1.3);
    var hostVisible = true, docVisible = !document.hidden;

    var box = document.createElement("div");
    box.className = "threeui-background character-carousel character-carousel--filmstrip";
    box.style.background = "#d8c9ad"; box.style.pointerEvents = "auto";
    var frame = document.createElement("iframe");
    frame.title = "Interactive character filmstrip";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.srcdoc = buildFocusedDocument(opts.portraits || {}, opts.profiles || []);
    var f = frame.style;
    f.position = "absolute"; f.inset = "0"; f.display = "block"; f.width = "100%"; f.height = "100%"; f.border = "0";
    f.background = "#d8c9ad";
    f.opacity = String(clamp(opts.opacity == null ? 1 : opts.opacity, 0.05, 1));
    f.filter = "hue-rotate(" + clamp(opts.hue || 0, -180, 180) + "deg) saturate(" + clamp(opts.saturation == null ? 1 : opts.saturation, 0, 2) +
      ") brightness(" + clamp(opts.brightness == null ? 1 : opts.brightness, 0.35, 1.65) + ")";
    box.appendChild(frame); host.appendChild(box);

    function post() {
      if (!frame.contentWindow) return;
      frame.contentWindow.postMessage({ type: "character-carousel-controls",
        controls: { speed: speed, scale: scale, paused: !hostVisible || !docVisible || speed === 0 } }, "*");
    }
    frame.addEventListener("load", post);
    var io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(function (e) { hostVisible = e[0] ? e[0].isIntersecting : true; post(); });
    if (io) io.observe(frame);
    function vis() { docVisible = !document.hidden; post(); }
    document.addEventListener("visibilitychange", vis);
    return { el: box, destroy: function () { if (io) io.disconnect(); document.removeEventListener("visibilitychange", vis); box.remove(); } };
  }

  window.PHFilmstrip = { mount: mount };
})();
