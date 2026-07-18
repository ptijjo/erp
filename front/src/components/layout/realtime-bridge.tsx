"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { useRealtimeSse } from "~/hooks/use-realtime-sse";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { playErpSound, unlockNotificationAudio } from "~/lib/erp-sounds";
import type {
  RealtimeMessagePayload,
  RealtimeNotificationPayload,
} from "~/lib/realtime-payloads";

function messagesThreadHref(threadId: string) {
  return `/dashboard/messages?thread=${threadId}`;
}

/** Connexion SSE unique : toasts + sons + invalidation React Query. */
export function RealtimeBridge() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const router = useRouter();

  const canNotify =
    me != null && hasMePermission(me, "read", "Notification");
  const canMessage = me != null && hasMePermission(me, "read", "Message");

  /** Débloque l’autoplay après la première interaction utilisateur. */
  useEffect(() => {
    const unlock = () => {
      unlockNotificationAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useRealtimeSse(canNotify || canMessage, {
    onNotification: canNotify
      ? (payload: RealtimeNotificationPayload) => {
          playErpSound("notification");
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
          playErpSound("message");
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
