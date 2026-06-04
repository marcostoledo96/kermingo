# 22 — Glosario simple

## Zod

Librería para validar datos.

Ejemplo: verificar que `metodo_pago` sea solo `transferencia` o `efectivo`.

## CartContext

Contexto de React que permite compartir el carrito entre pantallas.

Evita pasar el carrito manualmente componente por componente.

## Cookie httpOnly

Cookie que el navegador guarda pero JavaScript no puede leer.

Sirve para guardar sesión admin de forma más segura.

## CORS

Reglas que permiten o bloquean que el frontend en Vercel hable con el backend en Railway.

## Multer

Middleware de Express para recibir archivos enviados por formularios.

En este proyecto se usa con memoria temporal y después se sube a Google Drive.

## memoryStorage

Modo de Multer donde el archivo no se guarda en disco: queda como buffer temporal.

## Google Drive API

API para subir y consultar archivos en Drive desde el backend.

## Combo real

Producto de tipo combo que descuenta stock de otros productos internos.

## Token de seguimiento

Código privado que permite al cliente ver su pedido sin registrarse.
