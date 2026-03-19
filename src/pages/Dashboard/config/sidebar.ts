import { FiHome, FiGrid, FiUsers, FiKey, FiLayers, FiBox, FiTag, FiSliders, FiGift, FiImage, FiShoppingBag, FiClipboard, FiFileText, FiArchive } from "react-icons/fi";
import type { SidebarSection } from "../types";

export const sidebarSections: SidebarSection[] = [
  {
    group: "MENU",
    items: [
      { id: "home", label: "Trang chủ", icon: FiHome, path: "/" },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: FiGrid,
        permission: "dashboard.view",
      },
    ],
  },
  {
    group: "SẢN PHẨM",
    items: [
      {
        id: "collections",
        label: "Bộ sưu tập",
        icon: FiLayers,
        permission: "collections.view",
      },
      {
        id: "lego-frames",
        label: "Khung tranh Lego",
        icon: FiBox,
        permission: "lego-frames.view",
      },
      {
        id: "bear-variants",
        label: "Sản phẩm Gấu",
        icon: FiBox,
        permission: "bear-variants.view",
      },
      {
        id: "inventory",
        label: "Quản lý kho",
        icon: FiArchive,
        permission: "inventory.view",
      },
      {
        id: "lego-categories",
        label: "Danh mục sản phẩm",
        icon: FiTag,
        permission: "product-categories.view",
      },
      {
        id: "lego-customizations",
        label: "Tùy chỉnh Lego",
        icon: FiSliders,
        permission: "lego-customizations.view",
      },
      {
        id: "bear-customizations",
        label: "Tùy chỉnh Gấu",
        icon: FiSliders,
        permission: "bear-customizations.view",
      },
      {
        id: "promotions",
        label: "Ưu đãi",
        icon: FiGift,
        permission: "promotions.view",
      },
      {
        id: "orders",
        label: "Đơn hàng",
        icon: FiClipboard,
        permission: "orders.view",
      },
      {
        id: "addon-options",
        label: "Option mua thêm",
        icon: FiShoppingBag,
        permission: "addon-options.view",
      },
      {
        id: "customer-order-fields",
        label: "Thông tin khách hàng",
        icon: FiFileText,
        permission: "customer-order-fields.view",
      },
      {
        id: "background-themes",
        label: "Chủ đề Background",
        icon: FiImage,
        permission: "background-themes.view",
      },
      {
        id: "backgrounds",
        label: "Background",
        icon: FiLayers,
        permission: "backgrounds.view",
      },
    ],
  },
  {
    group: "HỆ THỐNG",
    items: [
      {
        id: "users",
        label: "Quản lý người dùng",
        icon: FiUsers,
        permission: "users.view",
      },
      {
        id: "roles",
        label: "Vai trò & Quyền hạn",
        icon: FiKey,
        permission: "roles.view",
      },
    ],
  },
];
