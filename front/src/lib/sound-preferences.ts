"use client";

export const SOUND_ENABLED_KEY = "erp:sounds-enabled";
const SOUND_EVENT = "erp:sounds-updated";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readSoundEnabled(): boolean {
  if (!canUseStorage()) return true;
  const raw = localStorage.getItem(SOUND_ENABLED_KEY);
  if (raw == null) return true;
  return raw !== "0";
}

export function writeSoundEnabled(enabled: boolean): void {
  if (!canUseStorage()) return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: enabled }));
}

export function onSoundPreferenceChanged(
  callback: (enabled: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SOUND_ENABLED_KEY) return;
    callback(readSoundEnabled());
  };
  const handleCustom = () => callback(readSoundEnabled());

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SOUND_EVENT, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SOUND_EVENT, handleCustom);
  };
}
