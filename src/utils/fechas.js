const RE_YMD = /^\d{4}-\d{2}-\d{2}$/;

// ISO UTC → YYYY-MM-DD (para inputs <input type="date">)
export function isoToInputLocal(iso) {
  if (!iso) return '';
  if (RE_YMD.test(iso)) return iso;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// YYYY-MM-DD → formato que tu backend espera ("T00:00:00.000+00:00")
export function inputLocalToBackendISO(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  if (!RE_YMD.test(yyyyMmDd)) return null;
  return `${yyyyMmDd}T00:00:00.000+00:00`;
}

// Para mostrar en formato Argentino DD/MM/YYYY
export function isoToDisplay(iso, locale = 'es-AR') {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

// Helper para mapear objetos con campos de fecha
export function mapDates(obj, fields, mapperFn) {
  if (!obj) return obj;
  const copy = { ...obj };
  for (const f of fields) {
    if (f in copy) copy[f] = mapperFn(copy[f]);
  }
  return copy;
}
