import { useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  FiX,
  FiSave,
  FiLock,
  FiEye,
  FiEyeOff,
  FiUpload,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import type {
  UserInfo,
  ProfileForm,
  PasswordForm,
  ShowPasswordState,
} from "../types";
import { getErrorMessage } from "../../../lib/error";

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
// Origin thuần (không có /api) để dùng cho static file URLs
const SERVER_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL;
  }
})();

interface ProfileModalProps {
  user: UserInfo;
  onClose: () => void;
  onSaved: (updated: UserInfo) => void;
  dark: boolean;
}

const ProfileModal = ({ user, onClose, onSaved, dark }: ProfileModalProps) => {
  const [tab, setTab] = useState<"info" | "password">("info");

  // ── Info form ──
  const [form, setForm] = useState<ProfileForm>({
    name: user.name ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
    avatar: user.avatar ?? "",
  });
  const [saving, setSaving] = useState(false);

  // ── Avatar upload state ──
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadRef = useRef<string>("");

  /** Xóa file đã upload trên server */
  const deleteServerUpload = (url: string) => {
    const match = url.match(/\/uploads\/([^/?#]+)$/);
    if (!match) return;
    fetch(`${API_URL}/upload/image/${match[1]}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    }).catch(() => {}); // im lặng nếu lỗi
  };

  /** Xử lý upload avatar */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hiển thị preview cục bộ ngay lập tức
    const preview = URL.createObjectURL(file);
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(preview);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ?? "Upload thất bại.",
        );
      }
      const { url } = await res.json();
      const serverUrl = `${SERVER_ORIGIN}${url}`;

      // Nếu đã upload 1 file trước đó → xóa file cũ
      if (currentUploadRef.current) {
        deleteServerUpload(currentUploadRef.current);
      }
      currentUploadRef.current = serverUrl;

      // Lưu URL server vào form
      setForm((p) => ({ ...p, avatar: serverUrl }));
    } catch (err) {
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      toast.error(getErrorMessage(err, "Không thể upload ảnh."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** Xóa avatar */
  const handleRemoveAvatar = () => {
    if (currentUploadRef.current) {
      deleteServerUpload(currentUploadRef.current);
      currentUploadRef.current = "";
    }
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setForm((p) => ({ ...p, avatar: "" }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Họ tên không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const body: Record<string, unknown> = { name: form.name.trim() };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.avatar.trim()) body.avatar = form.avatar.trim();

      const res = await fetch(`${API_URL}/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Cập nhật thông tin thất bại.");
      const updated: UserInfo = await res.json();
      const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...updated }));
      toast.success("Đã cập nhật thông tin thành công!");
      onSaved({ ...user, ...updated });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Có lỗi xảy ra."));
    } finally {
      setSaving(false);
    }
  };

  // ── Password form ──
  const [pwForm, setPwForm] = useState<PasswordForm>({
    current: "",
    newPw: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState<ShowPasswordState>({
    current: false,
    newPw: false,
    confirm: false,
  });
  const [pwSaving, setPwSaving] = useState(false);

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const toggleShow = (field: keyof typeof showPw) =>
    setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) {
      toast.error("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (/\s/.test(pwForm.newPw)) {
      toast.error("Mật khẩu mới không được chứa khoảng trắng.");
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error("Xác nhận mật khẩu không khớp.");
      return;
    }
    setPwSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/users/${user.id}/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.newPw,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Xảy ra lỗi khi đổi mật khẩu.");
      }
      toast.success("Đổi mật khẩu thành công!");
      setPwForm({ current: "", newPw: "", confirm: "" });
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Có lỗi xảy ra."));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div
        className={`pm-modal${dark ? " dark" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-header">
          <div className="pm-header__left">
            <div className="pm-avatar">
              {localPreview || form.avatar ? (
                <img
                  src={localPreview ?? form.avatar}
                  alt={form.name}
                  className="pm-avatar__img"
                />
              ) : (
                (user.name?.[0]?.toUpperCase() ?? "A")
              )}
            </div>
            <div>
              <h3 className="pm-title">Cài đặt tài khoản</h3>
              <p className="pm-email">{user.email}</p>
            </div>
          </div>
          <button className="pm-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="pm-tabs">
          <button
            className={`pm-tab${tab === "info" ? " active" : ""}`}
            onClick={() => setTab("info")}
          >
            Thông tin
          </button>
          <button
            className={`pm-tab${tab === "password" ? " active" : ""}`}
            onClick={() => setTab("password")}
          >
            <FiLock size={13} /> Đổi mật khẩu
          </button>
        </div>

        {/* Tab: Info */}
        {tab === "info" && (
          <form className="pm-form" onSubmit={handleSubmit}>
            {/* Avatar upload */}
            <div className="pm-field">
              <label className="pm-label">Ảnh đại diện</label>
              <div className="pm-avatar-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="pm-avatar-upload__input"
                  id="avatar-file-input"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                {localPreview || form.avatar ? (
                  <div className="pm-avatar-upload__preview-wrap">
                    <div className="pm-avatar-upload__preview">
                      <img
                        src={localPreview ?? form.avatar}
                        alt="Avatar preview"
                        className="pm-avatar-upload__img"
                      />
                      {uploading && (
                        <div className="pm-avatar-upload__overlay">
                          <span className="pm-spin" />
                          <span>Đang upload...</span>
                        </div>
                      )}
                    </div>
                    {!uploading && (
                      <div className="pm-avatar-upload__actions">
                        <label
                          htmlFor="avatar-file-input"
                          className="pm-avatar-upload__btn pm-avatar-upload__btn--change"
                          title="Đổi ảnh"
                        >
                          <FiUpload size={14} /> Đổi ảnh
                        </label>
                        <button
                          type="button"
                          className="pm-avatar-upload__btn pm-avatar-upload__btn--remove"
                          title="Xóa ảnh"
                          onClick={handleRemoveAvatar}
                        >
                          <FiTrash2 size={14} /> Xóa
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="avatar-file-input"
                    className="pm-avatar-upload__label"
                  >
                    <div className="pm-avatar-upload__placeholder">
                      <FiUser size={32} />
                      <span>Nhấn để chọn ảnh</span>
                      <small>JPG, PNG, WebP, GIF — tối đa 5 MB</small>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="pm-field">
              <label className="pm-label">
                Họ và tên <span className="pm-required">*</span>
              </label>
              <input
                className="pm-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nhập họ và tên"
              />
            </div>
            <div className="pm-field">
              <label className="pm-label">Số điện thoại</label>
              <input
                className="pm-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0xxxxxxxxx"
              />
            </div>
            <div className="pm-field">
              <label className="pm-label">Địa chỉ</label>
              <input
                className="pm-input"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Nhập địa chỉ"
              />
            </div>
            <div className="pm-actions">
              <button
                type="button"
                className="pm-btn pm-btn--cancel"
                onClick={onClose}
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
                    <FiSave size={15} /> Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Password */}
        {tab === "password" && (
          <form className="pm-form" onSubmit={handlePwSubmit}>
            <div className="pm-field">
              <label className="pm-label">Mật khẩu hiện tại</label>
              <div className="pm-pw-wrap">
                <input
                  className="pm-input"
                  name="current"
                  type={showPw.current ? "text" : "password"}
                  value={pwForm.current}
                  onChange={handlePwChange}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  className="pm-pw-eye"
                  onClick={() => toggleShow("current")}
                >
                  {showPw.current ? (
                    <FiEyeOff size={15} />
                  ) : (
                    <FiEye size={15} />
                  )}
                </button>
              </div>
            </div>
            <div className="pm-field">
              <label className="pm-label">Mật khẩu mới</label>
              <div className="pm-pw-wrap">
                <input
                  className="pm-input"
                  name="newPw"
                  type={showPw.newPw ? "text" : "password"}
                  value={pwForm.newPw}
                  onChange={handlePwChange}
                  placeholder="Ít nhất 6 ký tự"
                />
                <button
                  type="button"
                  className="pm-pw-eye"
                  onClick={() => toggleShow("newPw")}
                >
                  {showPw.newPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>
            <div className="pm-field">
              <label className="pm-label">Xác nhận mật khẩu mới</label>
              <div className="pm-pw-wrap">
                <input
                  className="pm-input"
                  name="confirm"
                  type={showPw.confirm ? "text" : "password"}
                  value={pwForm.confirm}
                  onChange={handlePwChange}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  className="pm-pw-eye"
                  onClick={() => toggleShow("confirm")}
                >
                  {showPw.confirm ? (
                    <FiEyeOff size={15} />
                  ) : (
                    <FiEye size={15} />
                  )}
                </button>
              </div>
            </div>
            <div className="pm-actions">
              <button
                type="button"
                className="pm-btn pm-btn--cancel"
                onClick={onClose}
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="pm-btn pm-btn--save"
                disabled={pwSaving}
              >
                {pwSaving ? (
                  <>
                    <span className="pm-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <FiLock size={15} /> Đổi mật khẩu
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
