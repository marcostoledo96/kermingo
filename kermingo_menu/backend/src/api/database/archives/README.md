# Archives — dumps anonimizados de Kermingo

## Política PII

- **Nunca** subir a git un dump RAW de producción (nombres, teléfonos, comprobantes reales).
- Solo se versionan archivos `*-anonymized.sql` (o `.sql.gz`) generados con el script de anonimización.
- El RAW debe quedar fuera del repo (máquina local o canal privado) y borrarse tras verificar el anonymized.

## Contenido de este archive

`2026-07-28-prod-anonymized.sql` es un snapshot **sanitizado y recuperable**:

- Schema + índices + seed de catálogo (productos, categorías, combos, admin demo).
- Pedidos sintéticos del evento (clientes/teléfonos/tokens fake).
- `configuracion_tienda` en `cerrada` con mensaje de archivo.
- Hash de admin = seed (`admin@kermingo.com` / `admin123`).
- Sin IDs reales de Google Drive.

Si más adelante Marcos aporta un RAW de Railway, regenerar con:

```bash
node backend/scripts/anonymize-dump.mjs /ruta/kermingo-prod-RAW.sql \
  backend/src/api/database/archives/YYYY-MM-DD-prod-anonymized.sql
```

## Restore local

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p kermingo < backend/src/api/database/archives/2026-07-28-prod-anonymized.sql
```

Alternativa vacía (sin pedidos de muestra):

```bash
mysql ... < schema.sql && mysql ... < indexes.sql && mysql ... < seed.sql
```

Ver `DOCUMENTACION/IA/REVIVIR-BACKEND.md`.
