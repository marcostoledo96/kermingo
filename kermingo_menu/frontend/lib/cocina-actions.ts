import type { OrderStatus } from './admin'
import {
  Flame,
  Bell,
  ArrowLeft,
  Undo2,
  CheckCircle2,
} from 'lucide-react'

export type ActionDef = {
  label: string
  next: OrderStatus
  icon: typeof Flame
  variant: 'primary' | 'secondary'
  confirm?: string
}

/**
 * Returns the available actions for a cocina order based on its current status.
 * Supports agile transitions:
 *   - recibido → en_preparacion (primary), recibido → listo (secondary/direct)
 *   - en_preparacion → recibido (secondary/backward), en_preparacion → listo (primary)
 *   - listo → en_preparacion (secondary/backward), listo → entregado (primary, with confirm)
 *   - entregado: terminal, no actions
 *   - cancelado: terminal, no actions
 */
export function getActions(status: OrderStatus): ActionDef[] {
  switch (status) {
    case 'recibido':
      return [
        { label: 'Empezar', next: 'preparacion', icon: Flame, variant: 'primary' },
        { label: 'Listo directo', next: 'listo', icon: Bell, variant: 'secondary' },
      ]
    case 'preparacion':
      return [
        { label: 'Volver a recibido', next: 'recibido', icon: ArrowLeft, variant: 'secondary' },
        { label: 'Marcar listo', next: 'listo', icon: Bell, variant: 'primary' },
      ]
    case 'listo':
      return [
        { label: 'Volver a preparación', next: 'preparacion', icon: Undo2, variant: 'secondary' },
        { label: 'Entregado', next: 'entregado', icon: CheckCircle2, variant: 'primary', confirm: '¿Marcar como entregado? Ya no se puede volver atrás.' },
      ]
    default:
      return []
  }
}