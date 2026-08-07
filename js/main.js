/* Glansverk – interaktion. Ingen tracking, inga beroenden. */
(function () {
  'use strict';

  /* ---------- Navigering ---------- */
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.nav-burger');
  var links = document.getElementById('nav-links');

  function menuLabel(key, fallback) {
    return (window.I18N && window.I18N.t(key)) || fallback;
  }

  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open
        ? menuLabel('nav.menuClose', 'Stäng menyn')
        : menuLabel('nav.menuOpen', 'Öppna menyn'));
    });
    links.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Scrollavslöjanden ---------- */
  var revealed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Video (YouTube/Vimeo läggs in via data-attribut i index.html) ---------- */
  var frame = document.getElementById('video-frame');
  if (frame) {
    var playBtn = frame.querySelector('.video-play');
    playBtn.addEventListener('click', function () {
      var yt = frame.getAttribute('data-youtube-id');
      var vimeo = frame.getAttribute('data-vimeo-id');
      var src = '';
      if (yt) {
        src = 'https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&rel=0';
      } else if (vimeo) {
        src = 'https://player.vimeo.com/video/' + vimeo + '?autoplay=1';
      }
      if (!src) {
        var note = frame.querySelector('.video-note');
        if (note) note.hidden = false;
        return;
      }
      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = 'Presentationsvideo';
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      frame.textContent = '';
      frame.appendChild(iframe);
    });
  }

  /* ---------- Demoformulär ----------
     Öppnar besökarens mejlprogram med förfrågan ifylld (mailto).
     Byt gärna till Formspree/Calendly för mottagning direkt – se README.md. */
  var form = document.getElementById('demo-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;

      /* Mejlets texter följer valt språk via I18N (js/i18n.js) */
      function t(key, fallback) {
        return (window.I18N && window.I18N.t(key)) || fallback;
      }

      var data = new FormData(form);
      var subject = t('mail.subject', 'Demoförfrågan') + ' – ' + (data.get('company') || data.get('name'));
      var body = [
        t('mail.greeting', 'Hej!'),
        '',
        t('mail.intro', 'Jag vill boka en demo av plattformen.'),
        '',
        t('mail.name', 'Namn') + ': ' + data.get('name'),
        t('mail.company', 'Företag') + ': ' + data.get('company'),
        t('mail.email', 'E-post') + ': ' + data.get('email'),
        t('mail.phone', 'Telefon') + ': ' + (data.get('phone') || '–'),
        t('mail.size', 'Antal anläggningar') + ': ' + data.get('size'),
        '',
        t('mail.msg', 'Meddelande') + ':',
        (data.get('message') || '–')
      ].join('\n');

      window.location.href = 'mailto:jobb.ditec@gmail.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      var hint = form.querySelector('.form-hint');
      if (hint) hint.hidden = false;
    });
  }

  /* ---------- Provkonfiguratorn ----------
     Illustrativ demo av tjänstekonfiguratorn: tre val → paket, pris och
     AI-merförsäljning direkt. Basbelopp och multiplikatorer är exempel. */
  var cfgRoot = document.getElementById('prova');
  if (cfgRoot) {
    var CFG = {
      base:  { maint: 1495, sale: 4995, shield: 9995 },
      hours: { maint: 2, sale: 6, shield: 10 },
      sizeMul: { small: 0.85, mid: 1, suv: 1.2, van: 1.35 },
      condMul: { new: 0.9, normal: 1, worn: 1.25 },
      pkgKey:  { maint: 'cfg.pkg1', sale: 'cfg.pkg2', shield: 'cfg.pkg3' },
      inclKey: { maint: 'cfg.pkg1i', sale: 'cfg.pkg2i', shield: 'cfg.pkg3i' }
    };
    var state = { size: 'mid', cond: 'normal', goal: 'shield' };

    function ct(key, fallback) {
      return (window.I18N && window.I18N.t(key)) || fallback || key;
    }

    function decimalComma() {
      var l = (window.I18N && window.I18N.lang) || 'sv';
      return !(l === 'en' || l === 'zh' || l === 'ko' || l === 'hi');
    }

    function formatPrice(n) {
      /* 9995 -> "9 995" (hårt mellanslag som tusentalsavgränsare) */
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function pickTip() {
      if (state.size === 'van') return 'cfg.tip3';
      if (state.goal === 'shield') return 'cfg.tip2';
      if (state.cond === 'worn') return 'cfg.tip1';
      return 'cfg.tip4';
    }

    function renderCfg() {
      var mul = CFG.sizeMul[state.size] * CFG.condMul[state.cond];
      var price = Math.round((CFG.base[state.goal] * mul) / 5) * 5;
      var hours = Math.round(CFG.hours[state.goal] * mul * 2) / 2;
      var hoursStr = String(hours);
      if (decimalComma()) hoursStr = hoursStr.replace('.', ',');

      document.getElementById('cfg-pkg').textContent = ct(CFG.pkgKey[state.goal]);
      document.getElementById('cfg-includes').textContent = ct(CFG.inclKey[state.goal]);
      document.getElementById('cfg-price').textContent =
        ct('cfg.from', 'från') + ' ' + formatPrice(price) + ' kr';
      document.getElementById('cfg-time').textContent =
        ct('cfg.timeAbout', 'ca') + ' ' + hoursStr + ' ' + ct('cfg.timeUnit', 'tim');
      document.getElementById('cfg-tip').textContent = ct(pickTip());
    }

    cfgRoot.addEventListener('click', function (ev) {
      var chip = ev.target.closest('.cfg-chip');
      if (!chip) return;
      var group = chip.parentElement.getAttribute('data-group');
      state[group] = chip.getAttribute('data-value');
      var chips = chip.parentElement.querySelectorAll('.cfg-chip');
      for (var i = 0; i < chips.length; i++) {
        var on = chips[i] === chip;
        chips[i].classList.toggle('is-on', on);
        chips[i].setAttribute('aria-pressed', String(on));
      }
      renderCfg();
    });

    /* Räkna om med rätt texter när språket byts */
    document.addEventListener('glansverk:langchange', renderCfg);
    renderCfg();
  }

  /* ---------- Årtal i sidfoten ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
