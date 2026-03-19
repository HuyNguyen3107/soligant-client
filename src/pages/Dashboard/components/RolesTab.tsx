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
  FiLock,
  FiAlertTriangle,
  FiList,
  FiTag,
} from "react-icons/fi";
import type { SysPerm, CustomRole, RoleForm } from "../types";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const EMPTY_ROLE_FORM: RoleForm = {
  name: "",
  permissionIds: [],
};

const RolesTab = () => {
  const [subTab, setSubTab] = useState<"roles" | "permissions">("roles");

  /* ── roles state ─────────────────────────────────────────────────────────── */
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleSearch, setRoleSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_ROLE_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── permissions state ───────────────────────────────────────────────────── */
  const [sysPerms, setSysPerms] = useState<SysPerm[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const currentUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const canCreateRole = hasPermission(currentUser, "roles.create");
  const canEditRole = hasPermission(currentUser, "roles.edit");
  const canDeleteRole = hasPermission(currentUser, "roles.delete");
  const canViewPermissions = hasPermission(currentUser, "permissions.view");

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

  /* ── loaders ─────────────────────────────────────────────────────────────── */
  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch(`${API_URL}/roles`, { headers: authHeaders() });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setRoles(await res.json());
    } catch {
      toast.error("Không thể tải danh sách vai trò.");
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadPerms = async () => {
    if (!canViewPermissions) {
      setSysPerms([]);
      setLoadingPerms(false);
      return;
    }

    setLoadingPerms(true);
    try {
      const res = await fetch(`${API_URL}/permissions`, {
        headers: authHeaders(),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setSysPerms(await res.json());
    } catch {
      toast.error("Không thể tải danh sách quyền.");
    } finally {
      setLoadingPerms(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadPerms();
  }, [canViewPermissions]);

  useEffect(() => {
    if (subTab === "permissions" && !canViewPermissions) {
      setSubTab("roles");
    }
  }, [canViewPermissions, subTab]);

  /* ── permission helpers ──────────────────────────────────────────────────── */
  const groupedPerms = sysPerms.reduce<Record<string, SysPerm[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const togglePerm = (id: string) =>
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(id)
        ? prev.permissionIds.filter((x) => x !== id)
        : [...prev.permissionIds, id],
    }));

  const toggleGroup = (groupPerms: SysPerm[]) => {
    const ids = groupPerms.map((p) => p._id);
    const allChecked = ids.every((id) => form.permissionIds.includes(id));
    setForm((prev) => ({
      ...prev,
      permissionIds: allChecked
        ? prev.permissionIds.filter((id) => !ids.includes(id))
        : [...new Set([...prev.permissionIds, ...ids])],
    }));
  };

  /* ── modal handlers ──────────────────────────────────────────────────────── */
  const openCreate = () => {
    if (!canCreateRole) {
      toast.error("Bạn không có quyền tạo vai trò.");
      return;
    }

    if (!canViewPermissions) {
      toast.error("Bạn không có quyền xem danh sách quyền hệ thống.");
      return;
    }

    setForm(EMPTY_ROLE_FORM);
    setEditId(null);
    setModal("create");
  };

  const openEdit = (r: CustomRole) => {
    if (!canEditRole) {
      toast.error("Bạn không có quyền chỉnh sửa vai trò.");
      return;
    }

    if (!canViewPermissions) {
      toast.error("Bạn không có quyền xem danh sách quyền hệ thống.");
      return;
    }

    setEditId(r._id);
    setForm({
      name: r.name,
      permissionIds: r.permissions.map((p) => p._id),
    });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditId(null);
  };

  /* ── save ────────────────────────────────────────────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreateRole) {
      toast.error("Bạn không có quyền tạo vai trò.");
      return;
    }

    if (modal === "edit" && !canEditRole) {
      toast.error("Bạn không có quyền chỉnh sửa vai trò.");
      return;
    }

    if (!canViewPermissions) {
      toast.error("Bạn không có quyền xem danh sách quyền hệ thống.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Tên vai trò không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        permissionIds: form.permissionIds,
      };
      const url =
        modal === "create" ? `${API_URL}/roles` : `${API_URL}/roles/${editId}`;
      const method = modal === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ??
            (modal === "create"
              ? "Tạo vai trò thất bại."
              : "Cập nhật thất bại."),
        );
      }
      toast.success(
        modal === "create" ? "Đã tạo vai trò mới!" : "Đã cập nhật vai trò!",
      );
      closeModal();
      loadRoles();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Có lỗi xảy ra."));
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ──────────────────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!canDeleteRole) {
      toast.error("Bạn không có quyền xóa vai trò.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/roles/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ?? "Xóa vai trò thất bại.",
        );
      }
      toast.success("Đã xóa vai trò.");
      setConfirmId(null);
      loadRoles();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Có lỗi xảy ra."));
    } finally {
      setDeleting(false);
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  const confirmRole = roles.find((r) => r._id === confirmId);

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="rt-root">
      {/* Sub-tabs */}
      <div className="rt-subtabs">
        <button
          className={`rt-subtab ${subTab === "roles" ? "rt-subtab--active" : ""}`}
          onClick={() => setSubTab("roles")}
        >
          <FiShield size={14} /> Vai trò
        </button>
        {canViewPermissions && (
          <button
            className={`rt-subtab ${subTab === "permissions" ? "rt-subtab--active" : ""}`}
            onClick={() => setSubTab("permissions")}
          >
            <FiList size={14} /> Quyền hệ thống
          </button>
        )}
      </div>

      {/* ── ROLES subtab ─────────────────────────────────────────────────────── */}
      {subTab === "roles" && (
        <>
          {/* Toolbar */}
          <div className="ut-toolbar">
            <div className="ut-search-wrap">
              <FiSearch className="ut-search-icon" size={15} />
              <input
                className="ut-search"
                placeholder="Tìm theo tên vai trò..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
              />
            </div>
            {canCreateRole && (
              <button className="ut-add-btn" onClick={openCreate}>
                <FiPlus size={15} /> Tạo vai trò
              </button>
            )}
          </div>

          {/* Table */}
          {loadingRoles ? (
            <div className="ut-loading">
              <div className="db-spinner" />
              <span>Đang tải...</span>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="ut-empty">Chưa có vai trò nào.</div>
          ) : (
            <div className="ut-table-wrap">
              <table className="ut-table">
                <thead>
                  <tr>
                    <th>Tên vai trò</th>
                    <th>Quyền được gán</th>
                    <th>Ngày tạo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <div className="rt-role-name-cell">
                          <div className="rt-role-icon">
                            <FiShield size={14} />
                          </div>
                          <span className="ut-name">{r.name}</span>
                          {r.isSystem && (
                            <span className="rt-system-badge">
                              <FiLock size={10} /> Hệ thống
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="rt-perm-chips">
                          {r.permissions.length === 0 ? (
                            <span className="rt-no-desc">Chưa có quyền</span>
                          ) : (
                            <>
                              {r.permissions.slice(0, 3).map((p) => (
                                <span key={p._id} className="rt-perm-chip">
                                  <FiTag size={9} />
                                  {p.label}
                                </span>
                              ))}
                              {r.permissions.length > 3 && (
                                <span className="rt-perm-chip rt-perm-chip--more">
                                  +{r.permissions.length - 3}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="ut-phone">{fmtDate(r.createdAt)}</td>
                      <td>
                        <div className="ut-actions">
                          {r.isSystem ? (
                            <span
                              className="rt-system-lock"
                              title="Vai trò hệ thống, không thể sửa hoặc xóa"
                            >
                              <FiLock size={14} />
                            </span>
                          ) : (
                            <>
                              {canEditRole && (
                                <button
                                  className="ut-act-btn ut-act-btn--edit"
                                  title="Chỉnh sửa"
                                  onClick={() => openEdit(r)}
                                >
                                  <FiEdit2 size={14} />
                                </button>
                              )}
                              {canDeleteRole && (
                                <button
                                  className="ut-act-btn ut-act-btn--del"
                                  title="Xóa"
                                  onClick={() => setConfirmId(r._id)}
                                >
                                  <FiTrash2 size={14} />
                                </button>
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

          {/* Create / Edit modal */}
          {modal && (
            <div className="ut-overlay">
              <div className="rt-modal">
                <div className="rt-modal__head">
                  <h3 className="rt-modal__title">
                    {modal === "create" ? (
                      <>
                        <FiPlus size={16} /> Tạo vai trò mới
                      </>
                    ) : (
                      <>
                        <FiEdit2 size={16} /> Chỉnh sửa vai trò
                      </>
                    )}
                  </h3>
                  <button
                    className="pm-close"
                    onClick={closeModal}
                    type="button"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                <form onSubmit={handleSave} className="rt-modal__body">
                  {/* Role name */}
                  <div className="pm-field">
                    <label className="pm-label">
                      Tên vai trò <span className="pm-required">*</span>
                    </label>
                    <input
                      className="pm-input"
                      placeholder="VD: Biên tập viên, Quản lý kho..."
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>

                  {/* Permission checkboxes */}
                  <div className="rt-perm-section">
                    <div className="rt-perm-section__head">
                      <span className="pm-label">
                        Quyền hạn
                        <span className="rt-selected-count">
                          {form.permissionIds.length} / {sysPerms.length} đã
                          chọn
                        </span>
                      </span>
                      <button
                        type="button"
                        className="rt-select-all-btn"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            permissionIds:
                              p.permissionIds.length === sysPerms.length
                                ? []
                                : sysPerms.map((x) => x._id),
                          }))
                        }
                      >
                        {form.permissionIds.length === sysPerms.length
                          ? "Bỏ chọn tất cả"
                          : "Chọn tất cả"}
                      </button>
                    </div>

                    {loadingPerms ? (
                      <div className="ut-loading" style={{ padding: "16px 0" }}>
                        <div className="db-spinner" />
                        <span>Đang tải quyền...</span>
                      </div>
                    ) : (
                      <div className="rt-perm-groups">
                        {Object.entries(groupedPerms).map(([group, perms]) => {
                          const allChecked = perms.every((p) =>
                            form.permissionIds.includes(p._id),
                          );
                          const someChecked = perms.some((p) =>
                            form.permissionIds.includes(p._id),
                          );
                          return (
                            <div key={group} className="rt-perm-group">
                              <label className="rt-group-header">
                                <input
                                  type="checkbox"
                                  className="rt-group-chk"
                                  checked={allChecked}
                                  ref={(el) => {
                                    if (el)
                                      el.indeterminate =
                                        someChecked && !allChecked;
                                  }}
                                  onChange={() => toggleGroup(perms)}
                                />
                                <span className="rt-group-label">{group}</span>
                                <span className="rt-group-count">
                                  {
                                    perms.filter((p) =>
                                      form.permissionIds.includes(p._id),
                                    ).length
                                  }
                                  /{perms.length}
                                </span>
                              </label>
                              <div className="rt-perm-chk-list">
                                {perms.map((p) => (
                                  <label
                                    key={p._id}
                                    className="rt-perm-chk-item"
                                  >
                                    <input
                                      type="checkbox"
                                      className="rt-perm-chk"
                                      checked={form.permissionIds.includes(
                                        p._id,
                                      )}
                                      onChange={() => togglePerm(p._id)}
                                    />
                                    <span className="rt-perm-chk-label">
                                      <code className="rt-perm-key">
                                        {p.key}
                                      </code>
                                      {p.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pm-actions">
                    <button
                      type="button"
                      className="pm-btn pm-btn--cancel"
                      onClick={closeModal}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="pm-btn pm-btn--save"
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="db-spinner db-spinner--sm" />
                      ) : (
                        <>
                          <FiSave size={14} />
                          {modal === "create" ? "Tạo vai trò" : "Lưu thay đổi"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {confirmId && (
            <div className="ut-overlay">
              <div className="ut-confirm-box">
                <div className="ut-confirm-warn">
                  <FiAlertTriangle size={24} />
                </div>
                <h3 className="ut-confirm-title">Xóa vai trò</h3>
                <p className="ut-confirm-msg">
                  Bạn có chắc muốn xóa vai trò{" "}
                  <strong>{confirmRole?.name}</strong>? Hành động này không thể
                  hoàn tác.
                </p>
                <div className="ut-confirm-actions">
                  <button
                    className="ut-cancel-btn"
                    onClick={() => setConfirmId(null)}
                    disabled={deleting}
                  >
                    Hủy
                  </button>
                  <button
                    className="ut-del-btn"
                    onClick={() => handleDelete(confirmId)}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <div className="db-spinner db-spinner--sm" />
                    ) : (
                      <>
                        <FiTrash2 size={14} /> Xóa vai trò
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PERMISSIONS subtab ─────────────────────────────────────────────── */}
      {subTab === "permissions" && (
        <div className="rt-sysperm-root">
          {loadingPerms ? (
            <div className="ut-loading">
              <div className="db-spinner" />
              <span>Đang tải...</span>
            </div>
          ) : (
            <div className="rt-sysperm-groups">
              {Object.entries(groupedPerms).map(([group, perms]) => (
                <div key={group} className="rt-sysperm-group">
                  <div className="rt-sysperm-group__head">
                    <FiShield size={13} />
                    <span>{group}</span>
                    <span className="rt-sysperm-group__count">
                      {perms.length} quyền
                    </span>
                  </div>
                  <div className="rt-sysperm-list">
                    {perms.map((p) => (
                      <div key={p._id} className="rt-sysperm-item">
                        <code className="rt-perm-key rt-perm-key--display">
                          {p.key}
                        </code>
                        <span className="rt-sysperm-label">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RolesTab;
