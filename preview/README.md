# Vista local de análisis intrapotrero

Rama: `feature/intrapotrero-preview`.

```sh
npm run dev:intrapotrero
```

Abrir http://127.0.0.1:5180. El servidor escucha únicamente en la interfaz local.

Alternativa para ver una compilación estática (usada en la revisión local):

```sh
npm run build:intrapotrero
npm run preview:intrapotrero
```

Los comandos de esta vista usan el cargador nativo de configuración de Vite;
requieren una versión moderna de Node compatible con el proyecto (validado con 24).

La entrada `preview/intrapotrero.html` monta el layout real de TerraBovina y el
componente reutilizable `IntrapaddockAnalysis`. Usa un contexto de establecimiento
ficticio reemplazado solamente por `vite.intrapotrero.config.js`. No usa credenciales,
sessionStorage, API ni proxy. La tipografía puede solicitarse a Google Fonts, como
en el resto de la aplicación; el mapa es un SVG local y no carga imágenes externas.

La compilación habitual sigue usando `index.html`; no incluye los fixtures ni la
entrada de demostración. El detalle real del potrero incorpora el estado vacío del
panel hasta contar con un servicio de observaciones espaciales. No se cambian los
cálculos productivos ni se asignan observaciones simuladas a potreros reales.

## Interacciones

- Capa Vegetación: color por NDVI de la fecha, con escala fija entre 0,20 y 0,80.
- Capa Sectores: colores estables por identidad, sin interpretación agronómica.
- Selección por mapa, teclado o botones. Resumen y evolución por sector.
- Selector de fecha; el 1/9 no hay datos, el 5/9 hay cobertura completa, y el 20/9
  se observan 38 de 40 ha. Promedio del 20/9: 0,575789… (mostrado como 0,58).
- Sin datos se representa con trama y nunca se computa como cero.
- El histórico no une huecos ni muestra fechas posteriores a la seleccionada.
- El cambio por sector se compara con la fecha inmediatamente anterior, cuando
  ambas tienen datos. Se expresa en puntos de NDVI.

## Alcance y siguiente integración

Potrero, superficies, observaciones y geometría esquemática son ficticios. El mapa
no está georreferenciado y no permite deducir loma/bajo, suelo, biomasa ni causa de
una caída de NDVI. En esta demostración cada observación válida cubre un sector
completo: un contrato real debe incluir área efectivamente observada por sector y
fecha, control de nubes/sombras/agua, geometrías geográficas y procedencia/calidad.
Antes de conectar datos reales habrá que adaptar la ponderación a esa cobertura
parcial y reemplazar la vista esquemática por las geometrías del servicio GIS.

El modelo demo recibe `id`, `illustrative`, `dates` ISO y `sectors` con `id`, `name`,
`areaHa`, `schematicPath`, `labelAt`, `observations` (NDVI por fecha o `null`).
`schematicPath` y `labelAt` pertenecen exclusivamente a esta representación visual.

No se modifican stock, crecimiento, demanda ni autonomía. La conversión de señal
satelital a producción/forraje requiere calibración y validación independientes.
Esta rama no introduce backend, migraciones ni despliegues.
