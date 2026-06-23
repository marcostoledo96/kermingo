import { describe, expect, it } from 'vitest'
import { buildComprobantesQuery } from '@/components/admin/comprobantes-screen'

describe('buildComprobantesQuery', () => {
  it('defaults to transferencias online pending review, excluding cancelado server-side', () => {
    expect(buildComprobantesQuery('comprobante_subido')).toEqual({
      metodo_pago: 'transferencia',
      origen: 'online',
      limit: 100,
      excluir_estado_pedido: 'cancelado',
      estado_pago: 'comprobante_subido',
    })
  })

  it('requests rejected status for rejected tab', () => {
    expect(buildComprobantesQuery('rechazado')).toEqual({
      metodo_pago: 'transferencia',
      origen: 'online',
      limit: 100,
      excluir_estado_pedido: 'cancelado',
      estado_pago: 'rechazado',
    })
  })

  it('does not send estado_pago for all tab but still excludes cancelado', () => {
    expect(buildComprobantesQuery('all')).toEqual({
      metodo_pago: 'transferencia',
      origen: 'online',
      limit: 100,
      excluir_estado_pedido: 'cancelado',
    })
  })
})
