import { io, type Socket } from "socket.io-client";
import { SERVER_ORIGIN } from "./http";

export interface OrderCreatedSocketPayload {
  id: string;
  orderCode: string;
  status: string;
  itemsCount: number;
  finalTotal: number;
  createdAt: string;
}

export interface StoredOrderNotification {
  id: string;
  orderId: string;
  orderCode: string;
  itemsCount: number;
  finalTotal: number;
  createdAt: string;
  isRead: boolean;
}

export const ORDER_NOTIFICATIONS_STORAGE_KEY = "soligant-order-notifications";

const MAX_ORDER_NOTIFICATIONS = 50;

export type OrdersSocket = Socket<
  {
    "orders:new": (payload: OrderCreatedSocketPayload) => void;
  },
  Record<string, never>
>;

export const createOrdersSocket = (): OrdersSocket => {
  return io(`${SERVER_ORIGIN}/orders`, {
    transports: ["websocket"],
    withCredentials: true,
  }) as OrdersSocket;
};

const isStoredOrderNotification = (
  value: unknown,
): value is StoredOrderNotification => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredOrderNotification>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.orderId === "string" &&
    typeof candidate.orderCode === "string" &&
    typeof candidate.itemsCount === "number" &&
    typeof candidate.finalTotal === "number" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.isRead === "boolean"
  );
};

export const readStoredOrderNotifications = (): StoredOrderNotification[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ORDER_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isStoredOrderNotification)
      .slice(0, MAX_ORDER_NOTIFICATIONS);
  } catch {
    return [];
  }
};

export const writeStoredOrderNotifications = (
  notifications: StoredOrderNotification[],
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      ORDER_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications.slice(0, MAX_ORDER_NOTIFICATIONS)),
    );
  } catch {
    // Ignore storage write errors (private mode/quota exceeded).
  }
};

export const appendStoredOrderNotification = (
  payload: OrderCreatedSocketPayload,
) => {
  const nextNotification: StoredOrderNotification = {
    id: `${payload.id}-${payload.createdAt}`,
    orderId: payload.id,
    orderCode: payload.orderCode,
    itemsCount: payload.itemsCount,
    finalTotal: payload.finalTotal,
    createdAt: payload.createdAt,
    isRead: false,
  };

  const existing = readStoredOrderNotifications().filter(
    (notification) => notification.id !== nextNotification.id,
  );

  const next = [nextNotification, ...existing].slice(
    0,
    MAX_ORDER_NOTIFICATIONS,
  );
  writeStoredOrderNotifications(next);
  return next;
};
