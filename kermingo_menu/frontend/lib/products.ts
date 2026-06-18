export type MealCategory = 'merienda' | 'cena'
export type ProductType = 'comida' | 'bebida' | 'promo'
export type StockStatus = 'disponible' | 'bajo' | 'agotado' | 'ilimitado' | 'no_disponible'

export type Product = {
  id: string
  name: string
  description: string
  price: number
  meals: MealCategory[]
  type: ProductType
  stock: StockStatus
  icon: ProductIcon
  image?: string
  order: number
  available: boolean
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

export type PaymentMethod = 'transferencia' | 'efectivo'

export type PedidoEstado = 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
export type PedidoPago = 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'

export type OrderItem = {
  id: string
  producto_id: number
  nombre: string
  precio_unitario: number
  cantidad: number
  subtotal: number
  icon: ProductIcon
}

export type LastOrder = {
  id: number
  numero: string
  token: string
  createdAt: string
  name: string
  table: string
  whatsapp: string
  notes: string
  method: PaymentMethod
  total: number
  count: number
  items: OrderItem[]
  status: PedidoEstado
  payment: PedidoPago
}

export const PRODUCTS: Product[] = [
  // --- Cena · Comidas ---
  { id: '1',  name: 'Pizza muzza',       description: 'Porción de muzzarella bien tirada con orégano.',   price: 3500, meals: ['cena'],     type: 'comida', stock: 'disponible', icon: 'pizza', image: '/products/pizza-muzza.png' },
  { id: '2',  name: 'Pizza napolitana',  description: 'Muzza, tomate en rodajas y ajo.',                   price: 3800, meals: ['cena'],     type: 'comida', stock: 'disponible', icon: 'pizza' },
  { id: '3',  name: 'Pizza jamón',       description: 'Muzza con jamón cocido.',                           price: 3900, meals: ['cena'],     type: 'comida', stock: 'bajo',       icon: 'pizza' },
  { id: '4',  name: 'Pizza sin TACC',    description: 'Masa apta celíacos. Cantidad limitada.',            price: 4200, meals: ['cena'],     type: 'comida', stock: 'agotado',    icon: 'pizza' },
  { id: '5',  name: 'Pancho',            description: 'Pancho completo con aderezos a elección.',          price: 2500, meals: ['cena'],     type: 'comida', stock: 'disponible', icon: 'sandwich' },
  { id: '6',  name: 'Nuggets',           description: 'Porción de 6 con papas.',                           price: 3000, meals: ['cena'],     type: 'comida', stock: 'disponible', icon: 'drumstick' },
  { id: '7',  name: 'Nuggets veggies',   description: 'Opción vegetariana, porción de 6.',                 price: 3200, meals: ['cena'],     type: 'comida', stock: 'bajo',       icon: 'sprout' },
  { id: '8',  name: 'Chocotorta',        description: 'Porción clásica de chocolinas y dulce de leche.',  price: 2500, meals: ['merienda'], type: 'comida', stock: 'disponible', icon: 'cake' },
  { id: '9',  name: 'Torta frita',       description: 'Recién hechas, ideales con mate.',                  price: 1000, meals: ['merienda'], type: 'comida', stock: 'disponible', icon: 'donut' },
  { id: '10', name: 'Medialunas',        description: 'Par de medialunas de manteca.',                     price: 1600, meals: ['merienda'], type: 'comida', stock: 'disponible', icon: 'croissant' },
  { id: '11', name: 'Medialunas J&Q',    description: 'Rellenas con jamón y queso, calentitas.',           price: 2200, meals: ['merienda'], type: 'comida', stock: 'bajo',       icon: 'croissant' },
  { id: '12', name: 'Churros',           description: 'Rellenos de dulce de leche.',                        price: 1500, meals: ['merienda'], type: 'comida', stock: 'bajo',       icon: 'cookie' },
  { id: '13', name: 'Tortas varias',     description: 'Porción del día, consultá los sabores.',            price: 2500, meals: ['merienda'], type: 'comida', stock: 'disponible', icon: 'cake' },
  { id: '14', name: 'Helados palito',    description: 'Variedad de gustos. Sujeto a disponibilidad.',      price: 2000, meals: ['merienda', 'cena'], type: 'comida', stock: 'agotado', icon: 'icecream' },
  { id: '15', name: 'Coca Cola',         description: 'Lata 354 ml bien fría.',                             price: 2000, meals: ['merienda', 'cena'], type: 'bebida', stock: 'disponible', icon: 'soda' },
  { id: '16', name: 'Gaseosa naranja',   description: 'Lata 354 ml.',                                       price: 1900, meals: ['merienda', 'cena'], type: 'bebida', stock: 'disponible', icon: 'soda' },
  { id: '17', name: 'Lima limón',        description: 'Lata 354 ml.',                                       price: 1900, meals: ['merienda', 'cena'], type: 'bebida', stock: 'bajo',       icon: 'soda' },
  { id: '18', name: 'Agua mineral',      description: 'Botella 500 ml, con o sin gas.',                     price: 1500, meals: ['merienda', 'cena'], type: 'bebida', stock: 'ilimitado',  icon: 'water' },
  { id: '19', name: 'Mate cocido',       description: 'Calentito, servido en vaso.',                        price: 1200, meals: ['merienda'], type: 'bebida', stock: 'ilimitado',  icon: 'coffee' },
  { id: '20', name: 'Té',                description: 'Variedad de saquitos.',                              price: 1000, meals: ['merienda'], type: 'bebida', stock: 'ilimitado',  icon: 'coffee' },
  { id: '21', name: 'Café',              description: 'Café de filtro recién hecho.',                       price: 1500, meals: ['merienda'], type: 'bebida', stock: 'disponible', icon: 'coffee' },
  { id: '22', name: 'Chocolatada',       description: 'Bien chocolatosa, fría o caliente.',                 price: 1800, meals: ['merienda'], type: 'bebida', stock: 'disponible', icon: 'milk' },
  { id: '23', name: 'Combo merienda',    description: '3 medialunas + café o mate cocido.',                 price: 3500, meals: ['merienda'], type: 'promo',  stock: 'disponible', icon: 'combo' },
  { id: '24', name: 'Combo cena',        description: 'Pancho + porción de pizza + gaseosa.',               price: 6500, meals: ['cena'],     type: 'promo',  stock: 'bajo',       icon: 'combo' },
]

export function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}
