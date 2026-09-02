# TerraBovina Design System

## Direction

TerraBovina usa un lenguaje de “campo técnico”: oscuro, sereno y preciso. La interfaz debe sentirse propia del trabajo territorial sin recurrir a ornamentación temática. En superficies operativas, la claridad del estado y de la siguiente acción tiene prioridad sobre la expresión visual.

## Color

- Canvas: `#121614`; canvas profundo: `#0D100F`.
- Superficie: `#1B211E`; superficie elevada: `#202823`; superficie secundaria: `#171C19`.
- Acción y selección: `#2E6853`; hover: `#397A62`.
- Texto principal: `#EEE5D7`; texto secundario: `#C8BDA9`; metadatos: `#9F9687`.
- Tierra: `#5E4636`, reservado para matices de marca y series secundarias.
- Peligro: `#E4776E`; advertencia: `#D8AA62`.
- Los colores semánticos comunican estado. El verde de marca no debe indicar éxito cuando sólo significa acción o selección.

Los valores canónicos viven como variables y tokens Tailwind en `src/styles.css`. No agregar grises `stone` o `zinc` a componentes nuevos.

## Typography

Manrope es la única familia de interfaz. Los títulos usan peso `700` u `800` con tracking levemente negativo; controles y etiquetas usan `600` o `700`. Los datos usan números tabulares. El texto visible no baja de `12px`; instrucciones, errores y cuerpos usan al menos `14px`.

## Layout

- Contenido general: `.app-page`, máximo `1440px`.
- Shell: sidebar compacta en escritorio, drawer contenido en móvil y header móvil de `56px`.
- Densidad media-alta con separación clara entre secciones y agrupación compacta dentro de cada tarea.
- En móvil, tablas operativas se transforman en filas o tarjetas cuando las acciones quedarían fuera de alcance.
- Los mapas ocupan el espacio restante y sus controles respetan el offset del header móvil.

## Components

- `.app-panel` para agrupaciones con jerarquía real; evitar paneles anidados sin necesidad.
- `.app-panel-muted` para subgrupos y estados seleccionables.
- `.app-button-primary`, `.app-button-secondary`, `.app-button-ghost` y `.app-icon-button` son las variantes autorizadas.
- `.app-field` y `.app-label` forman el patrón de formulario.
- `.app-error`, `.app-empty` y `.app-skeleton` cubren error, vacío y carga.
- Radio, checkbox, enlaces y botones nativos conservan su semántica. Las tarjetas navegables son enlaces, no artículos simulando botones.

## States

Toda consulta diferencia carga, vacío, error y datos parciales. Un fallo de red nunca se presenta como “sin datos”. Las mutaciones esperan confirmación del backend, bloquean duplicados y conservan datos ingresados ante un error. Las operaciones secuenciales informan si el resultado quedó parcial.

## Accessibility

El foco visible usa `--focus`, con contraste y offset constantes. Los diálogos y drawers contienen el foco, responden a Escape y restauran el disparador. Los cambios asincrónicos usan `role="status"` o `role="alert"`. Los objetivos táctiles son de al menos `44px`. El dibujo de polígonos siempre ofrece edición y creación mediante coordenadas.

## Motion

Las transiciones duran entre `120ms` y `200ms` y sólo explican interacción o cambio de estado. No hay coreografía de carga. `prefers-reduced-motion` elimina desplazamientos y shimmer decorativo sin ocultar feedback de color o foco.

## Data Visualization

Las series usan la paleta rural extendida definida en `src/services/mappers.js` y `src/utils/mapConstants.js`. Cada gráfico incluye una descripción textual y valores accesibles sin depender exclusivamente de hover, color o puntero.
