/* =========================================================
   kanban.js — tablero del Sprint 1
   Mueve las historias entre TODO, DOING y DONE, actualiza
   los contadores y recuerda el estado en el navegador.
   ========================================================= */
(function () {
  "use strict";

  var board = document.getElementById("kanban");
  if (!board) return;

  var COLUMNS = ["todo", "doing", "done"];
  var STORAGE_KEY = "sf-kanban";

  var lists = {};
  COLUMNS.forEach(function (name) {
    lists[name] = board.querySelector('[data-column="' + name + '"] .column__list');
  });

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
      board.querySelectorAll(".ticket").forEach(function (ticket) {
        lists[ticket.getAttribute("data-home")].appendChild(ticket);
      });
      refresh();
      saveState();
    });
  }

  restoreState();
  refresh();
})();
