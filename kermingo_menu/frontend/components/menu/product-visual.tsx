'use client'

import { useState } from 'react'
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
import { SolDeMayo } from '../sol-de-mayo'
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

/**
 * Placeholder de marca sobrio: superficie celeste con el Sol de Mayo
 * como marca de agua y el ícono del producto como apoyo discreto.
 * No usa el ícono como visual protagonista ni emojis.
 */
function BrandPlaceholder({
  icon,
  dimmed = false,
}: {
  icon: ProductIcon
  dimmed?: boolean
}) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#E3EEFB] ${
        dimmed ? 'opacity-60' : ''
      }`}
      aria-hidden="true"
    >
      <SolDeMayo className="absolute -right-3 -bottom-3 h-16 w-16 opacity-[0.12]" />
      <ProductIconGlyph
        icon={icon}
        strokeWidth={1.6}
        className="relative h-9 w-9 text-[#75AADB]"
      />
    </div>
  )
}

/**
 * Visual del producto. Muestra la foto real (cuando el backend la provee)
 * con relación de aspecto estable y carga diferida, o un placeholder de marca.
 */
export function ProductImage({
  src,
  alt,
  icon,
  dimmed = false,
  className = '',
}: {
  src?: string
  alt: string
  icon: ProductIcon
  dimmed?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl bg-[#E3EEFB] ${className}`}
    >
      {showImage ? (
        // Las fotos llegan desde el backend (dominio variable), por eso usamos
        // <img> nativo con lazy-loading y dimensiones fijas para evitar layout shift.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || '/placeholder.svg'}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${dimmed ? 'opacity-60 grayscale' : ''}`}
        />
      ) : (
        <BrandPlaceholder icon={icon} dimmed={dimmed} />
      )}
    </div>
  )
}
