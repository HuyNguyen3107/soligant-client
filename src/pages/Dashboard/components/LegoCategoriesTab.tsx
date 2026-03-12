import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiEdit2,
  FiPlus,
  FiSave,
  FiTag,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import type { ProductCategory } from "../types";
import {
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  updateProductCategory,
} from "../../../services/product-categories.service";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, " ");

const LegoCategoriesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [name, setName] = useState("");
  const currentUser = useAuthStore((state) => state.user);
  const canCreateCategory = hasPermission(currentUser, "product-categories.create");
  const canEditCategory = hasPermission(currentUser, "product-categories.edit");
  const canDeleteCategory = hasPermission(currentUser, "product-categories.delete");

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: getProductCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; name: string }) => {
      if (payload.id) {
        return updateProductCategory(payload.id, { name: payload.name });
      }

      return createProductCategory({ name: payload.name });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["lego-frame-variants"] });
      toast.success(
        variables.id
          ? "Đã cập nhật danh mục sản phẩm."
          : "Đã tạo danh mục sản phẩm mới.",
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu danh mục sản phẩm."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["lego-frame-variants"] });
      toast.success("Đã xóa danh mục sản phẩm và các biến thể liên quan.");
      setDeletingCategory(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa danh mục sản phẩm."));
    },
  });

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((category) =>
      category.name.toLowerCase().includes(keyword),
    );
  }, [categories, search]);

  const closeModal = () => {
    setModal(null);
    setEditingCategory(null);
    setName("");
  };

  const openCreate = () => {
    if (!canCreateCategory) {
      toast.error("Bạn không có quyền tạo danh mục sản phẩm.");
      return;
    }

    setEditingCategory(null);
    setName("");
    setModal("create");
  };

  const openEdit = (category: ProductCategory) => {
    if (!canEditCategory) {
      toast.error("Bạn không có quyền chỉnh sửa danh mục sản phẩm.");
      return;
    }

    setEditingCategory(category);
    setName(category.name);
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreateCategory) {
      toast.error("Bạn không có quyền tạo danh mục sản phẩm.");
      return;
    }

    if (modal === "edit" && !canEditCategory) {
      toast.error("Bạn không có quyền chỉnh sửa danh mục sản phẩm.");
      return;
    }

    const normalized = normalizeCategoryName(name);
    if (!normalized) {
      toast.error("Tên danh mục không được để trống.");
      return;
    }

    const duplicate = categories.find(
      (category) =>
        category.id !== editingCategory?.id &&
        category.name.toLowerCase() === normalized.toLowerCase(),
    );

    if (duplicate) {
      toast.error("Tên danh mục đã tồn tại.");
      return;
    }

    await saveMutation.mutateAsync({
      id: editingCategory?.id,
      name: normalized,
    });
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    if (!canDeleteCategory) {
      toast.error("Bạn không có quyền xóa danh mục sản phẩm.");
      return;
    }

    await deleteMutation.mutateAsync(deletingCategory.id);
  };

  return (
    <div className="tab-panel lc-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Danh mục sản phẩm</h2>
          <p className="tab-subtitle">
            Danh mục dùng chung cho nhiều loại sản phẩm, không chỉ riêng khung Lego.
          </p>
        </div>
        {canCreateCategory && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Tạo danh mục
          </button>
        )}
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiTag size={15} />
          </span>
          <div>
            <strong>{categories.length}</strong>
            <span>Danh mục sản phẩm hiện có</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="tab-search-clear"
              onClick={() => setSearch("")}
              title="Xóa tìm kiếm"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
      </section>

      {filteredCategories.length === 0 ? (
        <div className="tab-empty">
          <FiTag size={40} className="tab-empty-icon" />
          <p>
            {categories.length === 0
              ? "Chưa có danh mục nào. Hãy tạo danh mục đầu tiên."
              : "Không tìm thấy danh mục phù hợp."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Tên danh mục</th>
                <th>Cập nhật lần cuối</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <span className="lc-name-chip">{category.name}</span>
                  </td>
                  <td className="text-muted">{formatDateTime(category.updatedAt)}</td>
                  <td>
                    <div className="tab-actions">
                      {canEditCategory && (
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEdit(category)}
                          title="Chỉnh sửa"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDeleteCategory && (
                        <button
                          className="btn-icon btn-del"
                          onClick={() => setDeletingCategory(category)}
                          title="Xóa"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="lc-summary">
        Hiển thị {filteredCategories.length}/{categories.length} danh mục
      </p>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create" ? "Tạo danh mục" : "Chỉnh sửa danh mục"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Tên danh mục</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Quà tặng"
                  autoFocus
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> Lưu danh mục
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingCategory && (
        <div className="modal-overlay" onClick={() => setDeletingCategory(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa danh mục</h3>
              <button className="modal-close" onClick={() => setDeletingCategory(null)}>
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa danh mục <strong>{deletingCategory.name}</strong>?
                  Các biến thể Lego thuộc danh mục này cũng sẽ bị xóa.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setDeletingCategory(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <FiTrash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegoCategoriesTab;