import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiShield,
  FiUserCheck,
  FiLock,
} from "react-icons/fi";
import type { RoleOption, UserRow, UserFormState } from "../types";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const SERVER_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL;
  }
})();

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  customRoleId: "",
};

const UsersTab = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const currentUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const canViewUsers = hasPermission(currentUser, "users.view");
  const canCreateUser = hasPermission(currentUser, "users.create");
  const canEditUser = hasPermission(currentUser, "users.edit");
  const canDeleteUser = hasPermission(currentUser, "users.delete");
  const canViewRoles = hasPermission(currentUser, "roles.view");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  });

  const handleAuthFailure = (res: Response) => {
    if (res.status !== 401 && res.status !== 403) return false;
    clearSession();
    window.location.replace("/login");
    return true;
  };

  const loadUsers = async () => {
    if (!canViewUsers) {
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/users`, { headers: authHeaders() });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error("Không thể tải danh sách người dùng.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadRoles = async () => {
    if (!canViewRoles) {
      setAvailableRoles([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/roles`, { headers: authHeaders() });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setAvailableRoles(await res.json());
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewUsers, canViewRoles]);

  const openCreate = () => {
    if (!canCreateUser) {
      toast.error("Bạn không có quyền tạo người dùng.");
      return;
    }

    setForm(EMPTY_FORM);
    setModal("create");
  };

  const openEdit = (u: UserRow) => {
    if (!canEditUser) {
      toast.error("Bạn không có quyền chỉnh sửa người dùng.");
      return;
    }

    setEditId(u._id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone ?? "",
      address: u.address ?? "",
      customRoleId: u.customRole?._id ?? "",
    });
    setModal("edit");
  };
  const closeModal = () => {
    setModal(null);
    setEditId(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreateUser) {
      toast.error("Bạn không có quyền tạo người dùng.");
      return;
    }

    if (modal === "edit" && !canEditUser) {
      toast.error("Bạn không có quyền chỉnh sửa người dùng.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Họ tên không được để trống.");
      return;
    }

    if (modal === "create") {
      if (!form.email.trim()) {
        toast.error("Email không được để trống.");
        return;
      }

      if (form.password.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }

      if (/\s/.test(form.password)) {
        toast.error("Mật khẩu không được chứa khoảng trắng.");
        return;
      }
    }

    setSaving(true);
    try {
      if (modal === "create") {
        const body: Record<string, string> = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        };
        if (form.phone.trim()) body.phone = form.phone.trim();
        if (form.address.trim()) body.address = form.address.trim();
        if (form.customRoleId) body.customRoleId = form.customRoleId;
        const res = await fetch(`${API_URL}/users`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (handleAuthFailure(res)) return;
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(
            (d as { message?: string })?.message ?? "Tạo tài khoản thất bại.",
          );
        }
        toast.success("Đã thêm người dùng thành công!");
      } else {
        const body: Record<string, string> = { name: form.name.trim() };
        if (form.phone.trim()) body.phone = form.phone.trim();
        if (form.address.trim()) body.address = form.address.trim();
        body.customRoleId = form.customRoleId; // empty string = remove role
        const res = await fetch(`${API_URL}/users/${editId}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (handleAuthFailure(res)) return;
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(
            (d as { message?: string })?.message ?? "Cập nhật thất bại.",
          );
        }
        toast.success("Đã cập nhật thông tin!");
      }
      closeModal();
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteUser) {
      toast.error("Bạn không có quyền xóa người dùng.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ?? "Xóa thất bại.",
        );
      }
      toast.success("Đã xóa người dùng.");
      setConfirmId(null);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleLabel = (role: string) =>
    role === "admin" ? "Quản trị" : "Người dùng";
  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "—";
  const getAvatarUrl = (avatar?: string) => {
    if (!avatar?.trim()) return "";
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
      return avatar;
    }
    const normalized = avatar.startsWith("/") ? avatar : `/${avatar}`;
    return `${SERVER_ORIGIN}${normalized}`;
  };

  return (
    <div className="ut-root">
      {/* Toolbar */}
      <div className="ut-toolbar">
        <div className="ut-search-wrap">
          <FiSearch className="ut-search-icon" size={15} />
          <input
            className="ut-search"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canCreateUser && (
          <button className="ut-add-btn" onClick={openCreate}>
            <FiPlus size={15} /> Thêm người dùng
          </button>
        )}
      </div>

      {/* Table */}
      {loadingUsers ? (
        <div className="ut-loading">
          <div className="db-spinner" />
          <span>Đang tải...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ut-empty">Không tìm thấy người dùng nào.</div>
      ) : (
        <div className="ut-table-wrap">
          <table className="ut-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Quyền</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="ut-user-cell">
                      <div className="ut-avatar">
                        {getAvatarUrl(u.avatar) ? (
                          <img
                            src={getAvatarUrl(u.avatar)}
                            alt={u.name}
                            className="ut-avatar__img"
                          />
                        ) : (
                          u.name[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="ut-name">{u.name}</p>
                        {u.address && <p className="ut-address">{u.address}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="ut-email">{u.email}</td>
                  <td className="ut-phone">{u.phone ?? "—"}</td>
                  <td>
                    <span className={`ut-badge ut-badge--${u.role}`}>
                      {u.role === "admin" ? (
                        <FiShield size={11} />
                      ) : (
                        <FiUserCheck size={11} />
                      )}
                      {u.customRole?.name ?? roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="ut-date">{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="ut-actions">
                      {u.email === "admin@soligant.gift" ? (
                        <span
                          className="rt-system-lock"
                          title="Tài khoản hệ thống, không thể sửa hoặc xóa"
                        >
                          <FiLock size={14} />
                        </span>
                      ) : (
                        <>
                          {canEditUser && (
                            <button
                              className="ut-btn ut-btn--edit"
                              onClick={() => openEdit(u)}
                              title="Chỉnh sửa"
                            >
                              <FiEdit2 size={14} />
                            </button>
                          )}

                          {canDeleteUser && u.role !== "admin" && (
                            <button
                              className="ut-btn ut-btn--del"
                              onClick={() => setConfirmId(u._id)}
                              title="Xóa"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}

                          {!canEditUser && !canDeleteUser && (
                            <span
                              className="rt-system-lock"
                              title="Bạn chỉ có quyền xem"
                            >
                              <FiLock size={14} />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!loadingUsers && (
        <p className="ut-summary">
          Hiển thị {filtered.length}/{users.length} người dùng
        </p>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="ut-backdrop" onClick={closeModal}>
          <div className="ut-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ut-modal__header">
              <h3>
                {modal === "create"
                  ? "Thêm người dùng"
                  : "Chỉnh sửa người dùng"}
              </h3>
              <button className="pm-close" onClick={closeModal}>
                <FiX size={18} />
              </button>
            </div>
            <form className="ut-modal__form" onSubmit={handleSave}>
              <div className="pm-field">
                <label className="pm-label">
                  Họ và tên <span className="pm-required">*</span>
                </label>
                <input
                  className="pm-input"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Nhập họ tên"
                />
              </div>
              {modal === "create" ? (
                <>
                  <div className="pm-field">
                    <label className="pm-label">
                      Email <span className="pm-required">*</span>
                    </label>
                    <input
                      className="pm-input"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFormChange}
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="pm-field">
                    <label className="pm-label">
                      Mật khẩu <span className="pm-required">*</span>
                    </label>
                    <input
                      className="pm-input"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleFormChange}
                      placeholder="Ít nhất 6 ký tự"
                    />
                  </div>
                </>
              ) : (
                <div className="pm-field">
                  <label className="pm-label">Email</label>
                  <input
                    className="pm-input"
                    value={form.email}
                    disabled
                    style={{ opacity: 0.55 }}
                  />
                </div>
              )}
              <div className="ut-row2">
                <div className="pm-field">
                  <label className="pm-label">Địa chỉ</label>
                  <input
                    className="pm-input"
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="Địa chỉ"
                  />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Số điện thoại</label>
                  <input
                    className="pm-input"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="0xxxxxxxxx"
                  />
                </div>
              </div>
              <div className="pm-field">
                <label className="pm-label">Vai trò</label>
                <select
                  className="pm-input"
                  value={form.customRoleId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, customRoleId: e.target.value }))
                  }
                >
                  <option value="">-- Không gán vai trò --</option>
                  {availableRoles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                      {r.isSystem ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pm-actions">
                <button
                  type="button"
                  className="pm-btn pm-btn--cancel"
                  onClick={closeModal}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="pm-btn pm-btn--save"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="pm-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} />{" "}
                      {modal === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmId && (
        <div className="ut-backdrop" onClick={() => setConfirmId(null)}>
          <div className="ut-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="ut-confirm__icon">
              <FiTrash2 size={28} />
            </div>
            <h4 className="ut-confirm__title">Xác nhận xóa</h4>
            <p className="ut-confirm__text">
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa người
              dùng này?
            </p>
            <div className="ut-confirm__actions">
              <button
                className="pm-btn pm-btn--cancel"
                onClick={() => setConfirmId(null)}
              >
                Huỷ
              </button>
              <button
                className="pm-btn ut-btn--danger"
                disabled={deleting}
                onClick={() => handleDelete(confirmId)}
              >
                {deleting ? (
                  <>
                    <span className="pm-spin" /> Đang xóa...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={14} /> Xóa người dùng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
