/* =========================================================
   ui.js — comportamiento general de la interfaz
   Tema claro/oscuro, menú móvil, enlace activo y animación
   de entrada de las secciones.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- tema claro / oscuro ---------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");
  var STORAGE_KEY = "sf-theme";

  function readStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function storeTheme(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* modo privado */ }
  }

  var stored = readStoredTheme();
  if (stored) root.setAttribute("data-theme", stored);

  function paintThemeButton() {
    if (!themeBtn) return;
    var isLight = root.getAttribute("data-theme") === "light";
    themeBtn.innerHTML = isLight ? "&#9789;" : "&#9728;";
    themeBtn.setAttribute("aria-label", isLight ? "Activar tema oscuro" : "Activar tema claro");
  }
  paintThemeButton();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      storeTheme(next);
      paintThemeButton();
    });
  }

  /* ---------- menú móvil ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("main-nav");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.classList.contains("nav__link")) {
        nav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- enlace activo según la sección visible ---------- */
  if (nav && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(nav.querySelectorAll(".nav__link"));
    var targets = [];
    var byTarget = new Map();

    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var el = document.querySelector(href);
      if (!el) return;
      targets.push(el);
      byTarget.set(el, link);
    });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove("is-active"); });
        var active = byTarget.get(entry.target);
        if (active) active.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- animación de entrada ---------- */
  var revealables = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealables.forEach(function (el) { revealer.observe(el); });
})();
