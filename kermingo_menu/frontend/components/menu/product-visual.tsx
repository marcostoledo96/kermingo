import {
  Pizza,
  Sandwich,
  Drumstick,
  Sprout,
  CakeSlice,
  Cookie,
  Croissant,
  Donut,
  CupSoda,
  GlassWater,
  Coffee,
  Milk,
  IceCreamCone,
  Boxes,
  type LucideIcon,
} from 'lucide-react'
import type { ProductIcon } from '@/lib/products'

const ICONS: Record<ProductIcon, LucideIcon> = {
  pizza: Pizza,
  sandwich: Sandwich,
  drumstick: Drumstick,
  sprout: Sprout,
  cake: CakeSlice,
  cookie: Cookie,
  croissant: Croissant,
  donut: Donut,
  soda: CupSoda,
  water: GlassWater,
  coffee: Coffee,
  milk: Milk,
  icecream: IceCreamCone,
  combo: Boxes,
}

export function ProductIconGlyph({
  icon,
  className,
  strokeWidth = 2,
}: {
  icon: ProductIcon
  className?: string
  strokeWidth?: number
}) {
  const Icon = ICONS[icon]
  return <Icon className={className} strokeWidth={strokeWidth} />
}
