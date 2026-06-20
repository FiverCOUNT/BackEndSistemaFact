/**
 * Fechas como epoch ms (UTC). La app formatea en la zona horaria del dispositivo.
 */

function nowTimestampMs() {
  return Date.now();
}

/** Valor persistido en VARCHAR (ms como string). */
function toStoredTimestamp(ms = nowTimestampMs()) {
  return String(ms);
}

function parseStoredTimestamp(value) {
  if (value == null || value === '') return null;

  const raw = String(value).trim();
  if (/^-?\d{10}$/.test(raw)) return Number(raw) * 1000;
  if (/^-?\d{11,}$/.test(raw)) return Number(raw);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const ms = Date.parse(`${raw}T00:00:00.000Z`);
    return Number.isFinite(ms) ? ms : null;
  }

  let iso = raw;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    iso = `${raw}Z`;
  }

  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Respuesta JSON: número epoch ms o null. */
function toApiTimestamp(value) {
  const ms = parseStoredTimestamp(value);
  return ms == null ? null : ms;
}

function compareStoredTimestamps(a, b) {
  const ma = parseStoredTimestamp(a) ?? 0;
  const mb = parseStoredTimestamp(b) ?? 0;
  return ma - mb;
}

/** Inicio del día calendario en Perú (UTC-5, sin DST) para filtros desde/hasta YYYY-MM-DD. */
function calendarDayStartMsPe(yyyyMmDd) {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(String(yyyyMmDd).trim())) return null;
  const [y, m, d] = String(yyyyMmDd).trim().split('-').map(Number);
  return Date.UTC(y, m - 1, d, 5, 0, 0, 0);
}

/** Fin del día calendario en Perú (23:59:59.999) para filtros desde/hasta YYYY-MM-DD. */
function calendarDayEndMsPe(yyyyMmDd) {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(String(yyyyMmDd).trim())) return null;
  const [y, m, d] = String(yyyyMmDd).trim().split('-').map(Number);
  return Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999);
}

module.exports = {
  nowTimestampMs,
  toStoredTimestamp,
  parseStoredTimestamp,
  toApiTimestamp,
  compareStoredTimestamps,
  calendarDayStartMsPe,
  calendarDayEndMsPe,
};
