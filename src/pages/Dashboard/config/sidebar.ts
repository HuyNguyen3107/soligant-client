import { FiHome, FiGrid, FiUsers, FiKey, FiLayers } from "react-icons/fi";
import type { SidebarSection } from "../types";

export const sidebarSections: SidebarSection[] = [
  {
    group: "MENU",
    items: [
      { id: "home", label: "Trang chủ", icon: FiHome, path: "/" },
      { id: "dashboard", label: "Dashboard", icon: FiGrid },
    ],
  },
  {
    group: "SẢN PHẨM",
    items: [{ id: "collections", label: "Bộ sưu tập", icon: FiLayers }],
  },
  {
    group: "HỆ THỐNG",
    items: [
      { id: "users", label: "Quản lý người dùng", icon: FiUsers },
      { id: "roles", label: "Vai trò & Quyền hạn", icon: FiKey },
    ],
  },
];
