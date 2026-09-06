export function formatShortDate(value) {
  // Una fecha sin hora representa un día calendario, no medianoche UTC.
  const calendarDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(calendarDate ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}
