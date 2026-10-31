/* Общие движения страниц продуктов. Всё видно и без скрипта; скрипт только добавляет движение. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Навигация: линия под стеклом появляется, когда под ней есть прокрученный контент
  var nav = d.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Появление блоков
  var rises = [].slice.call(d.querySelectorAll('.rise'));
  if (reduce || !('IntersectionObserver' in window)) rises.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    rises.forEach(function (e) { io.observe(e); });
  }

  // Текст, который «проявляется» по словам при прокрутке
  [].slice.call(d.querySelectorAll('.words')).forEach(function (el) {
    var parts = el.textContent.trim().split(/(\s+)/);
    el.textContent = '';
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { el.appendChild(d.createTextNode(' ')); return; }
      var s = d.createElement('span'); s.className = 'w'; s.textContent = p; el.appendChild(s);
    });
    if (reduce) return;
    var ws = [].slice.call(el.querySelectorAll('.w'));
    function upd() {
      var r = el.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      var n = Math.round(p * ws.length);
      for (var i = 0; i < ws.length; i++) ws[i].style.opacity = i < n ? 1 : 0.16;
    }
    window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });

  // Hero: витрина приближается при прокрутке (GSAP, если загрузился)
  window.addEventListener('load', function () {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    d.querySelectorAll('[data-zoom]').forEach(function (el) {
      gsap.fromTo(el, { scale: 0.86, y: 40, opacity: 0.6 }, {
        scale: 1, y: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 25%', scrub: 0.6 }
      });
    });
    d.querySelectorAll('[data-parallax]').forEach(function (el) {
      gsap.to(el, { yPercent: -parseFloat(el.dataset.parallax || 10), ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  // Тост
  var toast, tt;
  window.say = function (t) {
    if (!toast) { toast = d.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); d.body.appendChild(toast); }
    toast.textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 3600);
  };
  window.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
})();
