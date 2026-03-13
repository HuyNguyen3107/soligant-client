import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiEdit2, FiImage, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import type { BackgroundTheme, BackgroundThemeFormState } from "../types";
import {
  createBackgroundTheme,
  deleteBackgroundTheme,
  getBackgroundThemes,
  updateBackgroundTheme,
} from "../../../services/background-themes.service";
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

const BackgroundThemesTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canCreate = hasPermission(currentUser, "background-themes.create");
  const canEdit = hasPermission(currentUser, "background-themes.edit");
  const canDelete = hasPermission(currentUser, "background-themes.delete");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingTheme, setEditingTheme] = useState<BackgroundTheme | null>(null);
  const [deletingTheme, setDeletingTheme] = useState<BackgroundTheme | null>(null);
  const [form, setForm] = useState<BackgroundThemeFormState>({ name: "", isActive: true });

  const { data: themes = [] } = useQuery({
    queryKey: ["background-themes"],
    queryFn: getBackgroundThemes,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: BackgroundThemeFormState }) => {
      if (payload.id) return updateBackgroundTheme(payload.id, payload.data);
      return createBackgroundTheme(payload.data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["background-themes"] });
      toast.success(
        variables.id ? "Đã cập nhật chủ đề background." : "Đã tạo chủ đề background mới."
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu chủ đề background."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBackgroundTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background-themes"] });
      toast.success("Đã xóa chủ đề background.");
      setDeletingTheme(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa chủ đề background."));
    },
  });

  const filteredThemes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return themes;
    return themes.filter((t) => t.name.toLowerCase().includes(keyword));
  }, [themes, search]);

  const closeModal = () => {
    setModal(null);
    setEditingTheme(null);
    setForm({ name: "", isActive: true });
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingTheme(null);
    setForm({ name: "", isActive: true });
    setModal("create");
  };

  const openEdit = (theme: BackgroundTheme) => {
    if (!canEdit) return;
    setEditingTheme(theme);
    setForm({ name: theme.name, isActive: theme.isActive });
    setModal("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim().replace(/\s+/g, " ");
    if (!name) {
      toast.error("Tên chủ đề không được để trống.");
      return;
    }
    await saveMutation.mutateAsync({
      id: editingTheme?.id,
      data: { name, isActive: form.isActive },
    });
  };

  const handleDelete = async () => {
    if (!deletingTheme) return;
    await deleteMutation.mutateAsync(deletingTheme.id);
  };

  return (
    <div className="tab-panel lc-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Danh mục Chủ đề Background</h2>
          <p className="tab-subtitle">Quản lý các danh mục/chủ đề nhóm các bối cảnh.</p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Tạo chủ đề
          </button>
        )}
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon"><FiImage size={15} /></span>
          <div>
            <strong>{themes.length}</strong>
            <span>Chủ đề hiện có</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên chủ đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="tab-search-clear" onClick={() => setSearch("")}>
              <FiX size={14} />
            </button>
          )}
        </div>
      </section>

      {filteredThemes.length === 0 ? (
        <div className="tab-empty">
          <FiImage size={40} className="tab-empty-icon" />
          <p>Không tìm thấy chủ đề phù hợp.</p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Tên chủ đề</th>
                <th>Trạng thái</th>
                <th>Cập nhật lần cuối</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredThemes.map((theme) => (
                <tr key={theme.id}>
                  <td><strong>{theme.name}</strong></td>
                  <td>
                    <span
                      className="lc-name-chip"
                      style={{
                        background: theme.isActive ? "#e8f5e9" : "#fce4ec",
                        color: theme.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {theme.isActive ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="text-muted">{formatDateTime(theme.updatedAt)}</td>
                  <td>
                    <div className="tab-actions">
                      {canEdit && (
                        <button className="btn-icon btn-edit" onClick={() => openEdit(theme)}>
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-icon btn-del" onClick={() => setDeletingTheme(theme)}>
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

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal === "create" ? "Tạo chủ đề" : "Sửa chủ đề"}</h3>
              <button className="modal-close" onClick={closeModal}><FiX size={16} /></button>
            </div>
            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Tên chủ đề *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Thiên nhiên"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="promo-radio" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  <span>Hoạt động</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Đang lưu..." : "Lưu chủ đề"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingTheme && (
        <div className="modal-overlay" onClick={() => setDeletingTheme(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa chủ đề</h3>
              <button className="modal-close" onClick={() => setDeletingTheme(null)}><FiX size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>Bạn có chắc muốn xóa chủ đề <strong>{deletingTheme.name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setDeletingTheme(null)}>Hủy</button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
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

export default BackgroundThemesTab;
