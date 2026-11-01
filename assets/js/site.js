/* base.js — small stand-ins for behaviour that every classic Wix site gets from Wix's own
   script. Each site adds its own extras after this (custom/<site>/site.js). */
(function () {
  'use strict';

  // Menu hover colours: Wix styles the hovered menu button through data-state="… over".
  document.querySelectorAll('.wixui-dropdown-menu__item').forEach(function (li) {
    function set(on) {
      var st = (li.getAttribute('data-state') || '').split(/\s+/).filter(function (x) { return x && x !== 'over'; });
      if (on) st.push('over');
      li.setAttribute('data-state', st.join(' '));
    }
    li.addEventListener('mouseenter', function () { set(true); });
    li.addEventListener('mouseleave', function () { set(false); });
  });

  // Videos that play by themselves on Wix (background videos, autoplay video boxes).
  document.querySelectorAll('video[autoplay]').forEach(function (v) {
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });

  // "Back to top" arrow on phones: appears after scrolling, takes you to the top.
  var btt = document.getElementById('BACK_TO_TOP_BUTTON');
  if (btt) {
    var show = function () {
      var on = window.scrollY > window.innerHeight * 0.5;
      btt.style.opacity = on ? '1' : '0';
      btt.style.visibility = on ? 'visible' : 'hidden';
      btt.style.transition = 'opacity .3s';
    };
    window.addEventListener('scroll', show, { passive: true });
    show();
    btt.style.cursor = 'pointer';
    btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // Links to a spot on the same page glide there, as on Wix.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname.replace(/\/(m\.html)?$/, '') !== location.pathname.replace(/\/(m\.html)?$/, '')) return;
    var target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', url.hash);
  });
})();

/* custom/enox.cz/site.js — behaviour that Wix's own script provided on enox.cz.
   Runs after tools/base.js (shared). Plain browser JavaScript, no libraries. */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var isPhone = html.getAttribute('data-device') === 'mobile';

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function toggleClass(el, cls, on) { if (!el) return; if (on) el.classList.add(cls); else el.classList.remove(cls); }

  /* "/enox.cz/nyx", "/enox.cz/nyx/", "/enox.cz/nyx/index.html", "/enox.cz/nyx/m.html" are all the page /enox.cz/nyx */
  function pageKey(p) {
    p = p.replace(/\/(index|m)\.html$/, '').replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }
  var here = pageKey(location.pathname.replace(/^\/enox\.cz(?=\/|$)/, ''));

  function pageHeight() { return Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0); }
  function maxScroll() { return Math.max(0, pageHeight() - window.innerHeight); }
  function scrollSmooth(y) {
    try { window.scrollTo({ top: y, left: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, y); }
  }
  function absTop(el) { return el.getBoundingClientRect().top + (window.pageYOffset || 0); }

  /* Anchor links on Wix glide with their own timing (measured on the live site):
     about 0.7 s + 0.27 ms per pixel, at most 3.2 s, slow start and a long soft landing. */
  var CURVE = [[0, 0], [0.21, 0.1], [0.36, 0.25], [0.54, 0.5], [0.73, 0.75], [0.855, 0.9], [1, 1]];
  function curve(t) {
    for (var i = 1; i < CURVE.length; i++) {
      if (t <= CURVE[i][0]) {
        var a = CURVE[i - 1], b = CURVE[i];
        return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      }
    }
    return 1;
  }
  var glideId = 0;
  function glideTo(y) {
    var from = window.pageYOffset || 0;
    var dist = Math.abs(y - from);
    cancelAnimationFrame(glideId);
    if (dist < 1) return;
    var dur = Math.min(3200, 700 + 0.265 * dist);
    var t0 = null;
    function stop() {
      cancelAnimationFrame(glideId);
      window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); window.removeEventListener('keydown', stop);
    }
    function step(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, Math.max(0, (now - t0 - 10) / dur));
      window.scrollTo(0, from + (y - from) * curve(t));
      if (t < 1) glideId = requestAnimationFrame(step); else stop();
    }
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    glideId = requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------- language switching
     The other language version of the current page is named in the page head (hreflang). */
  function alternatePath(lang) {
    var links = $$('link[rel="alternate"][hreflang]');
    for (var i = 0; i < links.length; i++) {
      var h = (links[i].getAttribute('hreflang') || '').toLowerCase();
      if (h.indexOf(lang) === 0) {
        try { return new URL(links[i].href, location.href).pathname.replace(/^\/enox\.cz(?=\/|$)/, '') || '/'; } catch (e) { /* next */ }
      }
    }
    /* pages without hreflang tags (/enox.cz/copy-of-home-1): the Czech version is the same address under /enox.cz/cs */
    var isCs = /^\/cs(\/|$)/.test(here);
    if (lang === 'cs') return isCs ? here : (here === '/' ? '/cs' : '/cs' + here);
    return isCs ? (here.replace(/^\/cs/, '') || '/') : here;
  }
  function goLanguage(lang) { location.href = '/enox.cz' + alternatePath(lang); }

  /* desktop: language drop-down (opens on click, closes on a click anywhere else) */
  (function () {
    var box = $('[data-testid="language-selector-container"]');
    if (!box) return;
    var wrap = $('[data-testid="languages-dropdown-handle-container"]', box);
    var handle = $('[data-testid="languages-dropdown-handle"]', box);
    if (!wrap || !handle) return;
    var current = /^\/cs(\/|$)/.test(here) ? 'cs' : 'en';
    function set(on) {
      toggleClass(wrap, 'FDTMKK', on);
      handle.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    function isOpen() { return wrap.classList.contains('FDTMKK'); }
    handle.addEventListener('click', function (e) { e.stopPropagation(); set(!isOpen()); });
    $$('[role="menuitem"]', box).forEach(function (opt) {
      var code = (opt.getAttribute('data-testid') || '').replace('dropdown-option-', '');
      function pick(e) {
        e.stopPropagation();
        if (code === current) { set(false); return; }
        goLanguage(code);
      }
      opt.addEventListener('click', pick);
      opt.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    });
    /* arrow keys move between the other languages, like on Wix */
    var others = $$('[role="menuitem"]', box).filter(function (o) {
      return (o.getAttribute('data-testid') || '').replace('dropdown-option-', '') !== current;
    });
    function arrow(e, step) {
      if (!others.length) return;
      e.preventDefault();
      /* Wix: the first arrow key on the closed list only opens it, the next one moves to a language */
      if (!isOpen()) { set(true); return; }
      var i = others.indexOf(doc.activeElement);
      i = i < 0 ? (step > 0 ? 0 : others.length - 1) : (i + step + others.length) % others.length;
      others[i].focus();
    }
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') arrow(e, 1);
      else if (e.key === 'ArrowUp') arrow(e, -1);
    });
    doc.addEventListener('click', function (e) { if (isOpen() && !box.contains(e.target)) set(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { set(false); handle.focus(); } });
  })();

  /* phone: language <select> inside the opened menu */
  $$('[data-testid="tinymenu-languagesection"] select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var cur = /^\/cs(\/|$)/.test(here) ? 'cs' : 'en';
      if (sel.value !== cur) goLanguage(sel.value);
    });
  });

  /* ---------------------------------------------------------------- phone menu (TINY_MENU) */
  (function () {
    var nav = $('#TINY_MENU');
    if (!nav) return;
    var btn = $('[data-testid="tinymenu-menubutton"]', nav);
    if (!btn) return;
    function isOpen() { return nav.classList.contains('r_7KEv'); }
    /* Wix only creates the menu items when the menu opens. Ours are always in the page, so while the menu is closed
       they are hidden from the keyboard (Tab) and screen readers — after the closing slide has finished. */
    var overlay = $('.fullScreenOverlay', nav), hideT = null;
    function hideItems(on) { if (overlay) overlay.style.visibility = on ? 'hidden' : ''; }
    hideItems(true);
    function set(on) {
      clearTimeout(hideT);
      if (on) hideItems(false); else hideT = setTimeout(function () { if (!isOpen()) hideItems(true); }, 450);
      toggleClass(nav, 'r_7KEv', on);
      toggleClass(doc.body, 'siteScrollingBlocked', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!isOpen()); });
    nav.addEventListener('click', function (e) {
      if (!isOpen()) return;
      var t = e.target;
      /* a click on the dimmed part of the page closes the menu, a click on the panel itself does not */
      if (t.classList && (t.classList.contains('fullScreenOverlay') || t.classList.contains('fullScreenOverlayContent'))) { set(false); return; }
      var a = t.closest ? t.closest('a') : null;
      if (a) set(false); /* the link itself does the rest (see the click handler for same-page links below) */
    });
  })();

  /* ---------------------------------------------------------------- "Skip to Main Content" (keyboard users)
     Wix moves the focus to the page content and scrolls so that it starts at the top of the window. */
  (function () {
    var skip = $('#SKIP_TO_CONTENT_BTN');
    var main = $('#PAGES_CONTAINER');
    if (!skip || !main) return;
    skip.addEventListener('click', function () {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      window.scrollTo(0, Math.min(absTop(main), maxScroll()));
    });
  })();

  /* ---------------------------------------------------------------- links */
  doc.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var target = a.getAttribute('target');
    if (target && target !== '_self') return;
    var href = a.getAttribute('href');
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || pageKey(url.pathname.replace(/^\/enox\.cz(?=\/|$)/, '')) !== here) return;

    /* link to a spot (anchor) on this page: Wix scrolls so the anchor sits at the top */
    var compId = a.getAttribute('data-anchor-comp-id');
    if (compId) {
      e.preventDefault();
      var y;
      if (compId === 'PAGE_TOP_ANCHOR' || compId === 'SCROLL_TO_TOP') y = 0;
      else {
        var el = doc.getElementById(compId);
        if (!el) return;
        y = absTop(el);
      }
      glideTo(Math.min(y, maxScroll()));
      return;
    }
    /* link to this very page without a hash (menu "SYNOPSIS" / "CONTACT" on the home page): back to the top */
    if (!url.hash) {
      e.preventDefault();
      window.scrollTo(0, 0);
    }
  });

  /* ---------------------------------------------------------------- anchor menu (home page, right side)
     Marks the section that is on screen. Wix does it with class kE2kBL on the link. */
  (function () {
    var menu = $('nav.wixui-anchor-menu');
    if (!menu) return;
    var items = $$('a[data-anchor-comp-id]', menu).map(function (a) {
      return { a: a, id: a.getAttribute('data-anchor-comp-id') };
    });
    var footerItem = null;
    var list = [];
    items.forEach(function (it) {
      if (it.id === 'SITE_FOOTER') footerItem = it;
      else if (it.id !== 'PAGE_TOP_ANCHOR') { it.el = doc.getElementById(it.id); if (it.el) list.push(it); }
    });
    var header = $('#SITE_HEADER');
    var ticking = false;
    function update() {
      ticking = false;
      var sy = window.pageYOffset || 0;
      var headerH = header ? header.getBoundingClientRect().height : 0;
      var line = sy + headerH;
      var active = null;
      if (sy > 0 && sy >= maxScroll() - 1) active = footerItem;   /* at the very bottom only the footer item can be lit (none if there is no such item, as on /enox.cz/cs) */
      else {
        var best = null;
        list.forEach(function (it) {
          var top = absTop(it.el);
          if (top < headerH) return;            /* anchors hidden behind the header at the top never light up */
          if (top <= line + 0.5 && (!best || top >= best.top)) best = { it: it, top: top };
        });
        if (best) {
          var sec = best.it.el.closest('section');
          var end = sec ? absTop(sec) + sec.getBoundingClientRect().height : pageHeight();
          if (line < end) active = best.it;
        }
      }
      items.forEach(function (it) { toggleClass(it.a, 'kE2kBL', it === active); });
    }
    function req() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    window.addEventListener('load', req);
    update();
  })();

  /* ---------------------------------------------------------------- back-to-top arrow (phone)
     Measured on Wix: a scroll once you are past the first screen shows the arrow after about 0.1 s,
     and it goes away again exactly 3 s after it appeared - whatever you do in between (scrolling on,
     or back up to the top). The next scroll shows it again. */
  (function () {
    var old = $('#BACK_TO_TOP_BUTTON');
    if (!old) return;
    var btt = old.cloneNode(true);       /* a clean copy: drops the simpler handlers from base.js */
    btt.removeAttribute('style');
    old.parentNode.replaceChild(btt, old);
    var pending = false, shown = false;
    function onScroll() {
      if (pending || shown) return;
      if ((window.pageYOffset || 0) < window.innerHeight - 2) return;
      pending = true;
      setTimeout(function () {
        pending = false; shown = true;
        btt.classList.add('z7UpAt');
        setTimeout(function () { shown = false; btt.classList.remove('z7UpAt'); }, 3000);
      }, 100);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    btt.addEventListener('click', function (e) { e.preventDefault(); scrollSmooth(0); });
    btt.style.cursor = 'pointer';
  })();

  /* ---------------------------------------------------------------- video boxes (wixui-video-box)
     Click = play/pause, speaker button = sound on/off, hover shows the controls, poster fades out
     as soon as the video can play. */
  $$('.wixui-video-box').forEach(function (box) {
    var v = $('video', box);
    if (!v) return;
    var poster = $('.bgVideoposter', box);
    var surface = $('[role="button"][aria-pressed]', box);              /* the whole picture */
    var audio = $('[data-testid="vb-audio"]', box);
    function ready() {
      box.setAttribute('data-can-play', '');
      v.style.opacity = '1';
      if (poster) poster.style.opacity = '0';
    }
    /* "playing" is what the visitor wants (Wix keeps it set while the video only waits for the box to
       come on screen, or sleeps because it left the screen); only a click / key press changes it */
    function syncPlaying() {
      var playing = !v.__userPaused;
      if (playing) box.setAttribute('data-playing', ''); else box.removeAttribute('data-playing');
      if (surface) surface.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    function syncAudio() {
      box.setAttribute('data-audio', v.muted ? 'off' : 'on');
      if (audio) audio.setAttribute('aria-pressed', v.muted ? 'true' : 'false');
    }
    v.addEventListener('canplay', ready);
    v.addEventListener('playing', ready);
    if (v.readyState >= 3) ready();
    syncPlaying();
    syncAudio();

    function toggle() {
      /* remember that the visitor paused it: scrolling away and back must not start it again (as on Wix) */
      if (v.paused) { v.__userPaused = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else { v.__userPaused = true; v.pause(); }
      syncPlaying();
    }
    if (!isPhone) {
      /* computer layout: the controls show while the mouse is over the picture, a click plays/pauses */
      box.addEventListener('mouseenter', function () { box.setAttribute('data-roll-in', ''); box.setAttribute('data-show-audio', ''); });
      box.addEventListener('mouseleave', function () { box.removeAttribute('data-roll-in'); box.removeAttribute('data-show-audio'); });
      box.addEventListener('click', function (e) {
        if (audio && audio.contains(e.target)) return;
        toggle();
      });
    } else {
      /* phone layout: the first tap only shows the controls (for about 3 s), a tap while they are shown plays/pauses */
      var timer = 0;
      var touchOff = function () { clearTimeout(timer); box.setAttribute('data-touched', 'off'); };
      var hideAudio = function () { box.removeAttribute('data-show-audio'); box.setAttribute('data-touched', 'off'); };
      var arm = function () { clearTimeout(timer); timer = setTimeout(hideAudio, 3000); };
      box.addEventListener('click', function (e) {
        if (audio && audio.contains(e.target)) return;
        if (box.getAttribute('data-touched') === 'on') toggle();
        else { box.setAttribute('data-touched', 'on'); box.setAttribute('data-show-audio', ''); }
        arm();
      });
      doc.addEventListener('click', function (e) {
        if (!box.contains(e.target) && box.getAttribute('data-touched') === 'on') touchOff();
      });
      if (audio) audio.addEventListener('click', function () { touchOff(); timer = setTimeout(hideAudio, 3000); });
    }
    if (surface) {
      surface.addEventListener('keydown', function (e) {
        if (e.target !== surface) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }
    if (audio) {
      var flip = function (e) { e.stopPropagation(); v.muted = !v.muted; syncAudio(); };
      audio.addEventListener('click', flip);
      audio.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(e); } });
    }
  });

  /* ---------------------------------------------------------------- videos: play on screen, pause off screen
     Wix starts a video when it comes on screen (even a corner of it), pauses it as soon as it is
     completely off screen - also when its sound is on - and carries on from the same spot when it
     comes back, unless the visitor paused it by hand. The file is only fetched when the video is
     within about half a screen of the window (patch.mjs sets preload="none" on those videos). */
  (function () {
    var vids = $$('video');
    if (!vids.length) return;
    function wake(v) {
      if (v.preload !== 'auto') {
        v.preload = 'auto';
        try { if (v.readyState === 0 && v.networkState !== 2) v.load(); } catch (e) { /* ignore */ }
      }
    }
    function start(v) {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (!('IntersectionObserver' in window)) {
      vids.forEach(function (v) { if (v.hasAttribute('data-onscreen-play')) { wake(v); start(v); } });
      return;
    }
    var near = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { near.unobserve(en.target); wake(en.target); }
      });
    }, { rootMargin: '500px 0px 500px 0px' });
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (v.hasAttribute('data-onscreen-play')) wake(v);
          if (!v.__userPaused && v.paused) start(v);
        } else if (!v.paused) {
          v.pause();
        }
      });
    });
    vids.forEach(function (v) {
      if (v.hasAttribute('data-onscreen-play')) near.observe(v);
      seen.observe(v);
    });
  })();

  /* ---------------------------------------------------------------- entrance animations
     patch.mjs put every element Wix animates on entry back to "not played yet"
     (data-motion-todo); play it when it comes into view, then mark it done like Wix does. */
  (function () {
    var els = $$('[data-motion-todo]');
    if (!els.length) return;
    function finish(el) {
      el.setAttribute('data-motion-enter', 'done');
      el.removeAttribute('data-motion-todo');
      el.style.removeProperty('animation-play-state');
    }
    function play(el) {
      el.style.setProperty('animation-play-state', 'running');
      var anims = el.getAnimations ? el.getAnimations() : [];
      if (anims.length && window.Promise) {
        Promise.all(anims.map(function (a) { return a.finished; })).then(function () { finish(el); }, function () { finish(el); });
      } else setTimeout(function () { finish(el); }, 2600);
    }
    if (!('IntersectionObserver' in window)) { els.forEach(play); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.unobserve(en.target); play(en.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  })();
})();


/* Website editing: pressing F and R together (or opening the page with #admin at the end of the address)
   opens the login. The editor itself (/enox.cz/_admin/editor.js) is only loaded then, so visitors download nothing extra. */
(function () {
  var DEMO = true;   // preview copies (GitHub Pages) switch this on: editing can be tried there, nothing is saved
  var EDITOR = '/enox.cz/_admin/editor.js?v=3c282edb97', API = '/enox.cz/_admin/api.php';
  var down = {}, started = false;
  function start(open) {
    window.KWA_DEMO = DEMO; window.KWA_API = API;
    if (open) window.KWA_OPEN = true;
    if (window.KWA) { if (open) window.KWA.open(); return; }
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.src = EDITOR; s.async = true;
    document.head.appendChild(s);
  }
  function typing(e) {
    var t = e.composedPath ? e.composedPath()[0] : e.target;   // the real field, also inside the editor's own windows
    return t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  function which(e) {
    var k = (e.key || '').toLowerCase();
    return e.code === 'KeyF' || k === 'f' ? 'f' : e.code === 'KeyR' || k === 'r' ? 'r' : '';
  }
  addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    var k = which(e);
    if (!k) return;
    down[k] = Date.now();
    var other = down[k === 'f' ? 'r' : 'f'];
    if (other && down[k] - other < 1500) { down = {}; e.preventDefault(); start(true); }
  }, true);
  addEventListener('keyup', function (e) { var k = which(e); if (k) delete down[k]; }, true);
  addEventListener('blur', function () { down = {}; });
  function fromAddress() {
    if (location.hash !== '#admin') return;
    history.replaceState(null, '', location.pathname + location.search);
    start(true);
  }
  addEventListener('hashchange', fromAddress);
  fromAddress();
  var on = /(?:^|;\s*)kwa=1/.test(document.cookie);
  try { if (DEMO && sessionStorage.getItem('kwa-demo')) on = true; } catch (e) {}
  if (on) start(false);
})();
