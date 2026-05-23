/** `input[type=date]` → ISO pour l’API Nest (`@Type(() => Date)`). */
export function dateInputToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}
