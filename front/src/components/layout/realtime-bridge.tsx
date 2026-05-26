"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { useRealtimeSse } from "~/hooks/use-realtime-sse";
import { hasMePermission, useMe } from "~/hooks/use-me";
import {
  onSoundPreferenceChanged,
  readSoundEnabled,
} from "~/lib/sound-preferences";
import type {
  RealtimeMessagePayload,
  RealtimeNotificationPayload,
} from "~/lib/realtime-payloads";

function messagesThreadHref(threadId: string) {
  return `/dashboard/messages?thread=${threadId}`;
}

const MESSAGE_SOUND_URL = "/sons/messages/message.mp3";
const NOTIFICATION_SOUND_URL = "/sons/notifications/notification.mp3";
const SOUND_COOLDOWN_MS = 600;

/** Connexion SSE unique : toasts + invalidation React Query. */
export function RealtimeBridge() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayRef = useRef<{ message: number; notification: number }>({
    message: 0,
    notification: 0,
  });
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundEnabled());

  const canNotify =
    me != null && hasMePermission(me, "read", "Notification");
  const canMessage = me != null && hasMePermission(me, "read", "Message");

  useEffect(() => {
    return onSoundPreferenceChanged(setSoundEnabled);
  }, []);

  function playSound(kind: "message" | "notification") {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastPlayRef.current[kind] < SOUND_COOLDOWN_MS) return;
    lastPlayRef.current[kind] = now;

    const targetRef = kind === "message" ? messageAudioRef : notificationAudioRef;
    const src = kind === "message" ? MESSAGE_SOUND_URL : NOTIFICATION_SOUND_URL;

    if (!targetRef.current) {
      targetRef.current = new Audio(src);
      targetRef.current.preload = "auto";
    }

    targetRef.current.currentTime = 0;
    void targetRef.current.play().catch(() => {
      // Navigateur peut bloquer l'autoplay sans interaction utilisateur.
    });
  }

  useRealtimeSse(canNotify || canMessage, {
    onNotification: canNotify
      ? (payload: RealtimeNotificationPayload) => {
          playSound("notification");
          toast.info(
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{payload.title}</span>
              <span className="line-clamp-3 text-sm opacity-90">
                {payload.body}
              </span>
            </div>,
            {
              toastId: `notification-${payload.id}`,
              autoClose: 8000,
            },
          );
        }
      : undefined,
    onMessage: canMessage
      ? (payload: RealtimeMessagePayload) => {
          playSound("message");
          const onMessagesPage = pathname.startsWith("/dashboard/messages");
          const href = messagesThreadHref(payload.threadId);

          if (onMessagesPage) {
            toast.info(
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">Nouveau message</span>
                <span className="line-clamp-2 text-sm opacity-90">
                  {payload.preview}
                </span>
              </div>,
              {
                toastId: `message-${payload.messageId ?? payload.threadId}`,
              },
            );
          } else {
            toast.info(
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Nouveau message</span>
                <span className="line-clamp-2 text-sm opacity-90">
                  {payload.preview}
                </span>
                <Link
                  href={href}
                  className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(href);
                    toast.dismiss();
                  }}
                >
                  Ouvrir la conversation
                </Link>
              </div>,
              {
                toastId: `message-${payload.messageId ?? payload.threadId}`,
                autoClose: 8000,
              },
            );
          }
        }
      : undefined,
  });

  return null;
}
