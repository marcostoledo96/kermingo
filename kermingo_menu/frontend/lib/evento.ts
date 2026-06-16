/**
 * evento.ts — Fuente única de datos del evento Kermingo.
 *
 * Todos los componentes que muestren información del evento
 * (nombre, fecha, dirección, organizadores, temática) deben
 * importar desde aquí en vez de hardcodear strings.
 *
 * AGENTS.md es la verdad operativa actual para la dirección (Estomba 1980),
 * pero doc 28 señaló inconsistencia con README.md (Echeverría 3920).
 * Se marca `direccionPendienteDeConfirmar` hasta que Marcos confirme.
 */

export const EVENTO = {
  /** Nombre visible del evento */
  nombre: 'Kermingo',

  /** Fecha legible para mostrar en UI */
  fecha: 'Sábado 20 de junio de 2026',

  /** Fecha corta para footer/admin */
  fechaCorta: '20.06.2026',

  /** Día especial del calendario */
  efemeride: 'Día de la Bandera',

  /** Horario del evento */
  horario: '17 a 21 hs',

  /** Dirección del evento — AGENTS.md dice Estomba 1980,
   *  pero README dice Echeverría 3920.
   *  Pendiente de confirmación por Marcos. */
  direccion: 'Estomba 1980',

  /** Flag para indicar que la dirección aún no fue confirmada definitivamente */
  direccionPendienteDeConfirmar: true,

  /** Organizador principal */
  organizador: 'Grupo Scout San Patricio',

  /** Sub-organizadores */
  raider: {
    tropa: 'Compañía de Jesús',
    comunidad: 'Fortaleza de María',
  },

  /** Descripción corta para metadatos/SEO */
  descripcion: 'Evento recaudatorio a beneficio del campamento de verano',

  /** Frase institucional para uso en footer y ticket */
  fraseInstitucional:
    'Gracias por colaborar con el campamento de verano del Grupo Scout San Patricio.',

  /** Temática del evento para uso visual */
  tematica: 'Argentina, Mundial de fútbol, Día de la Bandera, bingo, kermesse y toque scout sutil.',

  /** Precios de entrada (referencia, pueden cambiar) */
  entradaAnticipada: '$5.000',
  entradaEnPuerta: '$6.000',
} as const

/** Tipo derivado para uso en componentes */
export type Evento = typeof EVENTO