import { describe, it, expect } from '@jest/globals'

// Schema tests don't need DB — they validate Zod schemas directly
import {
  adminProductoQuerySchema,
  reordenarSchema,
  createProductoSchema,
  updateProductoSchema,
} from '../src/api/schemas/producto.schema.js'

import {
  updateConfiguracionSchema,
} from '../src/api/schemas/configuracion.schema.js'

// Model SQL builder — also no DB needed
import { buildWhereAdmin } from '../src/api/models/producto.model.js'

describe('adminProductoQuerySchema — estado filter values', () => {
  it('accepts activo', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'activo' })
    expect(r.estado).toBe('activo')
  })

  it('accepts inactivo (backward compat)', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'inactivo' })
    expect(r.estado).toBe('inactivo')
  })

  it('accepts desactivado', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'desactivado' })
    expect(r.estado).toBe('desactivado')
  })

  it('accepts agotado', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'agotado' })
    expect(r.estado).toBe('agotado')
  })

  it('accepts todavia_no_disponible', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'todavia_no_disponible' })
    expect(r.estado).toBe('todavia_no_disponible')
  })

  it('accepts todos', () => {
    const r = adminProductoQuerySchema.parse({ estado: 'todos' })
    expect(r.estado).toBe('todos')
  })

  it('defaults estado to undefined', () => {
    const r = adminProductoQuerySchema.parse({})
    expect(r.estado).toBeUndefined()
  })

  it('rejects invalid estado', () => {
    const r = adminProductoQuerySchema.safeParse({ estado: 'borrado' })
    expect(r.success).toBe(false)
  })
})

describe('reordenarSchema', () => {
  it('accepts valid reorder payload', () => {
    const r = reordenarSchema.parse({
      ordenes: [
        { id: 1, orden: 0 },
        { id: 2, orden: 1 },
        { id: 3, orden: 2 },
      ],
    })
    expect(r.ordenes).toHaveLength(3)
  })

  it('rejects empty ordenes array', () => {
    const r = reordenarSchema.safeParse({ ordenes: [] })
    expect(r.success).toBe(false)
  })

  it('rejects negative orden', () => {
    const r = reordenarSchema.safeParse({ ordenes: [{ id: 1, orden: -1 }] })
    expect(r.success).toBe(false)
  })

  it('rejects non-integer orden', () => {
    const r = reordenarSchema.safeParse({ ordenes: [{ id: 1, orden: 1.5 }] })
    expect(r.success).toBe(false)
  })

  it('rejects missing id', () => {
    const r = reordenarSchema.safeParse({ ordenes: [{ orden: 0 }] })
    expect(r.success).toBe(false)
  })
})

describe('createProductoSchema — disponible and orden', () => {
  it('accepts disponible=0 (todavia no disponible)', () => {
    const r = createProductoSchema.parse({
      nombre: 'Test',
      precio: 100,
      tipo: 'comida',
      categorias: ['Merienda'],
      stock_limitado: 1,
      disponible: 0,
    })
    expect(r.disponible).toBe(0)
  })

  it('defaults disponible to 1', () => {
    const r = createProductoSchema.parse({
      nombre: 'Test',
      precio: 100,
      tipo: 'comida',
      categorias: ['Merienda'],
      stock_limitado: 1,
    })
    expect(r.disponible).toBe(1)
  })

  it('accepts orden', () => {
    const r = createProductoSchema.parse({
      nombre: 'Test',
      precio: 100,
      tipo: 'comida',
      categorias: ['Merienda'],
      stock_limitado: 1,
      orden: 5,
    })
    expect(r.orden).toBe(5)
  })

  it('rejects invalid disponible value', () => {
    const r = createProductoSchema.safeParse({
      nombre: 'Test',
      precio: 100,
      tipo: 'comida',
      categorias: ['Merienda'],
      stock_limitado: 1,
      disponible: 2,
    })
    expect(r.success).toBe(false)
  })
})

describe('updateProductoSchema — disponible and orden', () => {
  it('accepts parcial update with disponible', () => {
    const r = updateProductoSchema.parse({ disponible: 0 })
    expect(r.disponible).toBe(0)
  })

  it('accepts parcial update with orden', () => {
    const r = updateProductoSchema.parse({ orden: 10 })
    expect(r.orden).toBe(10)
  })

  it('rejects negative orden', () => {
    const r = updateProductoSchema.safeParse({ orden: -1 })
    expect(r.success).toBe(false)
  })

  it('rejects invalid disponible', () => {
    const r = updateProductoSchema.safeParse({ disponible: 3 })
    expect(r.success).toBe(false)
  })
})

describe('updateConfiguracionSchema — categoria_default', () => {
  it('accepts merienda', () => {
    const r = updateConfiguracionSchema.parse({ categoria_default: 'merienda' })
    expect(r.categoria_default).toBe('merienda')
  })

  it('accepts cena', () => {
    const r = updateConfiguracionSchema.parse({ categoria_default: 'cena' })
    expect(r.categoria_default).toBe('cena')
  })

  it('rejects invalid categoria_default', () => {
    const r = updateConfiguracionSchema.safeParse({ categoria_default: 'almuerzo' })
    expect(r.success).toBe(false)
  })

  it('categoria_default is optional', () => {
    const r = updateConfiguracionSchema.parse({ estado: 'abierta' })
    expect(r.categoria_default).toBeUndefined()
  })

  it('accepts combined update with estado and categoria_default', () => {
    const r = updateConfiguracionSchema.parse({ estado: 'abierta', categoria_default: 'cena' })
    expect(r.estado).toBe('abierta')
    expect(r.categoria_default).toBe('cena')
  })
})

describe('buildWhereAdmin — estado SQL conditions', () => {
  it('activo: excludes sold-out and unavailable products', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'activo' }, values)
    // Must include activo=1, disponible=1, and stock not exhausted
    expect(sql).toContain('p.activo = 1')
    expect(sql).toContain('p.disponible = 1')
    expect(sql).toContain('p.stock_limitado = 0 OR p.stock_actual IS NULL OR p.stock_actual > 0')
    // Must NOT include activo=0 or disponible=0
    expect(sql).not.toContain('p.activo = 0')
  })

  it('agotado: includes only available products that are sold out', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'agotado' }, values)
    // Must include activo=1, disponible=1, stock_limitado=1, stock_actual<=0
    expect(sql).toContain('p.activo = 1')
    expect(sql).toContain('p.disponible = 1')
    expect(sql).toContain('p.stock_limitado = 1')
    expect(sql).toContain('p.stock_actual <= 0')
  })

  it('agotado: does NOT include no_disponible products', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'agotado' }, values)
    // Must require disponible=1, never disponible=0
    expect(sql).toContain('p.disponible = 1')
    expect(sql).not.toContain('p.disponible = 0')
  })

  it('todavia_no_disponible: includes active but unavailable products', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'todavia_no_disponible' }, values)
    expect(sql).toContain('p.activo = 1')
    expect(sql).toContain('p.disponible = 0')
  })

  it('desactivado: includes only inactive products', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'desactivado' }, values)
    expect(sql).toContain('p.activo = 0')
    expect(sql).not.toContain('p.disponible')
  })

  it('inactivo: alias for desactivado', () => {
    const values = []
    const sql = buildWhereAdmin({ estado: 'inactivo' }, values)
    expect(sql).toContain('p.activo = 0')
  })

  it('todos or undefined: no estado filter', () => {
    const values = []
    const sql1 = buildWhereAdmin({ estado: 'todos' }, values)
    expect(sql1).not.toContain('p.activo')
    expect(sql1).not.toContain('p.disponible')

    const sql2 = buildWhereAdmin({}, values)
    expect(sql2).not.toContain('p.activo')
    expect(sql2).not.toContain('p.disponible')
  })
})