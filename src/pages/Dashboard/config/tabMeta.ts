import type { TabMeta } from "../types";

export const TAB_META: Record<string, TabMeta> = {
  dashboard: {
    title: "Dashboard",
    description:
      "Bảng điều khiển quản lý hệ thống Soligant - Xem tổng quan doanh thu, khách hàng, đơn hàng và các chỉ số kinh doanh.",
    keywords: "dashboard, quản lý, Soligant, báo cáo, doanh thu, khách hàng",
    path: "/dashboard",
  },
  users: {
    title: "Quản lý người dùng",
    description:
      "Quản lý tài khoản người dùng trong hệ thống Soligant - Thêm, sửa, xóa và phân quyền người dùng.",
    keywords: "quản lý người dùng, tài khoản, phân quyền, Soligant",
    path: "/dashboard/users",
  },
  roles: {
    title: "Vai trò & Quyền hạn",
    description:
      "Quản lý vai trò và quyền hạn trong hệ thống Soligant - Cấu hình phân quyền cho từng nhóm người dùng.",
    keywords: "vai trò, quyền hạn, phân quyền, roles, permissions, Soligant",
    path: "/dashboard/roles",
  },
  collections: {
    title: "Bộ sưu tập",
    description:
      "Quản lý bộ sưu tập sản phẩm Soligant - Thêm, sửa, xóa và cấu hình hiển thị các bộ sưu tập.",
    keywords: "bộ sưu tập, collection, sản phẩm, Soligant, quản lý",
    path: "/dashboard/collections",
  },
  "lego-frames": {
    title: "Quản lý khung tranh Lego",
    description:
      "Quản lý sản phẩm khung tranh Lego tại Soligant, bao gồm các biến thể kích thước 20x20, 18x18 và 15x15.",
    keywords:
      "khung tranh lego, biến thể sản phẩm, kích thước 20x20, 18x18, 15x15, Soligant",
    path: "/dashboard/lego-frames",
  },
  "lego-categories": {
    title: "Danh mục sản phẩm",
    description:
      "Quản lý danh mục sản phẩm dùng chung trong Soligant, hỗ trợ tạo mới và chỉnh sửa tên danh mục.",
    keywords: "danh mục sản phẩm, category, quản lý danh mục, Soligant",
    path: "/dashboard/lego-categories",
  },
  "lego-customizations": {
    title: "Tùy chỉnh Lego",
    description:
      "Quản lý các nhóm tùy chỉnh Lego và các lựa chọn cụ thể như áo, quần, tóc, phụ kiện để hiển thị ra trang khách hàng qua API public.",
    keywords: "tùy chỉnh lego, áo, quần, phụ kiện, dashboard, Soligant",
    path: "/dashboard/lego-customizations",
  },
};
