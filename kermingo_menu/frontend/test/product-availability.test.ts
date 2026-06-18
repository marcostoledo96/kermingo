import { describe, it, expect } from 'vitest'
import { deriveStockStatus, mapProducto } from '@/lib/mappers'
import type { ApiProducto } from '@/lib/types'

describe('deriveStockStatus — no_disponible', () => {
  it('returns no_disponible when disponible=0', () => {
    expect(deriveStockStatus(1, 50, 5, 0)).toBe('no_disponible')
  })

  it('returns no_disponible regardless of stock when disponible=0', () => {
    // Even with stock available, not available means no_disponible
    expect(deriveStockStatus(1, 100, 5, 0)).toBe('no_disponible')
  })

  it('returns no_disponible when disponible=false (boolean)', () => {
    expect(deriveStockStatus(1, 50, 5, false)).toBe('no_disponible')
  })

  it('returns agotado when disponible=1 and stock=0', () => {
    expect(deriveStockStatus(1, 0, 5, 1)).toBe('agotado')
  })

  it('returns disponible when disponible=1 and stock>min', () => {
    expect(deriveStockStatus(1, 10, 5, 1)).toBe('disponible')
  })

  it('returns bajo when disponible=1 and stock<=min', () => {
    expect(deriveStockStatus(1, 3, 5, 1)).toBe('bajo')
  })

  it('returns ilimitado when stockLimitado=0 and disponible=1', () => {
    expect(deriveStockStatus(0, null, 5, 1)).toBe('ilimitado')
  })

  it('prioritizes no_disponible over agotado', () => {
    expect(deriveStockStatus(1, 0, 5, 0)).toBe('no_disponible')
  })

  // Alignment with backend estado filters:
  // activo = activo=1 AND disponible=1 AND (stock_limitado=0 OR stock IS NULL OR stock>0)
  // agotado = activo=1 AND disponible=1 AND stock_limitado=1 AND stock<=0

  it('activo filter alignment: disponible=1 + stock>0 = disponible (not agotado)', () => {
    // This product would appear in "activo" filter on the backend
    expect(deriveStockStatus(1, 10, 5, 1)).toBe('disponible')
  })

  it('activo filter alignment: disponible=1 + unlimited stock = ilimitado (still in activo)', () => {
    // Unlimited stock products are always available
    expect(deriveStockStatus(0, null, 5, 1)).toBe('ilimitado')
  })

  it('agotado filter excludes no_disponible: disponible=0 is no_disponible, not agotado', () => {
    // A product with disponible=0 is NOT agotado; it's no_disponible
    // The backend agotado filter requires disponible=1
    expect(deriveStockStatus(1, 0, 5, 0)).toBe('no_disponible')
  })

  it('agotado filter alignment: disponible=1 + stock_limitado=1 + stock=0 = agotado', () => {
    // This product would appear in "agotado" filter on the backend
    expect(deriveStockStatus(1, 0, 5, 1)).toBe('agotado')
  })

  it('agotado filter alignment: disponible=1 + stock_limitado=1 + stock<0 = agotado', () => {
    // Negative stock edge case — still agotado
    expect(deriveStockStatus(1, -1, 5, 1)).toBe('agotado')
  })

  it('activo filter excludes agotado: product with stock=0 is agotado, not disponible', () => {
    // Backend activo filter excludes this (stock_limitado=1, stock_actual=0)
    expect(deriveStockStatus(1, 0, 5, 1)).toBe('agotado')
    // Verify it's NOT 'disponible'
    expect(deriveStockStatus(1, 0, 5, 1)).not.toBe('disponible')
  })
})

describe('mapProducto — disponible and orden fields', () => {
  const baseProduct: ApiProducto = {
    id: 1,
    nombre: 'Pizza muzza',
    descripcion: 'Porción clásica',
    precio: '3500.00',
    tipo: 'comida',
    stock_limitado: 1,
    stock_actual: 30,
    stock_minimo_alerta: 5,
    activo: 1,
    disponible: 1,
    orden: 3,
    imagen_archivo_id: null,
    imagen_nombre_original: null,
    imagen_mime_type: null,
    imagen_tamanio_bytes: null,
    imagen_url: null,
    categorias: 'Cena',
  }

  it('maps disponible=1 to available=true', () => {
    const p = mapProducto({ ...baseProduct, disponible: 1 })
    expect(p.available).toBe(true)
  })

  it('maps disponible=0 to available=false', () => {
    const p = mapProducto({ ...baseProduct, disponible: 0 })
    expect(p.available).toBe(false)
  })

  it('maps disponible=0 to stock=no_disponible', () => {
    const p = mapProducto({ ...baseProduct, disponible: 0, stock_actual: 50 })
    expect(p.stock).toBe('no_disponible')
  })

  it('maps orden field', () => {
    const p = mapProducto({ ...baseProduct, orden: 7 })
    expect(p.order).toBe(7)
  })

  it('defaults orden to 0 when undefined', () => {
    const p = mapProducto({ ...baseProduct, orden: 0 })
    expect(p.order).toBe(0)
  })

  it('maps disponible=1 with stock=0 to agotado (not no_disponible)', () => {
    const p = mapProducto({ ...baseProduct, disponible: 1, stock_actual: 0 })
    expect(p.stock).toBe('agotado')
    expect(p.available).toBe(true)
  })
})