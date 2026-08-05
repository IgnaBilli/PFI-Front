# Testeo end-to-end contra producción — detalle

Ejecutado con `curl` directo contra `https://backendterrabovina-production.up.railway.app/api/v2`, usando exactamente los mismos payloads que arma el frontend (`src/services/*.js` + `src/services/mappers.js`). Sin mocks. Usuario y datos generados en esta corrida: `e2e-1785940630@example.com` / `id_usuario=8` / `id_estancia=9`.

## Corrida 1 (bloqueada por bug #1 — JWT_SECRET)

| Paso | Resultado |
|---|---|
| `POST /auth/registro` | 201, `{usuario, mensaje}` |
| `POST /auth/login` | **500** `{"error":"Error interno del servidor."}` |

Todo lo que dependía de un token quedó en 401 ("Token de sesión no provisto.") en cascada. Diagnóstico: `signToken()` en `auth.controller.js` es la única función de `login()` sin equivalente en `registro()`, y usa `process.env.JWT_SECRET` sin fallback. Confirmado por descarte (mismo `SELECT`/`UPDATE`/`bcrypt` que `registro`, que sí funcionaba) y por el formato exacto del 500 (coincide con el handler genérico de `app.js`). Corregido por el usuario agregando `JWT_SECRET` en las variables de entorno de Railway.

## Corrida 2 (login OK, bloqueada por bug #2 — migraciones de traslado)

```
POST /auth/registro                                          → 201
POST /auth/login                                              → 200 {usuario, token}
GET  /estancia                                                → 404 (sin estancia todavía)
POST /estancia                                                → 201 id_estancia=9, geom ida y vuelta OK
GET  /estancia                                                → 200
POST /estancia/9/potrero        ("Potrero E2E")                → 201 id_potrero=3, activo=1
GET  /estancia/9/potrero                                      → 200 [potrero 3]
POST /estancia/9/ganado         (NOVILLO, sin potrero)         → 201 id_ganado=1, id_potrero_actual=null
POST /potrero/3/ganado          (VACA, condicion_corporal=3.5) → 201 id_ganado=2, id_potrero_actual=3,
                                                                       potrero_actual_nombre="Potrero E2E"
GET  /estancia/9/ganado                                        → 200 [ambos animales, campos correctos]
PATCH /ganado/1                 (peso_kg: 400)                 → 200
POST /asignacion-ganado         (id_potrero=3, id_ganado=[1])  → 201 [asignación creada]
POST /estancia/9/potrero        ("Potrero E2E 2")               → 201 id_potrero=4
POST /potrero/3/traslado-ganado (destino=4, ganado=[1])         → 500  ← bug #2
PATCH /ganado                   (bulk categoria → TORO)         → 200 {updated:true, actualizados:[...]}
GET  /potrero/3/estimacion-forrajera/historico                  → 200 {disponibilidad:[], mensaje:"..."}
GET  /potrero/3/estimacion-nutricional/historico                → 200 {estimaciones:[], mensaje:"..."}
GET  /potrero/4/recomendacion?vigente=true                      → 200 []
POST /ganado/baja               (id_ganado=[2])                 → 200 {deleted:true, eliminados:[2]}
DELETE /potrero/4                                                → 200 {deleted:true, animalesDesvinculados:0}
DELETE /potrero/4?confirm=true                                  → 200
```

`estimacion-forrajera`/`estimacion-nutricional`/`recomendacion` confirman la corrección de §4.1 del estado actual: 200 con array vacío envuelto, nunca 404.

Diagnóstico del 500 en `traslado-ganado`: se probaron además `GET /traslado-ganado` (listado, sin depender de ningún dato existente) y `GET /ganado/1/recorrido` — **ambos 500 también**, lo que descarta un bug de lógica (esos casos devuelven 400) y apunta a algo estructural: las tablas no existían en la base de producción. Confirmado y corregido por el usuario corriendo `db:migrate` contra producción.

## Corrida 3 (re-test tras migrar)

```
GET  /traslado-ganado                                           → 200 {data:[], total:0}
GET  /ganado/1/recorrido                                        → 200 []
POST /potrero/3/traslado-ganado (destino=4, ganado=[1])          → 201
  {
    "id_traslado": 1,
    "potrero_origen": {"id_potrero":3,"nombre":"Potrero E2E"},
    "potrero_destino": {"id_potrero":4,"nombre":"Potrero E2E 2"},
    "detalles": [{"id_ganado":1,"numero_identificacion":"E2E-NOV-1","categoria":"TORO",
                  "id_asignacion_origen":2,"id_asignacion_destino":3}]
  }
GET  /estancia/9/ganado                                          → 200
  animal id_ganado=1 ahora con id_potrero_actual=4, potrero_actual_nombre="Potrero E2E 2"
```

Traslado funcionando end-to-end: cierra la asignación en el potrero origen, abre una nueva en el destino, y el animal aparece con el potrero correcto en el listado general. **Con esto, los 20 endpoints de §3 del estado actual quedaron validados contra producción real.**

## Intento de limpieza (bug #3 — DELETE /estancia con historial de traslados)

```
DELETE /estancia/9                 (sin confirm) → 409 {requiresConfirmation:true, potrerosAfectados:2, ganadoAfectado:1}
DELETE /estancia/9?confirm=true                  → 500  ← bug #3
GET    /estancia                                  → 200 (la estancia sigue existiendo, la transacción hizo rollback)
```

Causa: `estancia.controller.js#remove()` borra `recomendacion`, `asignacion_ganado`, `ganado` y `potrero` en cascada pero nunca borra `traslado_ganado`, que referencia `potrero` con `onDelete: RESTRICT` (y `traslado_ganado_detalle` referencia `ganado`/`asignacion_ganado` también con `RESTRICT`). Al existir el traslado creado en la corrida 3, el `DELETE` viola esas FK y la transacción explota. Detalle y fix sugerido en `ESTADO_ACTUAL.md` §6.

**Resultado:** no se pudo limpiar `id_estancia=9` (usuario `id_usuario=8`) vía API. Sigue en producción con 2 potreros, 1 animal activo y 1 traslado. El usuario `id_usuario=7` de la corrida 1 no tiene datos asociados más allá de la fila en `usuario` (no hay endpoint de borrado de usuario en la API).
