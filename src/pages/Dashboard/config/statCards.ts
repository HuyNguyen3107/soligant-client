import { FiDollarSign, FiUsers, FiShoppingBag, FiEye } from "react-icons/fi";
import type { StatCard } from "../types";

export const statCards: StatCard[] = [
  {
    label: "Tổng doanh thu",
    value: "48.295.000₫",
    change: "+12.5%",
    up: true,
    icon: FiDollarSign,
    sparkData: [20, 22, 18, 25, 30, 28, 35, 32, 38, 40, 36, 42],
    color: "#731618",
  },
  {
    label: "Khách hàng",
    value: "2.847",
    change: "+8.2%",
    up: true,
    icon: FiUsers,
    sparkData: [15, 18, 20, 19, 22, 25, 28, 26, 30, 32, 29, 35],
    color: "#3b82f6",
  },
  {
    label: "Tổng đơn hàng",
    value: "1.432",
    change: "-3.1%",
    up: false,
    icon: FiShoppingBag,
    sparkData: [30, 28, 32, 25, 22, 28, 26, 24, 20, 22, 18, 20],
    color: "#f59e0b",
  },
  {
    label: "Lượt xem",
    value: "284K",
    change: "+24.7%",
    up: true,
    icon: FiEye,
    sparkData: [10, 15, 12, 20, 25, 22, 28, 30, 35, 38, 40, 45],
    color: "#a855f7",
  },
];
