# SpaceFiber — Landing page

Sitio comercial de **SpaceFiber**, un proveedor de Internet por fibra óptica: planes,
cobertura, contratación y soporte. Está hecho como una página real de empresa, sin
fotografías: todos los gráficos son SVG e ilustraciones hechas con CSS.

Es un sitio estático listo para **GitHub Pages**: `index.html`, `styles.css` y `script.js`
en la raíz, sin compilación ni dependencias.

## Estructura

```
spacefiber-landing/
├── index.html                    Landing comercial (las 8 secciones)
├── styles.css                    Estilos de todo el sitio, escritos mobile-first
├── script.js                     Comportamiento de todo el sitio
├── proyecto.html                 Documentación Scrum: backlog, sprint y tablero Kanban
├── politica-de-privacidad.html   Página legal
├── terminos-y-condiciones.html   Página legal
├── backlog.json                  Las 5 historias de usuario del Sprint 1
├── scripts/
│   └── jira-sprint.mjs           Carga el backlog en Jira y arranca el sprint
├── .env.example                  Plantilla de credenciales de Jira (el .env real no se sube)
├── .nojekyll                     GitHub Pages sirve los archivos tal cual, sin Jekyll
├── README.md
└── .gitignore
```

`styles.css` está ordenado por bloques (tokens de diseño, reset, componentes, formulario,
Scrum, estructura y responsive) y `script.js` por módulos independientes (interfaz, preguntas
frecuentes, formulario, llamados a la acción y tablero). Cada módulo busca sus elementos y, si
la página no los tiene, no hace nada; por eso todas las páginas comparten los mismos dos archivos.

## Cómo verla

Abre `index.html` en el navegador. Si prefieres servirla en local:

```bash
python -m http.server 8080
```

## Secciones de la landing

1. **Encabezado** — logo, nombre, navegación, botón de contratación y cambio de tema.
2. **Propuesta de valor** — qué hacemos, qué problema resolvemos, para quién es y por qué elegirnos.
3. **Beneficios principales** — seis tarjetas con icono, título y descripción.
4. **Prueba social** — calificación, cifras y testimonios.
5. **Llamado a la acción** — banda destacada con los botones principales.
6. **Formulario de conversión** — validación en línea, mensajes de error y de éxito.
7. **Preguntas frecuentes** — acordeón accesible con teclado.
8. **Pie de página** — descripción, enlaces, redes, contacto, legales, copyright y créditos.

Entre ellas están además los planes, el "cómo funciona" y la cobertura. Todos los botones que
llevan al formulario lo resaltan al llegar, y los de cada plan lo dejan preseleccionado.

## Diseño responsive (mobile-first)

Las reglas base de `styles.css` son las del celular. `@media (min-width: 721px)` agrega el
diseño de tablet y `@media (min-width: 961px)` el de escritorio (menú en línea y rejillas de
tres y cuatro columnas). Hasta 960 px el menú es un botón hamburguesa.

## Scrum y Jira

`backlog.json` tiene las cinco historias del Sprint 1 — Entrega Landing Page, cada una con
criterios de aceptación en formato Dado que / Cuando / Entonces:

| HU | Historia | Puntos | Prioridad |
|----|----------|--------|-----------|
| HU1 | Formulario de conversión con validación de campos | 5 | High |
| HU2 | Encabezado interactivo, navegación y diseño responsive | 5 | High |
| HU3 | Preguntas frecuentes en acordeón interactivo | 2 | Medium |
| HU4 | Llamado a la acción principal con feedback visual | 3 | Medium |
| HU5 | Assets estáticos y despliegue en GitHub Pages | 3 | High |

`scripts/jira-sprint.mjs` las lleva a Jira con la API REST: crea las historias (tipo Story),
crea el sprint "Sprint 1 - Entrega Landing" en el tablero (Jira exige menos de 30 caracteres
en el nombre), mueve las historias al sprint y
lo inicia por 14 días. Al terminar imprime el estado de la landing, las claves de Jira y el
enlace al tablero.

1. Copia `.env.example` como `.env` y complétalo. El token se crea en
   <https://id.atlassian.com/manage-profile/security/api-tokens> con "Crear token de API"
   (el clásico, sin alcances).
2. Revisa qué hará, sin escribir nada: `node scripts/jira-sprint.mjs --dry-run`
3. Ejecútalo: `node scripts/jira-sprint.mjs`

Se puede volver a ejecutar sin duplicar nada: reutiliza las historias con el mismo título y el
sprint con el mismo nombre. Necesita Node 18 o superior.

`proyecto.html` muestra el mismo backlog y un tablero To Do / Doing / Done que guarda su estado
en el navegador.

## Notas

- El formulario valida en el navegador y simula el envío: no hay backend. Para conectarlo,
  reemplaza el bloque marcado en la sección 3 de `script.js` por la llamada a `POST /api/contacto`.
- Es un sitio de demostración de un proyecto formativo: los testimonios, las cifras y los
  datos de contacto son contenido de ejemplo, y así se indica en la página.
- La tipografía Inter se carga desde Google Fonts; sin conexión, la página usa el tipo de
  letra del sistema y se ve igual de ordenada.

## Publicar en GitHub Pages

1. Sube los cambios a la rama `main` del repositorio.
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos el sitio queda en `https://<usuario>.github.io/<repositorio>/`.

Todas las rutas son relativas, así que el sitio funciona dentro de esa subruta. `.env` está en
`.gitignore`: las credenciales de Jira nunca llegan al repositorio ni al sitio publicado.
