export function displayMonth(value: string | null | undefined): string | null {
  const month = value?.slice(0, 7);
  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month.replace("-", ".") : null;
}
