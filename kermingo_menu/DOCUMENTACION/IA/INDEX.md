# Documentación IA — Kermingo

> Leer el doc correspondiente ANTES de escribir código en esa área.

---

## 📌 Esta estructura NO es rígida

La organización actual (14 archivos) **es solo un punto de partida**, inspirada en la documentación de PaginaGrupo. A medida que el proyecto crezca, algunos docs pueden **fusionarse** si su contenido se solapa, **dividirse** si un doc se vuelve demasiado largo, o **reorganizarse** según lo que tenga más sentido para Kermingo. Lo importante es que cada pregunta que un agente IA pueda hacerse tenga un doc que la responda, no la cantidad exacta de archivos.

**Regla**: si un doc nuevo se crea, se fusiona, se parte o se elimina, actualizar este `INDEX.md` para que el mapa documental siga siendo la fuente de verdad.

**Regla de `sdd-archive`**: al cerrar un change, revisar qué docs de `DOCUMENTACION/IA/` quedaron desactualizados y sincronizarlos. Si el change introdujo un concepto, endpoint, tabla o decisión nuevos, asegurarse de que tenga su lugar en la doc.

---

## Arquitectura y stack

| Pregunta | Archivo |
|---|---|
| ¿Cómo está organizado el proyecto? ¿Qué carpetas y capas existen? | `ARQUITECTURA.md` |
| ¿Cómo funciona cada endpoint HTTP? ¿Qué hace cada controller? | `API.md` |
| ¿Cómo funciona la lógica de negocio? ¿State machines, stock, combos, numeración? | `CORE.md` |
| ¿Cómo está la base de datos? ¿Pool, seed, tablas, índices? | `INFRA.md` |
| ¿Cómo está armado el frontend? ¿Rutas, componentes, carrito, diseño? | `WEBAPP.md` |

## Auth y seguridad

| Pregunta | Archivo |
|---|---|
| ¿Cómo funciona JWT, cookies, requireAdmin, CSRF? | `AUTENTICACION.md` |
| ¿Dónde están las credenciales y variables de entorno? | `SECRETS.md` |

## Funcionalidad y dominio

| Pregunta | Archivo |
|---|---|
| ¿Qué puede hacer cada rol? ¿Qué funcionalidades existen? | `FUNCIONALIDADES.md` |
| ¿Cómo es un flujo de punta a punta? | `FLUJOS.md` |
| ¿Qué significa este término? | `GLOSARIO.md` |

## Infraestructura y operaciones

| Pregunta | Archivo |
|---|---|
| ¿Cómo hacer el deploy? ¿Qué variables de entorno van? | `DEPLOY.md` |
| ¿Cómo correr los tests? ¿Cómo estructurar uno nuevo? | `TESTING.md` |

## Errores y decisiones

| Pregunta | Archivo |
|---|---|
| ¿Hay bugs o trampas conocidas? | `GOTCHAS.md` |