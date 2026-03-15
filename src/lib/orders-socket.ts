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
