import { describe, it, expect } from 'vitest'
import { getActions } from '../lib/cocina-actions'
import type { OrderStatus } from '../lib/admin'

describe('getActions (cocina agile transitions)', () => {
  it('recibido: primary Empezar, secondary Listo directo', () => {
    const actions = getActions('recibido')
    expect(actions).toHaveLength(2)
    expect(actions[0].label).toBe('Empezar')
    expect(actions[0].next).toBe('preparacion')
    expect(actions[0].variant).toBe('primary')
    expect(actions[0].icon).toBeDefined()

    expect(actions[1].label).toBe('Listo directo')
    expect(actions[1].next).toBe('listo')
    expect(actions[1].variant).toBe('secondary')
    expect(actions[1].icon).toBeDefined()
  })

  it('preparacion: secondary Volver a recibido, primary Marcar listo', () => {
    const actions = getActions('preparacion')
    expect(actions).toHaveLength(2)
    expect(actions[0].label).toBe('Volver a recibido')
    expect(actions[0].next).toBe('recibido')
    expect(actions[0].variant).toBe('secondary')
    expect(actions[0].icon).toBeDefined()

    expect(actions[1].label).toBe('Marcar listo')
    expect(actions[1].next).toBe('listo')
    expect(actions[1].variant).toBe('primary')
    expect(actions[1].icon).toBeDefined()
  })

  it('listo: secondary Volver a preparación, primary Entregado (with confirm)', () => {
    const actions = getActions('listo')
    expect(actions).toHaveLength(2)
    expect(actions[0].label).toBe('Volver a preparación')
    expect(actions[0].next).toBe('preparacion')
    expect(actions[0].variant).toBe('secondary')
    expect(actions[0].icon).toBeDefined()

    expect(actions[1].label).toBe('Entregado')
    expect(actions[1].next).toBe('entregado')
    expect(actions[1].variant).toBe('primary')
    expect(actions[1].confirm).toBe('¿Marcar como entregado? Ya no se puede volver atrás.')
    expect(actions[1].icon).toBeDefined()
  })

  it('entregado: no actions (terminal state)', () => {
    expect(getActions('entregado')).toEqual([])
  })

  it('cancelado: no actions (terminal state)', () => {
    expect(getActions('cancelado')).toEqual([])
  })

  it('all actions have valid next states', () => {
    const validStates: Set<string> = new Set([
      'recibido', 'preparacion', 'listo', 'entregado',
    ])
    const statuses: OrderStatus[] = ['recibido', 'preparacion', 'listo']
    for (const s of statuses) {
      for (const a of getActions(s)) {
        expect(validStates.has(a.next)).toBe(true)
      }
    }
  })

  it('confirm is only set on entregado action', () => {
    for (const s of ['recibido', 'preparacion'] as OrderStatus[]) {
      for (const a of getActions(s)) {
        expect(a.confirm).toBeUndefined()
      }
    }
    const listoActions = getActions('listo')
    const entregadoAction = listoActions.find((a) => a.next === 'entregado')
    expect(entregadoAction?.confirm).toBeDefined()
  })
})