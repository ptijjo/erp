/** `input[type=date]` → ISO pour l’API Nest (`@Type(() => Date)`). */
export function dateInputToIso(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

export function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** `input[type=datetime-local]` (heure locale) → ISO pour l’API Nest. */
export function dateTimeInputToIso(value: string): string {
  return new Date(value).toISOString();
}

/** ISO → `input[type=datetime-local]` (heure locale, `YYYY-MM-DDTHH:mm`). */
export function isoToDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Affichage lisible d’un créneau (date + heure) en français. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** `input[type=time]` (`HH:mm`) → minutes depuis minuit. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

/** Minutes depuis minuit → `HH:mm`. */
export function minutesToTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Durée en minutes → `Xh` ou `XhMM` (ex. 510 → `8h30`, 480 → `8h`). */
export function formatMinutesDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${String(mins).padStart(2, "0")}`;
}

/** Lundi (au format `input[type=date]`) de la semaine contenant `date` (aujourd’hui par défaut). */
export function mondayInputOf(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0 = dimanche … 6 = samedi
  const offsetToMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - offsetToMonday);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
