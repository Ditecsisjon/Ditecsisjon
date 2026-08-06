/* Glansverk – interaktion. Ingen tracking, inga beroenden. */
(function () {
  'use strict';

  /* ---------- Navigering ---------- */
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.nav-burger');
  var links = document.getElementById('nav-links');

  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Stäng menyn' : 'Öppna menyn');
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

      var data = new FormData(form);
      var subject = 'Demoförfrågan – ' + (data.get('company') || data.get('name'));
      var body = [
        'Hej!',
        '',
        'Jag vill boka en demo av plattformen.',
        '',
        'Namn: ' + data.get('name'),
        'Företag: ' + data.get('company'),
        'E-post: ' + data.get('email'),
        'Telefon: ' + (data.get('phone') || '–'),
        'Antal anläggningar: ' + data.get('size'),
        '',
        'Meddelande:',
        (data.get('message') || '–')
      ].join('\n');

      window.location.href = 'mailto:jobb.ditec@gmail.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      var hint = form.querySelector('.form-hint');
      if (hint) hint.hidden = false;
    });
  }

  /* ---------- Årtal i sidfoten ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
