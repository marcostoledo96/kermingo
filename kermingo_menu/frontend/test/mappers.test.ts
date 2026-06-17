import { describe, it, expect } from 'vitest'
import {
  pickProductIcon,
  deriveStockStatus,
  parseCategorias,
  mapProducto,
  mapPedido,
} from '@/lib/mappers'
import type { ApiProducto, ApiPedido } from '@/lib/types'

describe('pickProductIcon', () => {
  it('returns pizza icon for "Pizza muzza"', () => {
    expect(pickProductIcon('Pizza muzza', 'comida')).toBe('pizza')
  })

  it('returns sandwich icon for "Pancho"', () => {
    expect(pickProductIcon('Pancho', 'comida')).toBe('sandwich')
  })

  it('returns soda icon for "Coca Cola"', () => {
    expect(pickProductIcon('Coca Cola', 'bebida')).toBe('soda')
  })

  it('returns water icon for "Agua"', () => {
    expect(pickProductIcon('Agua mineral', 'bebida')).toBe('water')
  })

  it('returns coffee icon for "Café"', () => {
    expect(pickProductIcon('Café', 'bebida')).toBe('coffee')
  })

  it('returns cake icon for "Chocotorta" (comida default)', () => {
    expect(pickProductIcon('Chocotorta', 'comida')).toBe('cake')
  })

  it('returns combo for "Combo cena" (promo with combo keyword)', () => {
    expect(pickProductIcon('Combo cena', 'promo')).toBe('combo')
  })

  it('returns default icon by type when no keyword match', () => {
    expect(pickProductIcon('Algo raro', 'comida')).toBe('cake')
    expect(pickProductIcon('Algo raro', 'bebida')).toBe('soda')
    expect(pickProductIcon('Algo raro', 'promo')).toBe('combo')
  })
})

describe('deriveStockStatus', () => {
  it('returns ilimitado when stockLimitado is 0', () => {
    expect(deriveStockStatus(0, 100, 5)).toBe('ilimitado')
    expect(deriveStockStatus(0, 0, 5)).toBe('ilimitado')
  })

  it('returns agotado when stockLimitado is 1 and stockActual is 0', () => {
    expect(deriveStockStatus(1, 0, 5)).toBe('agotado')
  })

  it('returns agotado when stockLimitado is 1 and stockActual is negative', () => {
    expect(deriveStockStatus(1, -1, 5)).toBe('agotado')
  })

  it('returns bajo when stockActual <= stockMinimoAlerta', () => {
    expect(deriveStockStatus(1, 5, 5)).toBe('bajo')
    expect(deriveStockStatus(1, 1, 5)).toBe('bajo')
  })

  it('returns disponible when stockActual > stockMinimoAlerta', () => {
    expect(deriveStockStatus(1, 10, 5)).toBe('disponible')
  })

  it('returns disponible when stockLimitado is 1 and stockActual is null', () => {
    expect(deriveStockStatus(1, null, 5)).toBe('disponible')
  })
})

describe('parseCategorias', () => {
  it('returns empty array for null', () => {
    expect(parseCategorias(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(parseCategorias(undefined)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseCategorias('')).toEqual([])
  })

  it('returns ["merienda"] for "Merienda"', () => {
    expect(parseCategorias('Merienda')).toEqual(['merienda'])
  })

  it('returns ["cena"] for "Cena"', () => {
    expect(parseCategorias('Cena')).toEqual(['cena'])
  })

  it('returns ["merienda", "cena"] for "Merienda, Cena"', () => {
    expect(parseCategorias('Merienda, Cena')).toEqual(['merienda', 'cena'])
  })

  it('handles lowercase', () => {
    expect(parseCategorias('merienda, CENA')).toEqual(['merienda', 'cena'])
  })

  it('skips unknown categories', () => {
    expect(parseCategorias('Merienda, Otro, Cena')).toEqual(['merienda', 'cena'])
  })
})

describe('mapProducto', () => {
  it('maps a full product correctly', () => {
    const api: ApiProducto = {
      id: 1,
      nombre: 'Pizza muzza',
      descripcion: 'Porción clásica',
      precio: '3500.00',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 3,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    }
    const p = mapProducto(api)
    expect(p.id).toBe('1')
    expect(p.name).toBe('Pizza muzza')
    expect(p.description).toBe('Porción clásica')
    expect(p.price).toBe(3500)
    expect(p.type).toBe('comida')
    expect(p.meals).toEqual(['cena'])
    expect(p.stock).toBe('disponible')
    expect(p.icon).toBe('pizza')
  })

  it('handles null description', () => {
    const api: ApiProducto = {
      id: 2,
      nombre: 'Item',
      descripcion: null,
      precio: '100.00',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 2,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: null,
    }
    const p = mapProducto(api)
    expect(p.description).toBe('')
    expect(p.meals).toEqual([])
  })

  it('handles number precio', () => {
    const api: ApiProducto = {
      id: 3,
      nombre: 'Item',
      descripcion: 'x',
      precio: 100,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 2,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Merienda, Cena',
    }
    const p = mapProducto(api)
    expect(p.price).toBe(100)
    expect(p.meals).toEqual(['merienda', 'cena'])
  })

  it('converts relative imagen_url to absolute URL', () => {
    const api: ApiProducto = {
      id: 4,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: 42,
      imagen_nombre_original: 'pic.jpg',
      imagen_mime_type: 'image/jpeg',
      imagen_tamanio_bytes: 1234,
      imagen_url: '/api/productos/4/imagen?v=42',
      categorias: 'Cena',
    }
    const p = mapProducto(api)
    expect(p.image).toBe('http://localhost:3001/api/productos/4/imagen?v=42')
  })

  it('returns undefined image when imagen_url is null', () => {
    const api: ApiProducto = {
      id: 5,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    }
    const p = mapProducto(api)
    expect(p.image).toBeUndefined()
  })
})

describe('mapPedido', () => {
  it('maps a full pedido with items', () => {
    const api: ApiPedido = {
      id: 1,
      numero: 'KMG-0001',
      token_seguimiento: 'abc123',
      origen: 'online',
      nombre_cliente: 'Test',
      mesa: '5',
      telefono_cliente: '123',
      telefono_whatsapp: '123',
      estado_pedido: 'recibido',
      estado_pago: 'pendiente',
      metodo_pago: 'efectivo',
      total: '5000.00',
      observaciones: null,
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items: [
        {
          producto_id: 10,
          nombre_producto: 'Pizza',
          precio_unitario: '2500.00',
          cantidad: 2,
          subtotal: '5000.00',
        },
      ],
    }
    const p = mapPedido(api)
    expect(p.id).toBe(1)
    expect(p.numero).toBe('KMG-0001')
    expect(p.token).toBe('abc123')
    expect(p.name).toBe('Test')
    expect(p.method).toBe('efectivo')
    expect(p.total).toBe(5000)
    expect(p.count).toBe(2)
    expect(p.items).toHaveLength(1)
    expect(p.items[0].nombre).toBe('Pizza')
    expect(p.items[0].cantidad).toBe(2)
  })

  it('handles empty items', () => {
    const api: ApiPedido = {
      id: 2,
      numero: 'KMG-0002',
      token_seguimiento: 'def456',
      origen: 'caja',
      nombre_cliente: 'Test 2',
      mesa: null,
      telefono_cliente: null,
      telefono_whatsapp: null,
      estado_pedido: 'listo',
      estado_pago: 'pagado',
      metodo_pago: 'transferencia',
      total: '0',
      observaciones: null,
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items: [],
    }
    const p = mapPedido(api)
    expect(p.count).toBe(0)
    expect(p.items).toEqual([])
    expect(p.table).toBe('')
  })
})
