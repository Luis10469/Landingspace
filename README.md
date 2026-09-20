# SpaceFiber — Landing page

Sitio comercial de **SpaceFiber**, un proveedor de Internet por fibra óptica: planes,
cobertura, contratación y soporte. Está hecho como una página real de empresa, sin
fotografías: todos los gráficos son SVG e ilustraciones hechas con CSS.

Todo el proyecto vive en esta única carpeta y no necesita compilación ni dependencias.

## Estructura

```
spacefiber-landing/
├── index.html                    Landing comercial (las 8 secciones)
├── proyecto.html                 Documentación Scrum: backlog, sprint y tablero Kanban
├── politica-de-privacidad.html   Página legal
├── terminos-y-condiciones.html   Página legal
├── assets/
│   ├── css/
│   │   ├── base.css              Tokens de diseño, reset y tipografía
│   │   ├── components.css        Botones, tarjetas, planes, acordeón, formulario, Kanban
│   │   └── layout.css            Cabecera, hero, rejillas, pie y responsive
│   └── js/
│       ├── ui.js                 Tema claro/oscuro, menú móvil, enlace activo, animaciones
│       ├── faq.js                Acordeón accesible
│       ├── form.js               Validación del formulario y sus estados
│       └── kanban.js             Tablero To Do / Doing / Done
├── README.md
└── .gitignore
```

Cada archivo tiene una sola responsabilidad: los estilos no mezclan tokens con componentes
ni con layout, y cada módulo de JavaScript controla una parte de la interfaz.

## Cómo verla

Abre `index.html` en el navegador. Si prefieres servirla en local:

```bash
python -m http.server 8080
```

## Secciones de la landing

1. **Encabezado** — logo, navegación y botón de contratación.
2. **Propuesta de valor** — qué hacemos, qué problema resolvemos, para quién es y por qué elegirnos.
3. **Planes** — tres tarifas con la tarifa destacada, más el bloque de "cómo funciona" y cobertura.
4. **Beneficios** — seis tarjetas con icono, título y descripción.
5. **Prueba social** — calificación, cifras y testimonios.
6. **Llamado a la acción** — banda destacada con los botones principales.
7. **Formulario de conversión** — validación en línea, mensajes de error y de éxito.
8. **Pie de página** — descripción, enlaces, redes, contacto, legales y copyright.

## Scrum (`proyecto.html`)

Documenta el recorrido `Backlog → Sprint 1 → To Do → Doing → Done`:

- **Backlog:** las cinco historias de usuario priorizadas, con sus criterios de aceptación.
- **Sprint 1:** objetivo, duración y puntos comprometidos.
- **Tablero:** las historias repartidas en las tres columnas; se mueven con las flechas de cada
  tarjeta y el estado queda guardado en el navegador.

| HU | Historia | Puntos | Estado inicial |
|----|----------|--------|----------------|
| HU-01 | Consultar planes y verificar cobertura | 5 | Done |
| HU-02 | Crear cuenta e iniciar sesión | 3 | Done |
| HU-03 | Contratar un plan en línea | 8 | Doing |
| HU-04 | Crear y seguir tickets de soporte | 5 | To Do |
| HU-05 | Administrar clientes, planes y zonas | 8 | To Do |

## Notas

- El formulario valida en el navegador y simula el envío: no hay backend. Para conectarlo,
  reemplaza el bloque marcado en `assets/js/form.js` por la llamada a `POST /api/contacto`.
- Es un sitio de demostración de un proyecto formativo: los testimonios, las cifras y los
  datos de contacto son contenido de ejemplo, y así se indica en la página.
- La tipografía Inter se carga desde Google Fonts; sin conexión, la página usa el tipo de
  letra del sistema y se ve igual de ordenada.

## Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "Landing page de SpaceFiber"
git branch -M main
git remote add origin https://github.com/USUARIO/spacefiber-landing.git
git push -u origin main
```

Después, en el repositorio: **Settings → Pages → Branch: main / root**.
