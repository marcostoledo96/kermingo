export type MealCategory = 'merienda' | 'cena'
export type ProductType = 'comida' | 'bebida' | 'promo'
export type StockStatus = 'disponible' | 'bajo' | 'agotado' | 'ilimitado'

export type Product = {
  id: string
  name: string
  description: string
  price: number
  meals: MealCategory[]
  type: ProductType
  stock: StockStatus
  /** Icono representativo mientras no haya foto. */
  icon: ProductIcon
  /** Foto del producto (la sube el organizador). */
  image?: string
}

export type ProductIcon =
  | 'pizza'
  | 'sandwich'
  | 'drumstick'
  | 'sprout'
  | 'cake'
  | 'cookie'
  | 'croissant'
  | 'donut'
  | 'soda'
  | 'water'
  | 'coffee'
  | 'milk'
  | 'icecream'
  | 'combo'

export const PRODUCTS: Product[] = [
  // --- Cena · Comidas ---
  {
    id: 'pizza-muzza',
    name: 'Pizza muzza',
    description: 'Porción de muzzarella bien tirada con orégano.',
    price: 3500,
    meals: ['cena'],
    type: 'comida',
    stock: 'disponible',
    icon: 'pizza',
  },
  {
    id: 'pizza-napolitana',
    name: 'Pizza napolitana',
    description: 'Muzza, tomate en rodajas y ajo.',
    price: 3800,
    meals: ['cena'],
    type: 'comida',
    stock: 'disponible',
    icon: 'pizza',
  },
  {
    id: 'pizza-jamon',
    name: 'Pizza jamón',
    description: 'Muzza con jamón cocido.',
    price: 3900,
    meals: ['cena'],
    type: 'comida',
    stock: 'bajo',
    icon: 'pizza',
  },
  {
    id: 'pizza-sin-tacc',
    name: 'Pizza sin TACC',
    description: 'Masa apta celíacos. Cantidad limitada.',
    price: 4200,
    meals: ['cena'],
    type: 'comida',
    stock: 'agotado',
    icon: 'pizza',
  },
  {
    id: 'panchos',
    name: 'Panchos',
    description: 'Pancho completo con aderezos a elección.',
    price: 2500,
    meals: ['cena'],
    type: 'comida',
    stock: 'disponible',
    icon: 'sandwich',
  },
  {
    id: 'nuggets',
    name: 'Nuggets',
    description: 'Porción de 6 con papas.',
    price: 3000,
    meals: ['cena'],
    type: 'comida',
    stock: 'disponible',
    icon: 'drumstick',
  },
  {
    id: 'nuggets-veggies',
    name: 'Nuggets veggies',
    description: 'Opción vegetariana, porción de 6.',
    price: 3200,
    meals: ['cena'],
    type: 'comida',
    stock: 'bajo',
    icon: 'sprout',
  },

  // --- Merienda · Comidas ---
  {
    id: 'chocotorta',
    name: 'Chocotorta',
    description: 'Porción clásica de chocolinas y dulce de leche.',
    price: 2500,
    meals: ['merienda'],
    type: 'comida',
    stock: 'disponible',
    icon: 'cake',
  },
  {
    id: 'torta-frita',
    name: 'Torta frita',
    description: 'Recién hechas, ideales con mate.',
    price: 1000,
    meals: ['merienda'],
    type: 'comida',
    stock: 'disponible',
    icon: 'donut',
  },
  {
    id: 'medialunas',
    name: 'Medialunas',
    description: 'Par de medialunas de manteca.',
    price: 1600,
    meals: ['merienda'],
    type: 'comida',
    stock: 'disponible',
    icon: 'croissant',
  },
  {
    id: 'medialunas-jyq',
    name: 'Medialunas J&Q',
    description: 'Rellenas con jamón y queso, calentitas.',
    price: 2200,
    meals: ['merienda'],
    type: 'comida',
    stock: 'bajo',
    icon: 'croissant',
  },
  {
    id: 'churros',
    name: 'Churros',
    description: 'Rellenos de dulce de leche.',
    price: 1500,
    meals: ['merienda'],
    type: 'comida',
    stock: 'bajo',
    icon: 'cookie',
  },
  {
    id: 'helados-palito',
    name: 'Helados palito',
    description: 'Variedad de gustos. Sujeto a disponibilidad.',
    price: 2000,
    meals: ['merienda', 'cena'],
    type: 'comida',
    stock: 'agotado',
    icon: 'icecream',
  },
  {
    id: 'tortas-varias',
    name: 'Tortas varias',
    description: 'Porción del día, consultá los sabores.',
    price: 2500,
    meals: ['merienda'],
    type: 'comida',
    stock: 'disponible',
    icon: 'cake',
  },

  // --- Bebidas ---
  {
    id: 'coca',
    name: 'Coca Cola',
    description: 'Lata 354 ml bien fría.',
    price: 2000,
    meals: ['merienda', 'cena'],
    type: 'bebida',
    stock: 'disponible',
    icon: 'soda',
  },
  {
    id: 'naranja',
    name: 'Gaseosa naranja',
    description: 'Lata 354 ml.',
    price: 1900,
    meals: ['merienda', 'cena'],
    type: 'bebida',
    stock: 'disponible',
    icon: 'soda',
  },
  {
    id: 'lima-limon',
    name: 'Lima limón',
    description: 'Lata 354 ml.',
    price: 1900,
    meals: ['merienda', 'cena'],
    type: 'bebida',
    stock: 'bajo',
    icon: 'soda',
  },
  {
    id: 'agua',
    name: 'Agua mineral',
    description: 'Botella 500 ml, con o sin gas.',
    price: 1500,
    meals: ['merienda', 'cena'],
    type: 'bebida',
    stock: 'ilimitado',
    icon: 'water',
  },
  {
    id: 'mate-cocido',
    name: 'Mate cocido',
    description: 'Calentito, servido en vaso.',
    price: 1200,
    meals: ['merienda'],
    type: 'bebida',
    stock: 'ilimitado',
    icon: 'coffee',
  },
  {
    id: 'te',
    name: 'Té',
    description: 'Variedad de saquitos.',
    price: 1000,
    meals: ['merienda'],
    type: 'bebida',
    stock: 'ilimitado',
    icon: 'coffee',
  },
  {
    id: 'cafe',
    name: 'Café',
    description: 'Café de filtro recién hecho.',
    price: 1500,
    meals: ['merienda'],
    type: 'bebida',
    stock: 'disponible',
    icon: 'coffee',
  },
  {
    id: 'chocolatada',
    name: 'Chocolatada',
    description: 'Bien chocolatosa, fría o caliente.',
    price: 1800,
    meals: ['merienda'],
    type: 'bebida',
    stock: 'disponible',
    icon: 'milk',
  },

  // --- Promos ---
  {
    id: 'combo-merienda',
    name: 'Combo merienda',
    description: '3 medialunas + café o mate cocido.',
    price: 3500,
    meals: ['merienda'],
    type: 'promo',
    stock: 'disponible',
    icon: 'combo',
  },
  {
    id: 'combo-cena',
    name: 'Combo cena',
    description: 'Pancho + porción de pizza + gaseosa.',
    price: 6500,
    meals: ['cena'],
    type: 'promo',
    stock: 'bajo',
    icon: 'combo',
  },
]

export function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}
