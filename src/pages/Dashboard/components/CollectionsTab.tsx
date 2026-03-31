import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiImage,
  FiStar,
  FiEye,
  FiEyeOff,
  FiGrid,
  FiList,
  FiAlertTriangle,
  FiPackage,
  FiUpload,
  FiLink,
  FiRotateCcw,
} from "react-icons/fi";
import type { CollectionRow, CollectionFormState, ThumbnailTransform } from "../types";
import {
  ImageWithFallback,
  RichTextContent,
  RichTextEditor,
} from "../../../components/common";
import { getStaticAssetUrl } from "../../../lib/http";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import {
  normalizeRichTextForStorage,
  toRichTextPlainText,
} from "../../../lib/rich-text";
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

const EMPTY_FORM: CollectionFormState = {
  name: "",
  description: "",
  thumbnail: "",
  isActive: true,
  isFeatured: false,
};

const CONTAINER_AR = 16 / 9;
const EMPTY_TRANSFORM: ThumbnailTransform = { x: 0, y: 0, scale: 1, aspect: CONTAINER_AR };

function computeCover(aspect: number) {
  if (aspect >= CONTAINER_AR) {
    return { w: (aspect / CONTAINER_AR) * 100, h: 100 };
  }
  return { w: 100, h: (CONTAINER_AR / aspect) * 100 };
}

function getMaxPan(aspect: number, scale: number) {
  const { w, h } = computeCover(aspect);
  return {
    maxX: (w * scale - 100) / 200,
    maxY: (h * scale - 100) / 200,
  };
}

function clampTransform(
  x: number,
  y: number,
  scale: number,
  aspect: number,
): ThumbnailTransform {
  const { maxX, maxY } = getMaxPan(aspect, scale);
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
    scale,
    aspect,
  };
}

function imgPositionStyle(
  t: ThumbnailTransform,
): React.CSSProperties {
  const { x, y, scale, aspect } = t;
  const { w, h } = computeCover(aspect);
  const finalW = w * scale;
  const finalH = h * scale;
  return {
    position: "absolute",
    width: `${finalW}%`,
    height: `${finalH}%`,
    left: `${(100 - finalW) / 2 + x * 100}%`,
    top: `${(100 - finalH) / 2 + y * 100}%`,
    objectFit: "fill",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
  };
}

// Tạo slug từ tên
function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const CollectionsTab = () => {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<CollectionFormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Thumbnail input mode
  const [thumbMode, setThumbMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null); // object URL xem trước ngay
  const currentUser = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const canCreateCollection = hasPermission(currentUser, "collections.create");
  const canEditCollection = hasPermission(currentUser, "collections.edit");
  const canDeleteCollection = hasPermission(currentUser, "collections.delete");

  const [imgTransform, setImgTransform] = useState<ThumbnailTransform>(EMPTY_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, transformX: 0, transformY: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalThumbRef = useRef<string>(""); // thumbnail gốc khi mở modal
  const currentUploadRef = useRef<string>(""); // URL file đã upload trong phiên này

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

  // ── Tải danh sách ──────────────────────────────────────────────────────────
  const loadCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/collections`, {
        headers: authHeaders(),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setCollections(await res.json());
    } catch {
      toast.error("Không thể tải danh sách bộ sưu tập.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  // ── Lọc & tìm kiếm ────────────────────────────────────────────────────────
  const filtered = collections.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      toRichTextPlainText(c.description ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && c.isActive) ||
      (filterStatus === "inactive" && !c.isActive);
    return matchSearch && matchStatus;
  });

  // ── Handlers modal ─────────────────────────────────────────────────────────
  const openCreate = () => {
    if (!canCreateCollection) {
      toast.error("Bạn không có quyền tạo bộ sưu tập.");
      return;
    }

    setForm(EMPTY_FORM);
    setThumbMode("url");
    setLocalPreview(null);
    originalThumbRef.current = "";
    currentUploadRef.current = "";
    setModal("create");
    setImgTransform(EMPTY_TRANSFORM);
  };

  const openEdit = (c: CollectionRow) => {
    if (!canEditCollection) {
      toast.error("Bạn không có quyền chỉnh sửa bộ sưu tập.");
      return;
    }

    setEditId(c._id);
    setForm({
      name: c.name,
      description: c.description ?? "",
      thumbnail: c.thumbnail ?? "",
      isActive: c.isActive,
      isFeatured: c.isFeatured,
    });
    setThumbMode("url");
    setLocalPreview(null);
    originalThumbRef.current = c.thumbnail ?? "";
    currentUploadRef.current = "";
    setModal("edit");
    setImgTransform(c.thumbnailTransform ?? EMPTY_TRANSFORM);
  };

  /** Xóa file đã upload trên server (chỉ khi là local upload) */
  const deleteServerUpload = (url: string) => {
    const match = url.match(/\/uploads\/([^/?#]+)$/);
    if (!match) return;
    fetch(`${API_URL}/upload/image/${match[1]}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
      .then((res) => {
        handleAuthFailure(res);
      })
      .catch(() => {}); // im lặng nếu lỗi
  };

  const closeModal = () => {
    // Nếu có file upload trong phiên này mà chưa lưu → xóa khỏi server
    if (currentUploadRef.current) {
      deleteServerUpload(currentUploadRef.current);
      currentUploadRef.current = "";
    }
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setModal(null);
    setEditId(null);
  };

  // ── Upload ảnh lên server ──────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Hiển thị preview cục bộ ngay lập tức
    const preview = URL.createObjectURL(file);
    if (localPreview) URL.revokeObjectURL(localPreview); // giải phóng preview cũ
    setLocalPreview(preview);
    setImgTransform(EMPTY_TRANSFORM);
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
      if (handleAuthFailure(res)) return;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ?? "Upload thất bại.",
        );
      }
      const { url } = await res.json();
      const serverUrl = `${SERVER_ORIGIN}${url}`;

      // Nếu phiên này đã upload 1 file trước đó → xóa file cũ ngay
      if (currentUploadRef.current) {
        deleteServerUpload(currentUploadRef.current);
      }
      currentUploadRef.current = serverUrl;

      // Lưu URL server vào form để save, nhưng GIỮ localPreview để hiển thị
      setForm((p) => ({ ...p, thumbnail: serverUrl }));
    } catch (err) {
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      toast.error(getErrorMessage(err, "Không thể upload ảnh."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Lưu form ───────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreateCollection) {
      toast.error("Bạn không có quyền tạo bộ sưu tập.");
      return;
    }

    if (modal === "edit" && !canEditCollection) {
      toast.error("Bạn không có quyền chỉnh sửa bộ sưu tập.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Tên bộ sưu tập không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const description = normalizeRichTextForStorage(form.description);

      const body = {
        name: form.name.trim(),
        slug: toSlug(form.name.trim()),
        description: description || undefined,
        thumbnail: form.thumbnail.trim() || undefined,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        thumbnailTransform: form.thumbnail
          ? { x: imgTransform.x, y: imgTransform.y, scale: imgTransform.scale, aspect: imgTransform.aspect }
          : null,
      };

      const url =
        modal === "create"
          ? `${API_URL}/collections`
          : `${API_URL}/collections/${editId}`;
      const method = modal === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (handleAuthFailure(res)) return;

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          (d as { message?: string })?.message ??
            (modal === "create"
              ? "Tạo bộ sưu tập thất bại."
              : "Cập nhật thất bại."),
        );
      }

      toast.success(
        modal === "create"
          ? "Đã thêm bộ sưu tập thành công!"
          : "Đã cập nhật bộ sưu tập!",
      );
      // Xóa ref upload trước khi đóng để closeModal KHÔNG xóa ảnh vừa lưu
      currentUploadRef.current = "";
      closeModal();
      loadCollections();
    } catch (err) {
      toast.error(getErrorMessage(err, "Có lỗi xảy ra."));
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle trạng thái inline ───────────────────────────────────────────────
  const toggleActive = async (c: CollectionRow) => {
    if (!canEditCollection) {
      toast.error("Bạn không có quyền chỉnh sửa bộ sưu tập.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/collections/${c._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setCollections((prev) =>
        prev.map((x) =>
          x._id === c._id ? { ...x, isActive: !x.isActive } : x,
        ),
      );
      toast.success(
        c.isActive ? "Đã ẩn bộ sưu tập." : "Đã hiển thị bộ sưu tập.",
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái.");
    }
  };

  const toggleFeatured = async (c: CollectionRow) => {
    if (!canEditCollection) {
      toast.error("Bạn không có quyền chỉnh sửa bộ sưu tập.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/collections/${c._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isFeatured: !c.isFeatured }),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      setCollections((prev) =>
        prev.map((x) =>
          x._id === c._id ? { ...x, isFeatured: !x.isFeatured } : x,
        ),
      );
      toast.success(!c.isFeatured ? "Đã đánh dấu nổi bật." : "Đã bỏ nổi bật.");
    } catch {
      toast.error("Không thể thay đổi trạng thái.");
    }
  };

  // ── Xóa ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmId) return;

    if (!canDeleteCollection) {
      toast.error("Bạn không có quyền xóa bộ sưu tập.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/collections/${confirmId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (handleAuthFailure(res)) return;
      if (!res.ok) throw new Error();
      toast.success("Đã xóa bộ sưu tập.");
      setConfirmId(null);
      loadCollections();
    } catch {
      toast.error("Không thể xóa bộ sưu tập.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Drag/Zoom handlers ────────────────────────────────────────────────────
  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      transformX: imgTransform.x,
      transformY: imgTransform.y,
    };
  }, [imgTransform.x, imgTransform.y]);

  const handlePreviewMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.mouseX) / rect.width;
    const dy = (e.clientY - dragStart.current.mouseY) / rect.height;
    setImgTransform(prev =>
      clampTransform(
        dragStart.current.transformX + dx,
        dragStart.current.transformY + dy,
        prev.scale,
        prev.aspect,
      )
    );
  }, [isDragging]);

  const handlePreviewMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePreviewWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setImgTransform(prev => {
      const newScale = Math.max(1, Math.min(4, prev.scale + delta));
      return clampTransform(prev.x, prev.y, newScale, prev.aspect);
    });
  }, []);

  const handlePreviewImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    const aspect = naturalWidth / naturalHeight;
    setImgTransform(prev => clampTransform(prev.x, prev.y, prev.scale, aspect));
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCollections = collections.length;
  const activeCount = collections.filter((c) => c.isActive).length;
  const featuredCount = collections.filter((c) => c.isFeatured).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="tab-panel">
      {/* ── Header ── */}
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Bộ sưu tập</h2>
          <p className="tab-subtitle">
            Quản lý các bộ sưu tập sản phẩm của Soligant
          </p>
        </div>
        {canCreateCollection && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus />
            Thêm bộ sưu tập
          </button>
        )}
      </div>

      {/* ── Stats mini ── */}
      <div className="coll-stats">
        <div className="coll-stat-card">
          <FiPackage className="coll-stat-icon" style={{ color: "#731618" }} />
          <div>
            <span className="coll-stat-value">{totalCollections}</span>
            <span className="coll-stat-label">Tổng BST</span>
          </div>
        </div>
        <div className="coll-stat-card">
          <FiEye className="coll-stat-icon" style={{ color: "#16a34a" }} />
          <div>
            <span className="coll-stat-value">{activeCount}</span>
            <span className="coll-stat-label">Đang hiển thị</span>
          </div>
        </div>
        <div className="coll-stat-card">
          <FiStar className="coll-stat-icon" style={{ color: "#f59e0b" }} />
          <div>
            <span className="coll-stat-value">{featuredCount}</span>
            <span className="coll-stat-label">Nổi bật</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="tab-toolbar">
        <div className="tab-search-wrap">
          <FiSearch className="tab-search-icon" />
          <input
            className="tab-search"
            placeholder="Tìm theo tên, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="tab-search-clear" onClick={() => setSearch("")}>
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="coll-toolbar-right">
          {/* Filter status */}
          <div className="coll-filter-tabs">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                className={`coll-filter-btn${filterStatus === s ? " active" : ""}`}
                onClick={() => setFilterStatus(s)}
              >
                {s === "all" ? "Tất cả" : s === "active" ? "Hiển thị" : "Ẩn"}
                {s !== "all" && (
                  <span className="coll-filter-count">
                    {s === "active"
                      ? activeCount
                      : totalCollections - activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="coll-view-toggle">
            <button
              className={`coll-view-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Dạng lưới"
            >
              <FiGrid size={15} />
            </button>
            <button
              className={`coll-view-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Dạng danh sách"
            >
              <FiList size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="tab-loading">
          <div className="db-spinner" />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tab-empty">
          <FiPackage size={40} className="tab-empty-icon" />
          <p>
            {search || filterStatus !== "all"
              ? "Không tìm thấy bộ sưu tập nào."
              : "Chưa có bộ sưu tập nào. Hãy thêm mới!"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ─── GRID VIEW ─── */
        <div className="coll-grid">
          {filtered.map((c) => (
            <div
              key={c._id}
              className={`coll-card${!c.isActive ? " coll-card--inactive" : ""}`}
            >
              {/* Thumbnail */}
              <div className="coll-card__thumb">
                <ImageWithFallback
                  src={getStaticAssetUrl(c.thumbnail)}
                  alt={c.name}
                  style={c.thumbnailTransform ? imgPositionStyle(c.thumbnailTransform) : { width: "100%", height: "100%", objectFit: "cover" }}
                  fallback={
                    <div className="coll-card__no-thumb">
                      <FiImage size={32} />
                    </div>
                  }
                />
                {c.isFeatured && (
                  <span className="coll-card__featured-badge">
                    <FiStar size={11} /> Nổi bật
                  </span>
                )}
                {!c.isActive && (
                  <span className="coll-card__inactive-badge">Đã ẩn</span>
                )}
              </div>

              {/* Body */}
              <div className="coll-card__body">
                <h3 className="coll-card__name">{c.name}</h3>
                {c.slug && <span className="coll-card__slug">/{c.slug}</span>}
                {c.description && (
                  <RichTextContent
                    value={c.description}
                    className="coll-card__desc"
                  />
                )}
                {c.productsCount !== undefined && (
                  <span className="coll-card__count">
                    <FiPackage size={12} /> {c.productsCount} sản phẩm
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="coll-card__actions">
                {canEditCollection && (
                  <>
                    <button
                      className={`coll-icon-btn${c.isFeatured ? " coll-icon-btn--star" : ""}`}
                      title={c.isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                      onClick={() => toggleFeatured(c)}
                    >
                      <FiStar size={15} />
                    </button>
                    <button
                      className={`coll-icon-btn${c.isActive ? " coll-icon-btn--visible" : ""}`}
                      title={c.isActive ? "Ẩn" : "Hiện"}
                      onClick={() => toggleActive(c)}
                    >
                      {c.isActive ? (
                        <FiEye size={15} />
                      ) : (
                        <FiEyeOff size={15} />
                      )}
                    </button>
                    <button
                      className="coll-icon-btn coll-icon-btn--edit"
                      title="Chỉnh sửa"
                      onClick={() => openEdit(c)}
                    >
                      <FiEdit2 size={15} />
                    </button>
                  </>
                )}

                {canDeleteCollection && (
                  <button
                    className="coll-icon-btn coll-icon-btn--del"
                    title="Xóa"
                    onClick={() => setConfirmId(c._id)}
                  >
                    <FiTrash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Bộ sưu tập</th>
                <th>Slug</th>
                <th>Sản phẩm</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Nổi bật</th>
                <th style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} className={!c.isActive ? "row--inactive" : ""}>
                  <td>
                    <div className="coll-list__info">
                      <div className="coll-list__thumb">
                        <ImageWithFallback
                          src={getStaticAssetUrl(c.thumbnail)}
                          alt={c.name}
                          fallback={<FiImage size={16} />}
                        />
                      </div>
                      <span className="coll-list__name">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="tag tag--gray">{c.slug || "—"}</span>
                  </td>
                  <td>{c.productsCount ?? "—"}</td>
                  <td className="text-muted">
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td>
                    <button
                      className={`status-badge${c.isActive ? " status-badge--active" : " status-badge--inactive"}`}
                      onClick={() => toggleActive(c)}
                      title="Nhấn để thay đổi"
                      disabled={!canEditCollection}
                    >
                      {c.isActive ? "Hiển thị" : "Đã ẩn"}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`coll-icon-btn${c.isFeatured ? " coll-icon-btn--star" : ""}`}
                      onClick={() => toggleFeatured(c)}
                      title={c.isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                      disabled={!canEditCollection}
                    >
                      <FiStar size={15} />
                    </button>
                  </td>
                  <td>
                    <div className="tab-actions">
                      {canEditCollection && (
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEdit(c)}
                          title="Chỉnh sửa"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDeleteCollection && (
                        <button
                          className="btn-icon btn-del"
                          onClick={() => setConfirmId(c._id)}
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

      {/* ── Modal tạo / chỉnh sửa ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create"
                  ? "Thêm bộ sưu tập"
                  : "Chỉnh sửa bộ sưu tập"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="modal-body">
              {/* Tên */}
              <div className="form-group">
                <label className="form-label">
                  Tên bộ sưu tập <span className="form-required">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="VD: Xuân Hè 2025"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                {form.name && (
                  <p className="form-hint">
                    Slug: <code>{toSlug(form.name)}</code>
                  </p>
                )}
              </div>

              {/* Mô tả */}
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(nextValue) =>
                    setForm((prev) => ({ ...prev, description: nextValue }))
                  }
                  placeholder="Mô tả ngắn về bộ sưu tập..."
                  minHeight={130}
                />
              </div>

              {/* Ảnh thumbnail */}
              <div className="form-group">
                <label className="form-label">Ảnh đại diện</label>

                {/* Tab chọn mode */}
                <div className="coll-thumb-tabs">
                  <button
                    type="button"
                    className={`coll-thumb-tab${thumbMode === "url" ? " active" : ""}`}
                    onClick={() => setThumbMode("url")}
                  >
                    <FiLink size={13} /> Nhập URL
                  </button>
                  <button
                    type="button"
                    className={`coll-thumb-tab${thumbMode === "upload" ? " active" : ""}`}
                    onClick={() => setThumbMode("upload")}
                  >
                    <FiUpload size={13} /> Upload ảnh
                  </button>
                </div>

                {thumbMode === "url" ? (
                  <div className="coll-thumb-row">
                    <input
                      ref={thumbInputRef}
                      className="form-input"
                      placeholder="https://example.com/image.jpg"
                      value={form.thumbnail}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, thumbnail: e.target.value }))
                      }
                    />
                    {form.thumbnail && (
                      <button
                        type="button"
                        className="coll-thumb-clear"
                        onClick={() => {
                          setForm((p) => ({ ...p, thumbnail: "" }));
                          setImgTransform(EMPTY_TRANSFORM);
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="coll-upload-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="coll-file-input"
                      id="thumb-file-input"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />

                    {/* Khi chưa có ảnh – vùng chọn file */}
                    {!localPreview && !form.thumbnail && (
                      <label
                        htmlFor="thumb-file-input"
                        className="coll-upload-label"
                      >
                        <FiUpload size={24} />
                        <span>Nhấn để chọn ảnh</span>
                        <small>JPG, PNG, WebP, GIF, SVG — tối đa 5 MB</small>
                      </label>
                    )}
                  </div>
                )}

                {/* Interactive crop frame – hiển thị khi có ảnh (cả URL lẫn upload) */}
                {(localPreview || form.thumbnail) && (
                  <div
                    ref={previewRef}
                    className={`coll-img-frame${isDragging ? " coll-img-frame--dragging" : ""}`}
                    onMouseDown={handlePreviewMouseDown}
                    onMouseMove={handlePreviewMouseMove}
                    onMouseUp={handlePreviewMouseUp}
                    onMouseLeave={handlePreviewMouseUp}
                    onWheel={handlePreviewWheel}
                  >
                    <ImageWithFallback
                      src={getStaticAssetUrl(localPreview ?? form.thumbnail)}
                      alt="preview"
                      style={imgPositionStyle(imgTransform)}
                      onLoad={handlePreviewImgLoad}
                      draggable={false}
                      fallback={
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#cbd5e1",
                          }}
                        >
                          <FiImage size={28} />
                        </div>
                      }
                    />

                    {/* Uploading overlay */}
                    {uploading && (
                      <div className="coll-upload-overlay">
                        <div className="btn-spinner coll-upload-spinner" />
                        <span>Đang upload...</span>
                      </div>
                    )}

                    {/* Hint */}
                    {!uploading && (
                      <div className="coll-img-frame__hint">
                        Kéo để di chuyển · Cuộn để zoom ({Math.round(imgTransform.scale * 100)}%)
                      </div>
                    )}

                    {/* Actions */}
                    {!uploading && (
                      <div className="coll-upload-actions">
                        {imgTransform.scale !== 1 || imgTransform.x !== 0 || imgTransform.y !== 0 ? (
                          <button
                            type="button"
                            className="coll-upload-action-btn coll-upload-action-btn--change"
                            title="Reset vị trí"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImgTransform(prev => clampTransform(0, 0, 1, prev.aspect));
                            }}
                          >
                            <FiRotateCcw size={13} /> Reset
                          </button>
                        ) : null}
                        {thumbMode === "upload" && (
                          <label
                            htmlFor="thumb-file-input"
                            className="coll-upload-action-btn coll-upload-action-btn--change"
                            title="Đổi ảnh"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FiUpload size={14} /> Đổi ảnh
                          </label>
                        )}
                        <button
                          type="button"
                          className="coll-upload-action-btn coll-upload-action-btn--remove"
                          title="Xóa ảnh"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (thumbMode === "upload") {
                              if (currentUploadRef.current) {
                                deleteServerUpload(currentUploadRef.current);
                                currentUploadRef.current = "";
                              }
                              if (localPreview) {
                                URL.revokeObjectURL(localPreview);
                                setLocalPreview(null);
                              }
                            }
                            setForm((p) => ({ ...p, thumbnail: "" }));
                            setImgTransform(EMPTY_TRANSFORM);
                          }}
                        >
                          <FiTrash2 size={14} /> Xóa
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="form-group form-group--row">
                <label className="form-toggle">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.checked }))
                    }
                  />
                  <span className="form-toggle__track" />
                  <span className="form-toggle__label">
                    {form.isActive ? "Đang hiển thị" : "Đang ẩn"}
                  </span>
                </label>

                <label className="form-toggle">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isFeatured: e.target.checked }))
                    }
                  />
                  <span className="form-toggle__track" />
                  <span className="form-toggle__label">
                    <FiStar size={13} />
                    {form.isFeatured ? "Nổi bật" : "Không nổi bật"}
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="btn-spinner" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={15} />
                      {modal === "create" ? "Tạo mới" : "Lưu thay đổi"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm xóa ── */}
      {confirmId && (
        <div className="modal-overlay" onClick={() => setConfirmId(null)}>
          <div
            className="modal-box modal-box--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xác nhận xóa</h3>
              <button
                className="modal-close"
                onClick={() => setConfirmId(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa bộ sưu tập{" "}
                  <strong>
                    {collections.find((c) => c._id === confirmId)?.name}
                  </strong>
                  ? Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmId(null)}
                  disabled={deleting}
                >
                  Hủy
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="btn-spinner" />
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <FiTrash2 size={15} />
                      Xóa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsTab;
