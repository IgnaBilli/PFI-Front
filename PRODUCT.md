# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Productores y responsables de establecimientos ganaderos en Argentina que necesitan controlar potreros, rodeos, disponibilidad forrajera, demanda nutricional y movimientos de ganado desde una interfaz operativa.

## Product Purpose

TerraBovina centraliza el estado territorial y productivo de una estancia para ayudar a tomar decisiones sobre carga animal, alimentación y traslados. El producto tiene éxito cuando una persona puede detectar una excepción, entender su contexto y actuar sin perder trazabilidad.

## Operating Context

La aplicación se usa como un panel autenticado en escritorio y móvil. Los flujos principales son crear la estancia y sus límites, dibujar potreros, registrar ganado, consultar estimaciones, revisar recomendaciones y trasladar animales.

## Capabilities and Constraints

- React 19, Vite, React Router, Tailwind CSS v4 y Leaflet.
- El backend expone una API REST bajo `/api/v2` con autenticación Bearer JWT.
- La sesión se almacena en `sessionStorage`.
- `GET /estancia` con estado 404 significa que el usuario todavía no completó el onboarding.
- Ganado y potreros se reciben como arreglos completos sin paginación.
- Los polígonos se envían como GeoJSON, en orden longitud-latitud y con el anillo cerrado.
- Los códigos de categoría, estado fisiológico y recomendación son contratos del dominio y no deben traducirse dentro de los payloads.
- Las eliminaciones pueden requerir una segunda confirmación mediante respuesta 409 y `confirm=true`.
- Las operaciones secuenciales por lote pueden completarse parcialmente si una solicitud intermedia falla.

## Brand Commitments

El nombre TerraBovina, el logotipo existente y la identidad rural oscura son vinculantes. La paleta aprobada usa `#121614`, `#1B211E`, `#245746`, `#2E6853`, `#5E4636`, `#DDD0BC` y `#B8AC96`. La voz es directa, sobria y en español rioplatense.

## Evidence on Hand

- Logotipos y favicon en `src/assets/` y `public/`.
- Guía de paleta y navegación en `docs/PaletaDeColores y logo.jpeg`.
- Capturas y documentación funcional en `docs/`.
- Datos reales provistos por la API; no se deben inventar métricas, estados productivos ni recomendaciones.

## Product Principles

- Mostrar primero lo que requiere atención.
- Diferenciar ausencia de datos de fallas del sistema.
- Preservar la precisión del dominio y la trazabilidad de las acciones.
- Mantener las tareas frecuentes claras en escritorio y móvil.
- Usar la marca para generar confianza, no para decorar información operativa.

## Accessibility & Inclusion

Los flujos principales deben poder recorrerse con teclado, conservar foco visible, anunciar errores y cambios de estado, y mantener objetivos táctiles y contraste adecuados.
