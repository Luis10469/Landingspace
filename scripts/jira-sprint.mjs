#!/usr/bin/env node
/* =========================================================
   scripts/jira-sprint.mjs — del backlog.json al Sprint en Jira

   1. Crea las historias de backlog.json como tipo Story.
   2. Crea el sprint "Sprint 1 - Entrega Landing" en el tablero (Jira exige
      nombres de sprint de menos de 30 caracteres, por eso sin "Page").
   3. Mueve las historias al sprint.
   4. Inicia el sprint hoy y lo cierra en 14 días.
   Al final imprime el estado de la landing, las claves de Jira
   y el enlace al tablero.

   Uso (desde la raíz del repositorio):
     node scripts/jira-sprint.mjs            ejecuta todo
     node scripts/jira-sprint.mjs --dry-run  solo lee Jira y muestra lo que haría

   Credenciales: variables de entorno o archivo .env en la raíz
   (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY, JIRA_BOARD_ID).
   Se puede volver a ejecutar sin duplicar nada: reutiliza las
   historias (mismo summary) y el sprint (mismo nombre) que ya existan.
   Requiere Node 18 o superior; no usa dependencias.
   ========================================================= */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Jira exige menos de 30 caracteres en el nombre del sprint; "...Landing Page" (31) lo supera.
const SPRINT_NAME = "Sprint 1 - Entrega Landing";
const SPRINT_GOAL = "Publicar la landing de SpaceFiber en GitHub Pages con el formulario validado, " +
  "la navegación responsive, las preguntas frecuentes y el llamado a la acción con feedback visual.";
const SPRINT_DAYS = 14;
const DRY_RUN = process.argv.includes("--dry-run");
const REQUIRED_ENV = ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY", "JIRA_BOARD_ID"];
const FIBONACCI = [1, 2, 3, 5, 8, 13];
/* Prioridad de backlog.json -> nombres con que Jira la muestra (inglés o español) e id por defecto. */
const PRIORITIES = {
  High: { names: ["High", "Alta"], id: "2" },
  Medium: { names: ["Medium", "Media"], id: "3" },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (msg = "") => console.log(msg);
const warn = (msg) => console.log(`  [AVISO] ${msg}`);
const rule = (ch = "=") => log(ch.repeat(70));
const title = (text) => { log(); rule(); log(` ${text}`); rule(); };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "-");
const totalPoints = (items) => items.reduce((sum, h) => sum + h.story_points, 0);

/* ---------------------------------------------------------
   Configuración
   --------------------------------------------------------- */

/* Carga .env sin pisar variables que ya vengan del entorno. */
function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const quoted = m[2].match(/^(['"])(.*)\1$/);
    const value = quoted ? quoted[2] : m[2].replace(/\s+#.*$/, "").trim();
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
  return true;
}

function readConfig() {
  const env = Object.fromEntries(REQUIRED_ENV.map((k) => [k, (process.env[k] || "").trim()]));
  let baseUrl = "";
  if (env.JIRA_BASE_URL) {
    try { baseUrl = new URL(env.JIRA_BASE_URL).origin; } /* acepta también la URL completa del tablero */
    catch { throw new Error(`JIRA_BASE_URL no es una URL válida: ${env.JIRA_BASE_URL}`); }
  }
  if (env.JIRA_BOARD_ID && !/^\d+$/.test(env.JIRA_BOARD_ID)) {
    throw new Error(`JIRA_BOARD_ID debe ser el número que aparece en /boards/<número>, no "${env.JIRA_BOARD_ID}".`);
  }
  return {
    baseUrl,
    email: env.JIRA_EMAIL,
    token: env.JIRA_API_TOKEN,
    projectKey: env.JIRA_PROJECT_KEY.toUpperCase(),
    boardId: Number(env.JIRA_BOARD_ID),
    missing: REQUIRED_ENV.filter((k) => !env[k]),
  };
}

/* ---------------------------------------------------------
   backlog.json
   --------------------------------------------------------- */
function readBacklog() {
  let data;
  try { data = JSON.parse(readFileSync(join(ROOT, "backlog.json"), "utf8")); }
  catch (e) { throw new Error(`No se pudo leer backlog.json: ${e.message}`); }
  if (!Array.isArray(data)) throw new Error("backlog.json debe ser una lista de historias.");
  if (data.length !== 5) throw new Error(`backlog.json debe tener exactamente 5 historias y tiene ${data.length}.`);

  const problems = [];
  data.forEach((h, i) => {
    const hu = `HU${i + 1}`;
    if (typeof h.summary !== "string" || !h.summary.trim()) problems.push(`${hu}: falta summary`);
    else if (h.summary.length > 255) problems.push(`${hu}: summary supera los 255 caracteres de Jira`);
    if (typeof h.description !== "string" || !/^Como .+?, quiero .+? para /.test(h.description)) {
      problems.push(`${hu}: description debe empezar con "Como [rol], quiero [funcionalidad] para [beneficio]"`);
    } else if (!["Dado que", "Cuando", "Entonces"].every((word) => h.description.includes(word))) {
      problems.push(`${hu}: faltan criterios en formato Dado que / Cuando / Entonces`);
    }
    if (!FIBONACCI.includes(h.story_points)) problems.push(`${hu}: story_points debe ser Fibonacci (${FIBONACCI.join(", ")})`);
    if (!PRIORITIES[h.priority]) problems.push(`${hu}: priority debe ser ${Object.keys(PRIORITIES).join(" o ")}`);
  });
  if (!problems.length) {
    const seen = new Set();
    for (const h of data) {
      if (seen.has(h.summary.trim())) problems.push(`summary repetido: "${h.summary.trim()}"`);
      seen.add(h.summary.trim());
    }
  }
  if (problems.length) throw new Error(`backlog.json no es válido:\n  - ${problems.join("\n  - ")}`);
  return data.map((h, i) => ({ ...h, hu: `HU${i + 1}`, summary: h.summary.trim() }));
}

/* Descripción de backlog.json -> Atlassian Document Format (lo que exige la API v3). */
const text = (value, strong = false) => (strong ? { type: "text", text: value, marks: [{ type: "strong" }] } : { type: "text", text: value });
const paragraph = (...content) => ({ type: "paragraph", content });

function gherkinStep(line) {
  const m = line.match(/^(Dado que|Cuando|Entonces|Y|Pero)\s+(.+)$/);
  return m ? [text(m[1], true), text(` ${m[2]}`)] : [text(line)];
}

function toADF(description) {
  const content = [];
  for (const block of description.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const [first, ...rest] = lines;
    const story = lines.length === 1 && first.match(/^Como (.+?), quiero (.+?) para (.+)$/);
    if (story) {
      content.push(paragraph(text("Como", true), text(` ${story[1]}, `), text("quiero", true),
        text(` ${story[2]} `), text("para", true), text(` ${story[3]}`)));
    } else if (lines.length === 1 && /^criterios de aceptaci[oó]n:?$/i.test(first)) {
      content.push({ type: "heading", attrs: { level: 3 }, content: [text("Criterios de aceptación")] });
    } else if (/^escenario\b/i.test(first)) {
      content.push(paragraph(text(first, true)));
      if (rest.length) {
        content.push({ type: "bulletList", content: rest.map((l) => ({ type: "listItem", content: [paragraph(...gherkinStep(l))] })) });
      }
    } else {
      content.push(paragraph(...lines.flatMap((l, i) => (i ? [{ type: "hardBreak" }, text(l)] : [text(l)]))));
    }
  }
  return { type: "doc", version: 1, content };
}

/* ---------------------------------------------------------
   Landing: archivos y las 8 secciones obligatorias
   --------------------------------------------------------- */
const LANDING_FILES = ["index.html", "styles.css", "script.js"];

function chunk(html, startPattern, end) {
  const i = html.search(startPattern);
  if (i < 0) return "";
  const j = html.indexOf(end, i);
  return j < 0 ? "" : html.slice(i, j + end.length);
}
const section = (html, id) => chunk(html, new RegExp(`<section[^>]*id="${id}"`), "</section>");
const has = (block, ...patterns) => !!block && patterns.every((p) => p.test(block));

const SECTIONS = [
  ["Encabezado: logo y título del producto", (h) => has(chunk(h, /<header/, "</header>"), /class="logo"/, /logo__name/)],
  ["Propuesta de valor (¿Qué hacemos?)", (h) => has(section(h, "propuesta"), /Qué hacemos/)],
  ["Beneficios principales", (h) => has(section(h, "beneficios"), /class="card/)],
  ["Prueba social: testimonios y métricas", (h) => has(section(h, "opiniones"), /class="quote/, /class="stat/)],
  ["Llamado a la acción (CTA)", (h) => has(section(h, "cta"), /cta-band/, /href="#contratar"/)],
  ["Formulario de conversión con validaciones", (h) => has(section(h, "contratar"), /<form[^>]*id="lead-form"/, /required/)],
  ["FAQ con acordeón interactivo", (h) => has(section(h, "faq"), /accordion__btn/, /aria-expanded/)],
  ["Footer: legales, redes, copyright y créditos", (h) => has(chunk(h, /<footer/, "</footer>"), /politica-de-privacidad\.html/, /class="social"/, /&copy;|©/, /Créditos/)],
];

function checkLanding() {
  const files = LANDING_FILES.map((name) => {
    const path = join(ROOT, name);
    return existsSync(path) ? { name, ok: true, kb: statSync(path).size / 1024 } : { name, ok: false, kb: 0 };
  });
  const html = files[0].ok ? readFileSync(join(ROOT, "index.html"), "utf8") : "";
  return {
    files,
    linked: {
      "styles.css": /<link[^>]+href="styles\.css"/.test(html),
      "script.js": /<script[^>]+src="script\.js"/.test(html),
    },
    nojekyll: existsSync(join(ROOT, ".nojekyll")),
    sections: SECTIONS.map(([name, test]) => ({ name, ok: !!html && test(html) })),
  };
}

function printLanding(landing) {
  log("1) Landing page (sitio estático para GitHub Pages)");
  for (const f of landing.files) {
    const link = f.name in landing.linked ? (landing.linked[f.name] ? " · enlazado desde index.html" : " · NO está enlazado desde index.html") : "";
    log(`   ${f.ok ? "[OK]   " : "[FALTA]"} ${f.name.padEnd(11)} ${f.ok ? `${f.kb.toFixed(1)} KB` : ""}${link}`);
  }
  log(`   ${landing.nojekyll ? "[OK]   " : "[FALTA]"} .nojekyll   GitHub Pages sirve los archivos sin procesarlos con Jekyll`);
  log(`   Secciones obligatorias: ${landing.sections.filter((s) => s.ok).length}/8`);
  landing.sections.forEach((s, i) => log(`   ${s.ok ? "[OK]   " : "[FALTA]"} ${i + 1}. ${s.name}`));
}

/* ---------------------------------------------------------
   Cliente de la API REST de Jira
   --------------------------------------------------------- */
class JiraError extends Error {
  constructor(method, path, status, body) {
    const detail = body && typeof body === "object"
      ? [...(body.errorMessages || []), ...Object.entries(body.errors || {}).map(([k, v]) => `${k}: ${v}`)].join(" | ")
      : String(body || "").replace(/\s+/g, " ").slice(0, 300);
    super(`${method} ${path} -> HTTP ${status}${detail ? `: ${detail}` : ""}`);
    this.status = status;
  }
}

function createClient({ baseUrl, email, token }) {
  const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
  return async function jira(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: { Authorization: auth, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (!res.ok) throw new JiraError(method, path, res.status, data);
    return data;
  };
}

/* Sin credenciales todavía: al menos confirma que el sitio existe (endpoint público). */
async function pingSite(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/serverInfo`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    const info = res.ok ? await res.json() : null;
    log(info ? `Sitio de Jira alcanzable: ${info.baseUrl} (${info.deploymentType || "Cloud"})` : `El sitio respondió HTTP ${res.status}: revisa JIRA_BASE_URL.`);
  } catch (e) {
    log(`No se pudo contactar ${baseUrl}: ${e.message}`);
  }
}

/* ---------------------------------------------------------
   Revisión previa (solo lectura): nada se escribe si algo falla aquí
   --------------------------------------------------------- */
async function inspectJira(jira, cfg) {
  const key = encodeURIComponent(cfg.projectKey);
  const me = await jira("GET", "/rest/api/3/myself");
  const project = await jira("GET", `/rest/api/3/project/${key}`);
  const board = await jira("GET", `/rest/agile/1.0/board/${cfg.boardId}`);

  const typesPage = await jira("GET", `/rest/api/3/issue/createmeta/${key}/issuetypes?maxResults=100`);
  const types = typesPage.issueTypes || typesPage.values || typesPage.createMetaIssueType || [];
  const story = types.find((t) => !t.subtask && (t.untranslatedName === "Story" || /^(story|historia)$/i.test(t.name)));
  if (!story) {
    throw new Error(`El proyecto ${cfg.projectKey} no permite crear incidencias de tipo Story. Tipos disponibles: ${types.map((t) => t.name).join(", ") || "ninguno"}.`);
  }

  const fields = [];
  for (let startAt = 0; ;) {
    const page = await jira("GET", `/rest/api/3/issue/createmeta/${key}/issuetypes/${story.id}?maxResults=100&startAt=${startAt}`);
    const batch = page.fields || page.results || page.values || [];
    fields.push(...batch);
    startAt += batch.length;
    if (!batch.length || startAt >= (page.total ?? startAt)) break;
  }
  const fieldId = (f) => f.fieldId || f.key;

  /* Puntos de historia: el campo con el que estima el tablero; si no lo expone, se busca por nombre. */
  let pointsFieldId = null;
  try {
    const conf = await jira("GET", `/rest/agile/1.0/board/${cfg.boardId}/configuration`);
    if (conf.estimation?.type === "field") pointsFieldId = conf.estimation.field?.fieldId || null;
  } catch { /* hay tableros que no exponen su configuración */ }
  if (!pointsFieldId) {
    const byName = fields.find((f) => f.schema?.custom === "com.pyxis.greenhopper.jira:jsw-story-points" ||
      /story point|puntos de historia|estimaci[oó]n de puntos/i.test(f.name || ""));
    pointsFieldId = byName ? fieldId(byName) : null;
  }
  const pointsOnCreate = !!pointsFieldId && fields.some((f) => fieldId(f) === pointsFieldId);

  const priorityField = fields.find((f) => fieldId(f) === "priority");
  const priorities = {};
  for (const [name, rule] of Object.entries(PRIORITIES)) {
    const allowed = priorityField?.allowedValues || [];
    const match = allowed.find((v) => rule.names.includes(v.name)) || allowed.find((v) => v.id === rule.id);
    if (match) priorities[name] = { id: match.id, name: match.name };
  }

  /* Sprints activos y futuros (si el tablero no admite sprints, Jira responde error aquí). */
  const sprints = [];
  for (let startAt = 0; ;) {
    const page = await jira("GET", `/rest/agile/1.0/board/${cfg.boardId}/sprint?state=active,future&maxResults=50&startAt=${startAt}`);
    const batch = page.values || [];
    sprints.push(...batch);
    startAt += batch.length;
    if (page.isLast !== false || !batch.length) break;
  }

  /* Historias que ya existen con el mismo summary, para no duplicarlas al reejecutar. */
  const existing = new Map();
  let nextPageToken;
  for (let i = 0; i < 20; i++) {
    const page = await jira("POST", "/rest/api/3/search/jql", {
      jql: `project = "${cfg.projectKey}" AND issuetype = ${story.id} ORDER BY created ASC`,
      fields: ["summary"],
      maxResults: 100,
      ...(nextPageToken ? { nextPageToken } : {}),
    });
    for (const issue of page.issues || []) {
      const summary = issue.fields?.summary?.trim();
      if (summary && !existing.has(summary)) existing.set(summary, issue.key);
    }
    nextPageToken = page.nextPageToken;
    if (!nextPageToken || page.isLast) break;
  }

  return {
    me, project, board, story, pointsFieldId, pointsOnCreate, priorityAvailable: !!priorityField, priorities,
    ownSprint: sprints.find((s) => s.name === SPRINT_NAME) || null,
    otherSprints: sprints.filter((s) => s.name !== SPRINT_NAME),
    existing,
  };
}

function boardUrl(cfg, project) {
  const managed = project?.style === "classic" ? "c/" : ""; /* los proyectos company-managed llevan /c/ */
  return `${cfg.baseUrl}/jira/software/${managed}projects/${cfg.projectKey}/boards/${cfg.boardId}`;
}

function printContext(cfg, ctx, backlog) {
  const style = ctx.project.style === "classic" ? "company-managed" : "team-managed";
  log(`  Usuario:    ${ctx.me.displayName}`);
  log(`  Proyecto:   ${ctx.project.key} · ${ctx.project.name} (${style})`);
  log(`  Tablero:    ${ctx.board.id} · ${ctx.board.name} (${ctx.board.type})`);
  log(`  Tipo Story: "${ctx.story.name}" (id ${ctx.story.id})`);
  log(`  Puntos:     ${ctx.pointsFieldId ? `${ctx.pointsFieldId} ${ctx.pointsOnCreate ? "(se envía al crear)" : "(se asigna después con la API de estimación del tablero)"}` : "no se encontró el campo"}`);
  log(`  Prioridad:  ${ctx.priorityAvailable ? Object.entries(ctx.priorities).map(([k, v]) => `${k} -> ${v.name}`).join(", ") : "el campo no está disponible para Story"}`);
  if (ctx.otherSprints.length) {
    log(`  Otros sprints en el tablero: ${ctx.otherSprints.map((s) => `"${s.name}" (${s.state})`).join(", ")}`);
  }
  if (ctx.board.location?.projectKey && ctx.board.location.projectKey !== cfg.projectKey) {
    warn(`El tablero ${ctx.board.id} pertenece al proyecto ${ctx.board.location.projectKey}, no a ${cfg.projectKey}.`);
  }
  if (!ctx.pointsFieldId) warn("Las historias se crearán sin puntos: el tablero no usa un campo de estimación.");
  if (!ctx.priorityAvailable) warn("Las historias se crearán sin prioridad: agrega el campo Prioridad al tipo Story en la configuración del proyecto.");
  for (const [name] of Object.entries(PRIORITIES)) {
    if (ctx.priorityAvailable && backlog.some((h) => h.priority === name) && !ctx.priorities[name]) warn(`Jira no tiene una prioridad equivalente a ${name}.`);
  }
  const active = ctx.otherSprints.filter((s) => s.state === "active");
  if (active.length && ctx.ownSprint?.state !== "active") {
    warn(`El tablero ya tiene un sprint activo (${active.map((s) => `"${s.name}"`).join(", ")}). Si no admite sprints en paralelo, Jira rechazará iniciar otro.`);
  }
}

/* ---------------------------------------------------------
   Pasos que escriben en Jira
   --------------------------------------------------------- */
async function createStories(jira, cfg, ctx, backlog) {
  const result = [];
  for (const h of backlog) {
    const already = ctx.existing.get(h.summary);
    if (already) {
      log(`  = ${already.padEnd(9)} ${h.hu}  ${h.summary}  (ya existía: se reutiliza)`);
      result.push({ ...h, key: already, action: "reutilizada" });
      continue;
    }
    const fields = {
      project: { key: cfg.projectKey },
      issuetype: { id: ctx.story.id },
      summary: h.summary,
      description: toADF(h.description),
    };
    if (ctx.priorities[h.priority]) fields.priority = { id: ctx.priorities[h.priority].id };
    if (ctx.pointsOnCreate) fields[ctx.pointsFieldId] = h.story_points;

    const issue = await jira("POST", "/rest/api/3/issue", { fields });
    log(`  + ${issue.key.padEnd(9)} ${h.hu}  ${h.summary}`);
    if (ctx.pointsFieldId && !ctx.pointsOnCreate) {
      try {
        await jira("PUT", `/rest/agile/1.0/issue/${issue.key}/estimation?boardId=${cfg.boardId}`, { value: String(h.story_points) });
      } catch (e) {
        warn(`${issue.key}: no se pudieron asignar los puntos (${e.message})`);
      }
    }
    result.push({ ...h, key: issue.key, action: "creada" });
  }
  return result;
}

async function ensureSprint(jira, cfg, ctx) {
  if (ctx.ownSprint) {
    log(`  = Sprint ${ctx.ownSprint.id} "${SPRINT_NAME}" ya existía (estado: ${ctx.ownSprint.state}): se reutiliza`);
    return ctx.ownSprint;
  }
  const sprint = await jira("POST", "/rest/agile/1.0/sprint", { name: SPRINT_NAME, originBoardId: cfg.boardId, goal: SPRINT_GOAL });
  log(`  + Sprint ${sprint.id} "${sprint.name}" creado en el tablero ${cfg.boardId}`);
  return sprint;
}

async function startSprint(jira, sprint) {
  if (sprint.state === "active") {
    log(`  = El sprint ${sprint.id} ya estaba activo`);
    return sprint;
  }
  const start = new Date();
  const end = new Date(start.getTime() + SPRINT_DAYS * 24 * 60 * 60 * 1000);
  const started = await jira("POST", `/rest/agile/1.0/sprint/${sprint.id}`, {
    state: "active",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });
  log(`  > Sprint ${started.id} activo: ${fmtDate(started.startDate)} -> ${fmtDate(started.endDate)}`);
  return started;
}

/* El índice detrás de /sprint/{id}/issue tarda unos segundos en reflejar un movimiento recién
   hecho (se vio en pruebas reales: el POST de mover ya había devuelto éxito). Reintenta unas
   pocas veces antes de reportar una historia como fuera del sprint. */
async function waitForSprintIssues(jira, sprintId, expectedKeys, { attempts = 8, delayMs = 2000 } = {}) {
  let keys = new Set();
  for (let i = 0; i < attempts; i++) {
    const page = await jira("GET", `/rest/agile/1.0/sprint/${sprintId}/issue?fields=summary&maxResults=100`);
    keys = new Set((page.issues || []).map((i) => i.key));
    if (expectedKeys.every((k) => keys.has(k))) return keys;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return keys; /* tras el último intento, se devuelve lo que haya aunque falte alguna */
}

/* Lee de vuelta lo que quedó en Jira para que el reporte no dependa de lo que se envió. */
async function readBack(jira, ctx, sprintId, keys) {
  const sprint = await jira("GET", `/rest/agile/1.0/sprint/${sprintId}`);
  const sprintKeys = await waitForSprintIssues(jira, sprintId, keys);
  const fields = ["summary", "status", "priority", ...(ctx.pointsFieldId ? [ctx.pointsFieldId] : [])];
  const found = await jira("POST", "/rest/api/3/search/jql", { jql: `key in (${keys.join(",")})`, fields, maxResults: keys.length });
  const issues = new Map((found.issues || []).map((i) => [i.key, {
    status: i.fields.status?.name,
    priority: i.fields.priority?.name,
    points: ctx.pointsFieldId ? i.fields[ctx.pointsFieldId] : undefined,
    inSprint: sprintKeys.has(i.key),
  }]));
  return { sprint, issues };
}

function printReport(cfg, ctx, landing, stories, final) {
  title(`REPORTE FINAL · ${SPRINT_NAME}`);
  printLanding(landing);

  log("\n2) Historias de usuario en Jira");
  for (const s of stories) {
    const jiraData = final.issues.get(s.key) || {};
    const points = jiraData.points ?? "sin puntos";
    const priority = jiraData.priority || "sin prioridad";
    log(`   ${s.key.padEnd(9)} ${s.hu}  ${s.summary}`);
    log(`   ${"".padEnd(9)}      ${points} pts · ${priority} · ${jiraData.status || "?"} · ${jiraData.inSprint ? "en el sprint" : "FUERA del sprint"} · ${s.action}`);
    log(`   ${"".padEnd(9)}      ${cfg.baseUrl}/browse/${s.key}`);
  }
  log(`   Total comprometido: ${totalPoints(stories)} puntos`);

  log("\n3) Sprint");
  log(`   ID:      ${final.sprint.id}`);
  log(`   Nombre:  ${final.sprint.name}`);
  log(`   Estado:  ${String(final.sprint.state).toUpperCase()}`);
  log(`   Fechas:  ${fmtDate(final.sprint.startDate)} -> ${fmtDate(final.sprint.endDate)}`);
  log(`   Tablero: ${boardUrl(cfg, ctx.project)}`);
  rule();
}

/* ---------------------------------------------------------
   Programa principal
   --------------------------------------------------------- */
function hintFor(error) {
  if (error.status === 401) return "Revisa JIRA_EMAIL y JIRA_API_TOKEN. El token debe ser clásico (\"Crear token de API\", sin alcances) y de la misma cuenta con la que entras a Jira.";
  if (error.status === 403) return "La cuenta no tiene permiso para esta acción en el proyecto (crear incidencias o gestionar sprints), o Jira pidió CAPTCHA tras varios intentos fallidos: entra una vez desde el navegador y reintenta.";
  if (error.status === 404) return "Revisa JIRA_PROJECT_KEY y JIRA_BOARD_ID: el proyecto o el tablero no existen o esta cuenta no los ve.";
  if (error.name === "TimeoutError" || error.cause?.code === "ENOTFOUND") return "No se pudo conectar con Jira: revisa JIRA_BASE_URL y la conexión a Internet.";
  return "";
}

async function main() {
  const envLoaded = loadEnvFile(join(ROOT, ".env"));
  const cfg = readConfig();
  const backlog = readBacklog();
  const landing = checkLanding();

  title(`Jira · ${SPRINT_NAME}${DRY_RUN ? "  (simulación: no se escribe nada)" : ""}`);
  log(`backlog.json: ${backlog.length} historias válidas · ${totalPoints(backlog)} puntos`);
  log(`.env: ${envLoaded ? "cargado" : "no encontrado (se usan las variables de entorno)"}`);

  if (cfg.missing.length) {
    log(`\nFaltan credenciales: ${cfg.missing.join(", ")}`);
    log("Completa el archivo .env (hay una plantilla en .env.example). El token se crea en");
    log("https://id.atlassian.com/manage-profile/security/api-tokens  ->  \"Crear token de API\" (sin alcances).");
    if (cfg.baseUrl) await pingSite(cfg.baseUrl);
    if (!DRY_RUN) return 1;
    log("\nVista previa de lo que se enviaría a Jira:");
    backlog.forEach((h) => log(`  ${h.hu}  ${h.summary}  (${h.story_points} pts · ${h.priority})`));
    log(`  Sprint "${SPRINT_NAME}": se crea, recibe las ${backlog.length} historias y se inicia por ${SPRINT_DAYS} días.`);
    const scenarios = backlog.map((h) => `${h.hu}: ${toADF(h.description).content.filter((b) => b.type === "bulletList").length}`);
    log(`  Descripciones en formato ADF, escenarios Dado que/Cuando/Entonces por historia -> ${scenarios.join(" · ")}`);
    log();
    printLanding(landing);
    return 0;
  }

  const jira = createClient(cfg);
  log(`\nRevisando ${cfg.baseUrl} (solo lectura)...`);
  const ctx = await inspectJira(jira, cfg);
  printContext(cfg, ctx, backlog);

  if (DRY_RUN) {
    log("\nPlan:");
    for (const h of backlog) {
      const key = ctx.existing.get(h.summary);
      log(`  ${key ? `= reutilizar ${key}` : "+ crear"}  ${h.hu}  ${h.summary}  (${h.story_points} pts · ${h.priority})`);
    }
    log(ctx.ownSprint
      ? `  = reutilizar el sprint ${ctx.ownSprint.id} "${SPRINT_NAME}" (estado: ${ctx.ownSprint.state})`
      : `  + crear el sprint "${SPRINT_NAME}" en el tablero ${cfg.boardId}`);
    log(`  > mover las ${backlog.length} historias al sprint e iniciarlo hoy por ${SPRINT_DAYS} días`);
    log(`\nTablero: ${boardUrl(cfg, ctx.project)}\n`);
    printLanding(landing);
    return 0;
  }

  log("\n1. Crear historias  (POST /rest/api/3/issue)");
  const stories = await createStories(jira, cfg, ctx, backlog);
  const keys = stories.map((s) => s.key);

  log("\n2. Crear el sprint  (POST /rest/agile/1.0/sprint)");
  let sprint = await ensureSprint(jira, cfg, ctx);

  log("\n3. Mover las historias al sprint  (POST /rest/agile/1.0/sprint/{sprintId}/issue)");
  await jira("POST", `/rest/agile/1.0/sprint/${sprint.id}/issue`, { issues: keys });
  log(`  > ${keys.join(", ")} -> sprint ${sprint.id}`);

  log("\n4. Iniciar el sprint  (POST /rest/agile/1.0/sprint/{sprintId})");
  sprint = await startSprint(jira, sprint);

  const final = await readBack(jira, ctx, sprint.id, keys);
  printReport(cfg, ctx, landing, stories, final);

  const allInSprint = keys.every((k) => final.issues.get(k)?.inSprint);
  return final.sprint.state === "active" && allInSprint ? 0 : 1;
}

/* process.exitCode en lugar de process.exit(): en Windows, salir con conexiones de fetch
   aún abiertas dispara una aserción de libuv ("UV_HANDLE_CLOSING") y el código 127. */
main()
  .then((code) => { process.exitCode = code; })
  .catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    const hint = hintFor(error);
    if (hint) console.error(hint);
    process.exitCode = 1;
  });
