const MONEDA = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const FECHA = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

/** 1234.5 → "1234,50 €" */
export const euros = (n: number | string): string => MONEDA.format(Number(n));

/** ISO → "30/10/26, 10:15" */
export const fecha = (iso: string): string => FECHA.format(new Date(iso));
