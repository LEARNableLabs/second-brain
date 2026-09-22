/** Match the local calendar dates used by browser captures and launchd. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || localDate(new Date(`${value}T12:00:00`)) !== value) {
    throw new Error('Date must be a valid calendar date in YYYY-MM-DD format');
  }
  return value;
}
