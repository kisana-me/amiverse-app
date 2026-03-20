import { api } from "@/lib/axios";
import { NotificationType } from "@/types/notification";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useCurrentAccount } from "./CurrentAccountProvider";
import { useToast } from "./ToastProvider";

type NotificationsContextType = {
  notifications: NotificationType[];
  isLoading: boolean;
  hasMore: boolean;
  fetchedAt: number | null;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | null>(
  null,
);

function uniqByAid(items: NotificationType[]): NotificationType[] {
  const map = new Map<string, NotificationType>();
  for (const item of items) map.set(item.aid, item);
  return Array.from(map.values());
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentAccountStatus } = useCurrentAccount();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const inFlightRef = useRef(false);
  const notificationsRef = useRef<NotificationType[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const fetchNotifications = useCallback(
    async (reset: boolean = false) => {
      if (currentAccountStatus === "loading") return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setIsLoading(true);

      try {
        const existing = reset ? [] : notificationsRef.current;
        const cursor =
          existing.length > 0
            ? Math.floor(
                new Date(existing[existing.length - 1].created_at).getTime() /
                  1000,
              )
            : undefined;

        const res = await api.post("/notifications", {
          cursor: cursor ?? null,
        });
        const data = res.data;
        const payload = (
          data && typeof data === "object" && "data" in (data as object)
            ? (data as { data?: unknown }).data
            : undefined
        ) as unknown;

        const normalized = payload ?? data;

        const list: NotificationType[] = Array.isArray(normalized)
          ? (normalized as NotificationType[])
          : Array.isArray(
                (normalized as { notifications?: unknown })?.notifications,
              )
            ? (normalized as { notifications: NotificationType[] })
                .notifications
            : Array.isArray((normalized as { items?: unknown })?.items)
              ? (normalized as { items: NotificationType[] }).items
              : [];

        setNotifications((prev) =>
          reset ? list : uniqByAid([...prev, ...list]),
        );

        if (
          typeof (normalized as { has_more?: unknown })?.has_more === "boolean"
        ) {
          setHasMore((normalized as { has_more: boolean }).has_more);
        } else {
          setHasMore(list.length > 0);
        }

        setFetchedAt(Date.now());
      } catch (error) {
        addToast({
          message: "通知取得エラー",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
        inFlightRef.current = false;
      }
    },
    [addToast, currentAccountStatus],
  );

  const markAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, checked: true })));

    // Server endpoint may vary; keep it best-effort.
    try {
      await api.post("/notifications/read");
    } catch {
      // ignore
    }
  }, []);

  const value: NotificationsContextType = useMemo(
    () => ({
      notifications,
      isLoading,
      hasMore,
      fetchedAt,
      fetchNotifications,
      markAsRead,
    }),
    [
      notifications,
      isLoading,
      hasMore,
      fetchedAt,
      fetchNotifications,
      markAsRead,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  return ctx;
}
