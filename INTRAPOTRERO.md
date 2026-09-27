# Análisis intrapotrero

Entrada: ficha del potrero → **Analizar intrapotrero** (`/potreros/:paddockId/intrapotrero`).

Permite dibujar ambientes regionales, declarar loma/media loma/bajo, aguadas, sombras y restricciones temporales; guardar versiones; consultar superficie pastoreable, crecimiento ponderado y preferencia orientativa. Las etiquetas del relieve no inventan coeficientes. El mapa de cercanía no mide presencia animal ni sobrepastoreo. El stock accesible es una aproximación por superficie.

- [Documentación completa: flujo, fórmulas, API, fuentes y relación con el PFI](https://github.com/JuanManuelSosa2004/BackendTerrabovina/blob/StockCalc/INTRAPOTRERO.md)
- [Respaldo y recuperación de la versión anterior](https://github.com/JuanManuelSosa2004/BackendTerrabovina/blob/StockCalc/INTRAPOTRERO-ROLLBACK.md)
- [Inventario de curvas y procedencia numérica](https://github.com/IgnaBilli/Flask/blob/StockCalc/INTRAPOTRERO-FUENTES.md)

Rama desplegada: `New-Front-Style`. Respaldo: tag `respaldo/pre-intrapotrero-20260927`, commit `1f53548953db5142ae3af0397a8a1645f0ccb6da`.

Validar con `npm test`, `npm run build` y ESLint sobre archivos modificados. Las pruebas de la página simulan mapa y API para verificar guardado y conflictos; revisar además el mapa real en navegador. Una falla al recalcular deja las zonas guardadas y permite reintentar. El historial restaura mediante una versión nueva, sin borrar las anteriores.
