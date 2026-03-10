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
};
