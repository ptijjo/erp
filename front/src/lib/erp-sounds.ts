"use client";

import { readSoundEnabled } from "~/lib/sound-preferences";

export const MESSAGE_SOUND_URL = "/sons/messages/message.mp3";
export const NOTIFICATION_SOUND_URL = "/sons/notifications/notification.mp3";

const SOUND_COOLDOWN_MS = 600;

let messageAudio: HTMLAudioElement | null = null;
let notificationAudio: HTMLAudioElement | null = null;
let lastPlay = { message: 0, notification: 0 };
let audioUnlocked = false;

function getOrCreateAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

/**
 * Les navigateurs bloquent l’autoplay tant qu’il n’y a pas eu d’interaction.
 * À appeler sur un clic / touche (ex. menu « Activer les sons »).
 */
export function unlockNotificationAudio(): void {
  if (typeof window === "undefined" || audioUnlocked) return;
  audioUnlocked = true;

  if (!messageAudio) messageAudio = getOrCreateAudio(MESSAGE_SOUND_URL);
  if (!notificationAudio) {
    notificationAudio = getOrCreateAudio(NOTIFICATION_SOUND_URL);
  }

  for (const audio of [messageAudio, notificationAudio]) {
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  }
}

export function playErpSound(kind: "message" | "notification"): void {
  if (typeof window === "undefined") return;
  if (!readSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlay[kind] < SOUND_COOLDOWN_MS) return;
  lastPlay[kind] = now;

  if (kind === "message") {
    if (!messageAudio) messageAudio = getOrCreateAudio(MESSAGE_SOUND_URL);
    messageAudio.currentTime = 0;
    void messageAudio.play().catch(() => undefined);
    return;
  }

  if (!notificationAudio) {
    notificationAudio = getOrCreateAudio(NOTIFICATION_SOUND_URL);
  }
  notificationAudio.currentTime = 0;
  void notificationAudio.play().catch(() => undefined);
}
