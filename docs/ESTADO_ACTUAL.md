# Estado actual — Integración TerraBovina Frontend ↔ API

**Rama:** `feat/api-consuming-integration`
**Fecha:** 2026-08-05
**API base:** `https://backendterrabovina-production.up.railway.app/api/v2`

Este documento resume qué se integró, qué se probó contra el backend real en producción, qué bugs se encontraron en el camino y qué queda pendiente. El detalle línea por línea del testeo end-to-end está en [`testing-e2e-produccion.md`](./testing-e2e-produccion.md).

## 1. Resumen ejecutivo

El frontend dejó de ser una demo con `localStorage` y pasó a consumir la API real de punta a punta: autenticación JWT, alta de estancia con dibujo de polígono, CRUD de potreros, alta/edición/baja de ganado (individual y masiva), asignación y traslado de ganado entre potreros, y lectura de analítica forrajera/nutricional/recomendaciones por potrero.

Se validó el flujo completo contra producción con `curl`, endpoint por endpoint, usando los mismos payloads exactos que arma el frontend. En el proceso aparecieron **3 bugs reales de configuración/código en el backend** (no del frontend): 2 ya se corrigieron en producción, 1 sigue abierto y bloquea la limpieza de los datos de prueba generados durante el testeo (ver §4).

## 2. Arquitectura de la integración

```
src/services/api.js          → cliente HTTP central (fetch + sessionStorage + manejo de errores/401)
src/services/mappers.js      → mapeo bidireccional dominio UI ↔ contrato API (ganado, potrero, geom)
src/services/authService.js       → POST /auth/login, POST /auth/registro
src/services/estanciaService.js   → GET /estancia, POST /estancia
src/services/paddockService.js    → GET/POST/PATCH/DELETE de potrero
src/services/cattleService.js     → GET/POST/PATCH/DELETE de ganado + asignación/traslado + bulk
src/services/analyticsService.js  → históricos forrajero/nutricional + recomendación vigente

src/context/AuthContext.jsx  → sesión (token/usuario) + estancia del usuario autenticado
src/components/RouteGuards.jsx → RequireAuth / RequireEstancia / RequireNoEstancia

src/hooks/useCattle.js            → GET ganado de la estancia (loading/error/reload)
src/hooks/usePaddocks.js          → GET potreros de la estancia (filtra los dados de baja)
src/hooks/usePaddockAnalytics.js  → analítica por potrero en paralelo, compartido por Resumen y Potreros

src/pages/OnboardingEstanciaPage.jsx → alta de estancia (nombre + polígono ≥3 vértices)
src/components/PolygonMapCanvas.jsx  → Leaflet reusado entre Mapa y Onboarding
src/components/ConfirmDialog.jsx     → reemplaza window.confirm
```

Páginas reescritas: `AuthPage`, `MapPage`, `CattlePage`, `PaddocksPage`, `SummaryPage`, `DashboardLayout`, `AddCattleModal`. `App.jsx`/`main.jsx` ahora montan `AuthProvider` y las rutas protegidas. `.env.example` documenta `VITE_API_URL`.

## 3. Endpoints integrados (35 llamados desde el frontend)

| Recurso | Endpoint | Uso en frontend |
|---|---|---|
| Auth | `POST /auth/registro` | Registro |
| Auth | `POST /auth/login` | Login |
| Estancia | `GET /estancia` | Resolver onboarding vs dashboard al loguear/recargar |
| Estancia | `POST /estancia` | Onboarding |
| Potrero | `POST /estancia/{id}/potrero` | Crear potrero (Mapa) |
| Potrero | `GET /estancia/{id}/potrero` | Listar potreros |
| Potrero | `PATCH /potrero/{id}` | Editar potrero |
| Potrero | `DELETE /potrero/{id}` (+`?confirm=true`) | Borrar potrero, con reintento ante 409 |
| Ganado | `POST /estancia/{id}/ganado` | Alta sin potrero |
| Ganado | `POST /potrero/{id}/ganado` | Alta asignada a un potrero |
| Ganado | `GET /estancia/{id}/ganado` | Listar todo el ganado |
| Ganado | `PATCH /ganado/{id}` | Edición individual |
| Ganado | `DELETE /ganado/{id}` | Baja individual |
| Ganado | `POST /ganado/baja` | Baja masiva |
| Ganado | `PATCH /ganado` | Cambio masivo de categoría |
| Asignación | `POST /asignacion-ganado` | Primera asignación (animal sin potrero previo) |
| Traslado | `POST /potrero/{origen}/traslado-ganado` | Mover animal ya asignado a otro potrero |
| Analítica | `GET /potrero/{id}/estimacion-forrajera/historico` | Pasto disponible |
| Analítica | `GET /potrero/{id}/estimacion-nutricional/historico` | Demanda nutricional |
| Analítica | `GET /potrero/{id}/recomendacion?vigente=true` | Recomendación pendiente |

## 4. Correcciones aplicadas tras leer el código fuente del backend

El enunciado original no especificaba el shape exacto de algunas respuestas; se asumió por analogía y **se corrigió después de leer `C:\Users\juanm\Desktop\Backend Terrabovina`**:

1. **Históricos de analítica vienen envueltos, no como array suelto**, y nunca devuelven 404 por "sin datos" (siempre 200):
   - `estimacion-forrajera/historico` → `{ disponibilidad: [...], mensaje? }`
   - `estimacion-nutricional/historico` → `{ estimaciones: [...], mensaje? }`
   - Corregido en `analyticsService.js` (antes se esperaba un array plano y se trataba 404 como "sin datos").
2. **`GET /estancia/{id}/potrero` devuelve también los potreros dados de baja** (borrado lógico, `activo:false`) — `potrero.repository.js#getPotrerosByEstancia` no filtra por `activo`. Se agregó el filtro en `usePaddocks.js` para que un potrero "eliminado" desaparezca de la UI.
3. **`condicion_corporal` es obligatoria al crear un animal `VACA`** (`ganado.controller.js#validarCamposGanado`, confirmado por el test `exige condicion_corporal para categoria VACA`). Se hizo obligatoria en `AddCattleModal.jsx` (antes era opcional).

## 5. Testeo end-to-end contra producción

Se ejecutó un script real (`curl`) contra la API en producción, no mocks, cubriendo: registro → login → alta de estancia → alta de 2 potreros → alta de ganado (con y sin potrero, categoría VACA y NOVILLO) → PATCH individual → asignación → traslado entre potreros → PATCH masivo de categoría → los 3 endpoints de analítica → baja masiva → borrado de potrero. **Todos los endpoints listados en §3 respondieron con el shape esperado por el frontend.** Detalle completo en [`testing-e2e-produccion.md`](./testing-e2e-produccion.md).

## 6. Bugs de backend encontrados durante el testeo

| # | Bug | Endpoint afectado | Estado |
|---|---|---|---|
| 1 | `JWT_SECRET` no seteada en las variables de entorno de Railway → `jwt.sign` explota → 500 en cualquier login | `POST /auth/login` | ✅ **Corregido** (variable agregada en Railway) |
| 2 | Migraciones `20260801000015`/`20260801000016` (tablas `traslado_ganado`/`traslado_ganado_detalle`) no corridas en la base de producción → 500 en cualquier endpoint de traslado | `POST/GET /traslado-ganado`, `GET /ganado/{id}/recorrido` | ✅ **Corregido** (`db:migrate` corrido contra producción) |
| 3 | `estancia.controller.js#remove()` borra `recomendacion`, `asignacion_ganado`, `ganado` y `potrero` en cascada, pero **nunca borra `traslado_ganado`**. Si la estancia tiene algún traslado registrado, el `DELETE FROM asignacion_ganado`/`ganado`/`potrero` viola las FK `RESTRICT` que `traslado_ganado`/`traslado_ganado_detalle` tienen hacia esas tablas → excepción no capturada → 500 | `DELETE /estancia/{id}?confirm=true` | ⚠️ **Abierto** — ver §7 |

Ninguno de los tres bugs es del repositorio frontend; los tres viven en `Backend Terrabovina`.

### Bug #3 — detalle y fix sugerido

Con datos de prueba que incluían un traslado, `DELETE /estancia/9?confirm=true` devuelve 500 (confirmado, reproducible). La cadena de FKs es:

- `traslado_ganado.id_potrero_origen/destino` → `potrero` (`onDelete: RESTRICT`)
- `traslado_ganado_detalle.id_ganado` → `ganado` (`onDelete: RESTRICT`)
- `traslado_ganado_detalle.id_asignacion_origen/destino` → `asignacion_ganado` (`onDelete: RESTRICT`)
- `traslado_ganado_detalle.id_traslado` → `traslado_ganado` (`onDelete: CASCADE`)

`remove()` (en `src/controllers/estancia.controller.js`) borra `asignacion_ganado`, `ganado` y `potrero` de la estancia sin borrar antes `traslado_ganado` — y como `traslado_ganado_detalle` cae en cascada al borrar su `traslado_ganado` padre, **agregar un solo `DELETE FROM \`traslado_ganado\` WHERE id_estancia = :id`** (antes de los deletes de `asignacion_ganado`/`ganado`/`potrero`, dentro de la misma transacción) resolvería el problema completo — no hace falta tocar `traslado_ganado_detalle` a mano.

## 7. Datos de prueba pendientes de limpieza

El testeo E2E creó datos reales en la base de producción:

- Usuario `id_usuario=7` (`e2e-1785940101@example.com`) — sin estancia asociada (el login falló en esa corrida antes de crear nada más). No hay endpoint `DELETE /usuarios/{id}` en la API; requiere borrado manual en la base si se quiere eliminar.
- Usuario `id_usuario=8` (`e2e-1785940630@example.com`) — tiene la estancia `id_estancia=9` ("Estancia E2E"), 2 potreros, 1 animal activo (`id_ganado=1`) y 1 registro de traslado. **No se pudo borrar vía API por el bug #3**: `DELETE /estancia/9?confirm=true` devuelve 500 en vez de limpiar todo en cascada.

Mientras el bug #3 siga abierto, la única forma de limpiar esta estancia es un borrado manual directo en la base de datos (en orden: `traslado_ganado_detalle` → `traslado_ganado` → `asignacion_ganado` → `ganado` → `potrero` → `estancia` → `usuario`), o aplicar el fix de §6 y reintentar el DELETE con `?confirm=true`.

## 8. Pendiente

- **Carpeta de tests automatizados** (`tests/`, con Vitest) para el frontend, análoga a `tests/*.test.js` del backend — se había pedido y quedó en pausa mientras se resolvía el bug de `JWT_SECRET`; no se retomó todavía.
- Aplicar (en el repo backend, si se desea) el fix de una línea descripto en §6 para el bug #3.
- Limpieza de los datos de prueba de producción descriptos en §7, una vez resuelto el bug #3 (o manualmente).

## 9. Build / lint

`npm run build` y `npm run lint` corren limpios sobre el estado actual del código (verificado antes y después de las correcciones de §4).
