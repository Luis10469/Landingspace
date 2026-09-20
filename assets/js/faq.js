/* =========================================================
   faq.js — acordeón de preguntas frecuentes
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
