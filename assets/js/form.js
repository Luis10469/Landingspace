/* =========================================================
   form.js — validación del formulario de conversión
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
