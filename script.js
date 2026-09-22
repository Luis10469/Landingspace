/* =========================================================
   script.js — SpaceFiber
   Un solo archivo para todas las páginas. Cada módulo busca
   sus elementos y, si no están en la página, no hace nada.

   1. Interfaz: tema, menú móvil, enlace activo y animaciones
   2. Preguntas frecuentes (acordeón)
   3. Formulario de conversión (validación y estados)
   4. Llamados a la acción (plan preseleccionado y resaltado)
   5. Tablero Kanban del sprint (proyecto.html)
   ========================================================= */

/* =========================================================
   1. INTERFAZ
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
    /* También se observan las secciones sin enlace (portada, CTA, formulario):
       al pasar por ellas no queda resaltado el enlace de la sección anterior. */
    var targets = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
    var byTarget = new Map();

    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) !== "#") return;
      var el = document.querySelector(href);
      if (!el) return;
      if (targets.indexOf(el) === -1) targets.push(el);
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

/* =========================================================
   2. PREGUNTAS FRECUENTES
   Un solo panel abierto a la vez, accesible por teclado
   mediante botones con aria-expanded / aria-controls.
   ========================================================= */
(function () {
  "use strict";

  var accordion = document.getElementById("faq-accordion");
  if (!accordion) return;

  var buttons = Array.prototype.slice.call(accordion.querySelectorAll(".accordion__btn"));

  function closeAll(except) {
    buttons.forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute("aria-expanded", "false");
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.setAttribute("data-open", "false");
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      var willOpen = btn.getAttribute("aria-expanded") !== "true";

      closeAll(btn);
      btn.setAttribute("aria-expanded", String(willOpen));
      if (panel) panel.setAttribute("data-open", String(willOpen));
    });
  });
})();

/* =========================================================
   3. FORMULARIO DE CONVERSIÓN
   Valida campo por campo, marca errores en línea y muestra
   estados de carga, error y éxito al enviar.
   ========================================================= */
(function () {
  "use strict";

  var form = document.getElementById("lead-form");
  if (!form) return;

  var submitBtn = document.getElementById("lead-submit");
  var okBox = document.getElementById("form-ok");
  var errorBox = document.getElementById("form-error");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  var PHONE_RE = /^[0-9()+\s-]{7,20}$/;

  /* Reglas por campo: devuelven un mensaje de error o "" si el valor es válido. */
  var rules = {
    nombre: function (v) {
      if (!v) return "Escribe tu nombre completo.";
      if (v.length < 3) return "El nombre debe tener al menos 3 caracteres.";
      return "";
    },
    correo: function (v) {
      if (!v) return "Escribe tu correo electrónico.";
      if (!EMAIL_RE.test(v)) return "El correo no tiene un formato válido.";
      return "";
    },
    telefono: function (v) {
      if (!v) return "Escribe un teléfono de contacto.";
      if (!PHONE_RE.test(v)) return "Usa solo números, espacios o los signos + ( ) -";
      return "";
    },
    direccion: function (v) {
      if (!v) return "Escribe la dirección donde quieres el servicio.";
      if (v.length < 6) return "La dirección parece incompleta.";
      return "";
    },
    plan: function (v) {
      if (!v) return "Selecciona el plan que te interesa.";
      return "";
    },
    politica: function (v, field) {
      if (!field.checked) return "Debes aceptar la política de tratamiento de datos.";
      return "";
    }
  };

  function fieldWrapper(input) {
    return input.closest(".field") || input.closest(".check-group");
  }

  function showError(input, message) {
    var wrapper = fieldWrapper(input);
    if (!wrapper) return;
    var box = wrapper.querySelector(".field__error");
    wrapper.classList.remove("is-valid");
    wrapper.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    if (box) box.textContent = message;
  }

  function clearError(input) {
    var wrapper = fieldWrapper(input);
    if (!wrapper) return;
    wrapper.classList.remove("has-error");
    if (input.value) wrapper.classList.add("is-valid");
    input.removeAttribute("aria-invalid");
    var box = wrapper.querySelector(".field__error");
    if (box) box.textContent = "";
  }

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var message = rule(String(input.value || "").trim(), input);
    if (message) { showError(input, message); return false; }
    clearError(input);
    return true;
  }

  var fields = Array.prototype.slice.call(form.querySelectorAll("[name]"));

  fields.forEach(function (input) {
    var event = (input.type === "checkbox" || input.tagName === "SELECT") ? "change" : "blur";
    input.addEventListener(event, function () { validateField(input); });
    input.addEventListener("input", function () {
      var wrapper = fieldWrapper(input);
      if (wrapper && wrapper.classList.contains("has-error")) validateField(input);
    });
  });

  function hideMessages() {
    okBox.classList.remove("is-visible");
    errorBox.classList.remove("is-visible");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideMessages();

    var firstInvalid = null;
    fields.forEach(function (input) {
      var valid = validateField(input);
      if (!valid && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      errorBox.textContent = "Revisa los campos marcados en rojo antes de enviar.";
      errorBox.classList.add("is-visible");
      firstInvalid.focus();
      return;
    }

    /* Estado de carga. La landing no tiene backend propio: aquí se simula la
       respuesta del servidor. Para conectarla, reemplaza este bloque por la
       llamada real a POST /api/contacto. */
    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    var originalText = submitBtn.textContent;
    submitBtn.textContent = "Enviando...";

    window.setTimeout(function () {
      submitBtn.classList.remove("is-loading");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;

      okBox.textContent = "Listo, recibimos tus datos. Un asesor te contacta en menos de 24 horas hábiles.";
      okBox.classList.add("is-visible");
      okBox.focus();

      form.reset();
      fields.forEach(function (input) {
        var wrapper = fieldWrapper(input);
        if (wrapper) wrapper.classList.remove("is-valid", "has-error");
      });
    }, 1100);
  });
})();

/* =========================================================
   4. LLAMADOS A LA ACCIÓN
   Todo enlace a #contratar lleva al formulario. Si trae
   data-plan, deja ese plan preseleccionado; al terminar el
   desplazamiento resalta el formulario y, con mouse o teclado,
   pone el cursor en el primer campo pendiente (en pantallas
   táctiles no enfoca, para no abrir el teclado de golpe).
   ========================================================= */
(function () {
  "use strict";

  var form = document.getElementById("lead-form");
  if (!form) return;

  var card = form.closest(".card") || form;
  var planSelect = document.getElementById("plan");
  var HIGHLIGHT_MS = 1600;
  var timer = null;

  function afterScroll(fn) {
    var done = false;
    function run() {
      if (done) return;
      done = true;
      window.removeEventListener("scrollend", run);
      fn();
    }
    if ("onscrollend" in window) window.addEventListener("scrollend", run);
    window.setTimeout(run, 900); /* sin scrollend, o si no hubo que desplazarse */
  }

  function firstPendingField() {
    var required = form.querySelectorAll("[required]");
    for (var i = 0; i < required.length; i++) {
      var f = required[i];
      if (f.type === "checkbox" ? !f.checked : !String(f.value).trim()) return f;
    }
    return document.getElementById("lead-submit");
  }

  function highlight() {
    card.classList.remove("is-highlighted");
    void card.offsetWidth; /* reinicia la animación si se pulsa dos veces seguidas */
    card.classList.add("is-highlighted");
    window.clearTimeout(timer);
    timer = window.setTimeout(function () { card.classList.remove("is-highlighted"); }, HIGHLIGHT_MS);

    if (window.matchMedia("(pointer: fine)").matches) {
      var field = firstPendingField();
      if (field) field.focus({ preventScroll: true });
    }
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href="#contratar"]');
    if (!link) return;

    var plan = link.getAttribute("data-plan");
    if (plan && planSelect) {
      planSelect.value = plan;
      planSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    afterScroll(highlight);
  });
})();

/* =========================================================
   5. TABLERO KANBAN DEL SPRINT
   Mueve las historias entre TODO, DOING y DONE, actualiza
   los contadores y recuerda el estado en el navegador.
   ========================================================= */
(function () {
  "use strict";

  var board = document.getElementById("kanban");
  if (!board) return;

  var COLUMNS = ["todo", "doing", "done"];
  var STORAGE_KEY = "sf-kanban-landing"; /* clave nueva: el backlog anterior usaba "sf-kanban" */

  var lists = {};
  COLUMNS.forEach(function (name) {
    lists[name] = board.querySelector('[data-column="' + name + '"] .column__list');
  });
  var initialOrder = Array.prototype.slice.call(board.querySelectorAll(".ticket"));

  function saveState() {
    var state = {};
    COLUMNS.forEach(function (name) {
      state[name] = Array.prototype.map.call(
        lists[name].querySelectorAll(".ticket"),
        function (t) { return t.getAttribute("data-id"); }
      );
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* modo privado */ }
  }

  function restoreState() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
    if (!raw) return;

    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }

    COLUMNS.forEach(function (name) {
      (state[name] || []).forEach(function (id) {
        var ticket = board.querySelector('.ticket[data-id="' + id + '"]');
        if (ticket) lists[name].appendChild(ticket);
      });
    });
  }

  function refresh() {
    COLUMNS.forEach(function (name) {
      var list = lists[name];
      var column = list.closest(".column");
      var tickets = list.querySelectorAll(".ticket");

      column.querySelector(".column__count").textContent = tickets.length;

      var empty = list.querySelector(".column__empty");
      if (empty) empty.hidden = tickets.length > 0;

      Array.prototype.forEach.call(tickets, function (ticket) {
        var index = COLUMNS.indexOf(name);
        var back = ticket.querySelector('[data-move="back"]');
        var next = ticket.querySelector('[data-move="next"]');
        if (back) back.disabled = index === 0;
        if (next) next.disabled = index === COLUMNS.length - 1;
      });
    });
  }

  board.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-move]");
    if (!btn) return;

    var ticket = btn.closest(".ticket");
    var current = ticket.closest(".column").getAttribute("data-column");
    var index = COLUMNS.indexOf(current);
    var target = COLUMNS[btn.getAttribute("data-move") === "next" ? index + 1 : index - 1];
    if (!target) return;

    lists[target].appendChild(ticket);
    refresh();
    saveState();
  });

  var resetBtn = document.getElementById("kanban-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      initialOrder.forEach(function (ticket) {
        lists[ticket.getAttribute("data-home")].appendChild(ticket);
      });
      refresh();
      saveState();
    });
  }

  restoreState();
  refresh();
})();
