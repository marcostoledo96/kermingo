# 10 — Carrito y localStorage

## Qué es CartContext

`CartContext` es un patrón de React para compartir el estado del carrito en toda la aplicación.

En vez de pasar productos manualmente de componente en componente, React guarda el carrito en un contexto global.

Ejemplo conceptual:

```txt
CartProvider
  ├── MenuScreen usa addItem()
  ├── FloatingCart usa total
  ├── CartScreen usa items
  └── CheckoutScreen usa cart
```

El prototipo v0 ya trae un `cart-context.tsx`. Conviene conservarlo y adaptarlo.

## Por qué usar localStorage

El cliente puede:

- cargar productos
- ir a hacer la transferencia
- cambiar de app
- volver al navegador

Si el carrito solo vive en memoria, se pierde.

Con localStorage:

```txt
carrito → localStorage → se recupera al volver
```

## Qué guardar

Guardar solo lo necesario:

```ts
type CartItem = {
  productoId: number
  nombre: string
  precio: number
  cantidad: number
  imagenUrl?: string
  stockLimitado: boolean
  stockActual?: number
}
```

## Qué NO guardar

No guardar:

- datos sensibles
- estado de pago real
- stock como verdad absoluta
- comprobante

El backend siempre valida stock real al confirmar.

## Al confirmar pedido

1. frontend envía carrito al backend
2. backend recalcula precios y stock
3. backend crea pedido
4. frontend limpia carrito si creación fue exitosa
5. frontend redirige a `/pedido/:token`

## Si hay error de stock

Backend devuelve error:

```json
{
  "ok": false,
  "error": "Pizza muzza no tiene stock suficiente"
}
```

Frontend muestra mensaje y refresca productos.
