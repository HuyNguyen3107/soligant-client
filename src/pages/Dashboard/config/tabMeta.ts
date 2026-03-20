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
  "bear-variants": {
    title: "Quản lý sản phẩm Gấu",
    description:
      "Quản lý các biến thể sản phẩm gấu tại Soligant, bao gồm tên, ảnh, giá và tồn kho.",
    keywords: "sản phẩm gấu, biến thể gấu, quản lý gấu, Soligant",
    path: "/dashboard/bear-variants",
  },
  inventory: {
    title: "Quản lý kho",
    description:
      "Theo dõi tồn kho theo từng lựa chọn tùy chỉnh, cập nhật nhập xuất kho và cảnh báo tồn thấp.",
    keywords:
      "quản lý kho, tồn kho, inventory, lựa chọn tùy chỉnh, nhập kho, xuất kho, Soligant",
    path: "/dashboard/inventory",
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
      "Tùy chỉnh các nhóm và lựa chọn thêm cho sản phẩm lắp ráp Lego tại Soligant (màu áo, tóc, thú cưng, kính, bóng bay...).",
    keywords:
      "tùy chỉnh lego, phụ kiện lego, áo màu lego, thú cưng lego, bóng bay lego",
    path: "/dashboard/lego-customizations",
  },
  "bear-customizations": {
    title: "Tùy chỉnh Gấu",
    description:
      "Cấu hình các nhóm và lựa chọn thêm cho sản phẩm Gấu (Phụ kiện, nơ cổ...).",
    keywords: "tùy chỉnh gấu, gấu soligant, phụ kiện gấu",
    path: "/dashboard/bear-customizations",
  },
  promotions: {
    title: "Quản lý ưu đãi",
    description:
      "Quản lý các chương trình ưu đãi cho khách hàng Soligant - Tạo, chỉnh sửa, xóa ưu đãi theo số lượng tùy chỉnh hoặc số lượng sản phẩm.",
    keywords: "ưu đãi, khuyến mãi, giảm giá, tặng quà, promotions, Soligant",
    path: "/dashboard/promotions",
  },
  orders: {
    title: "Quản lý đơn hàng",
    description:
      "Theo dõi các đơn khách đặt từ website Soligant, cập nhật trạng thái xử lý và quản lý mã đơn hàng.",
    keywords: "đơn hàng, order management, mã đơn, Soligant",
    path: "/dashboard/orders",
  },
  feedbacks: {
    title: "Quản lý feedback",
    description:
      "Quản lý phản hồi từ khách hàng, cập nhật trạng thái xử lý và kiểm soát feedback hiển thị public.",
    keywords:
      "feedback, góp ý khách hàng, đánh giá, quản lý feedback, Soligant",
    path: "/dashboard/feedbacks",
  },
  "addon-options": {
    title: "Option mua thêm",
    description:
      "Quản lý các option mua thêm cho biến thể sản phẩm, bao gồm loại cơ bản và ấn phẩm tùy chỉnh.",
    keywords:
      "option mua thêm, upsell, addon options, ấn phẩm tùy chỉnh, Soligant",
    path: "/dashboard/addon-options",
  },
  "customer-order-fields": {
    title: "Thông tin khách hàng",
    description:
      "Cấu hình biểu mẫu thông tin khách hàng để thu thập dữ liệu trước bước chốt đơn.",
    keywords:
      "thông tin khách hàng, biểu mẫu đặt hàng, customer form, dashboard, Soligant",
    path: "/dashboard/customer-order-fields",
  },
  "background-themes": {
    title: "Chủ đề Background",
    description:
      "Quản lý các danh mục/chủ đề nhóm các bối cảnh tùy chỉnh cho sản phẩm.",
    keywords: "chủ đề background, background themes, danh mục bối cảnh",
    path: "/dashboard/background-themes",
  },
  backgrounds: {
    title: "Quản lý Background",
    description:
      "Thêm và cấu hình các bối cảnh, ảnh nền và trường thông tin tùy biến (Google Form style).",
    keywords: "backgrounds, mẫu background, form background, cấu hình bối cảnh",
    path: "/dashboard/backgrounds",
  },
};
