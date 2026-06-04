# 11 — Google Drive para imágenes y comprobantes

## Decisión recomendada

Usar backend Express como intermediario.

```txt
Frontend → Backend con Multer memoryStorage → Google Drive API → MySQL
```

## Por qué no subir directo desde frontend

Subir directo desde navegador a Drive no es lo más conveniente porque:

- no se deben exponer credenciales de Google
- requiere OAuth o URLs firmadas
- complica seguridad
- complica validaciones
- no suma para el TP

## Multer memoryStorage

Usar Multer sin guardar en disco:

```txt
archivo queda temporalmente en memoria
se valida
se sube a Drive
se descarta
```

Ventajas:

- no depende del filesystem de Railway
- no requiere Railway Volume
- flujo simple
- más seguro que guardar archivos temporales

## Límites

Configurar:

```txt
tamaño máximo imágenes: 10 MB
tamaño máximo comprobantes: 10 MB
formatos imágenes: jpg, jpeg, png, webp
formatos comprobantes: jpg, jpeg, png, webp, pdf
```

## Imágenes de productos

Para consumir menos red del backend:

1. subir a Drive
2. hacer pública la imagen
3. guardar `url_publica`
4. frontend intenta mostrar URL directa

Si falla:

```txt
usar endpoint proxy como fallback
```

## Comprobantes

No conviene que sean públicos.

Recomendación:

- guardarlos en Drive
- no mostrarlos públicamente
- admin accede desde backend autenticado
- proxy solo cuando se abre comprobante

## Endpoints sugeridos

```txt
POST /api/admin/archivos/producto
GET  /api/archivos/producto/:id
POST /api/pedidos con comprobante
GET  /api/admin/archivos/:id/ver
```

## Variables de entorno

En Railway:

```txt
GOOGLE_DRIVE_CREDENTIALS_JSON={...}
GOOGLE_DRIVE_FOLDER_PRODUCTOS=...
GOOGLE_DRIVE_FOLDER_COMPROBANTES=...
```

En local:

```txt
backend/credentials/drive-credentials.json
```

Ese archivo debe estar en `.gitignore`.
