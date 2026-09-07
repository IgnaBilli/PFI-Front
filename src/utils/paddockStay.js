export function paddockStay(entry, now = new Date()) {
  if (typeof entry !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry)) return 'Sin fecha';
  const start = Date.parse(entry + 'T00:00:00Z');
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0,10) !== entry) return 'Sin fecha';
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const days = Math.round((Date.parse(today+'T00:00:00Z')-start)/86400000);
  if (days < 0) return 'Entrada futura';
  return days === 0 ? 'Hoy' : `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}
