import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiImage,
  FiMail,
  FiMessageSquare,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUser,
  FiX,
} from "react-icons/fi";
import { ImageWithFallback } from "../../../components/common";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl } from "../../../lib/http";
import { hasPermission } from "../../../lib/permissions";
import {
  createFeedback,
  deleteFeedback,
  deleteUploadedImageByUrl,
  getFeedbacks,
  updateFeedback,
  uploadFeedbackImage,
} from "../../../services/feedbacks.service";
import { useAuthStore } from "../../../store/auth.store";
import type { FeedbackFormState, FeedbackRow, FeedbackStatus } from "../types";

const EMPTY_FORM: FeedbackFormState = {
  name: "",
  email: "",
  phone: "",
  subject: "feedback",
  message: "",
  image: "",
  status: "new",
  isPublic: false,
  adminNote: "",
};

const STATUS_META: Record<
  FeedbackStatus,
  { label: string; bg: string; color: string }
> = {
  new: {
    label: "Mới",
    bg: "#fef3c7",
    color: "#92400e",
  },
  processing: {
    label: "Đang xử lý",
    bg: "#dbeafe",
    color: "#1d4ed8",
  },
  resolved: {
    label: "Hoàn tất",
    bg: "#dcfce7",
    color: "#166534",
  },
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const FeedbacksTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canCreate = hasPermission(currentUser, "feedbacks.create");
  const canEdit = hasPermission(currentUser, "feedbacks.edit");
  const canDelete = hasPermission(currentUser, "feedbacks.delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">(
    "all",
  );
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "public" | "private"
  >("all");

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackRow | null>(
    null,
  );
  const [deletingFeedback, setDeletingFeedback] = useState<FeedbackRow | null>(
    null,
  );
  const [form, setForm] = useState<FeedbackFormState>(EMPTY_FORM);

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const {
    data: feedbacks = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: getFeedbacks,
  });

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const clearImagePreview = () => {
    setImagePreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  };

  const resetImageDraft = () => {
    clearImagePreview();
    setPendingImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const closeModal = () => {
    setModal(null);
    setEditingFeedback(null);
    setForm(EMPTY_FORM);
    resetImageDraft();
  };

  const saveMutation = useMutation({
    mutationFn: async (variables: {
      id?: string;
      payload: Partial<FeedbackFormState>;
    }) => {
      if (variables.id) {
        return updateFeedback(variables.id, variables.payload);
      }

      return createFeedback(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success(
        variables.id
          ? "Đã cập nhật feedback."
          : "Đã tạo feedback mới thành công.",
      );
      closeModal();
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể lưu feedback."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success("Đã xóa feedback.");
      setDeletingFeedback(null);
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể xóa feedback."));
    },
  });

  const openCreate = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo feedback.");
      return;
    }

    setEditingFeedback(null);
    setForm(EMPTY_FORM);
    setModal("create");
  };

  const openEdit = (feedback: FeedbackRow) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa feedback.");
      return;
    }

    setEditingFeedback(feedback);
    setForm({
      name: feedback.name,
      email: feedback.email,
      phone: feedback.phone,
      subject: feedback.subject,
      message: feedback.message,
      image: feedback.image,
      status: feedback.status,
      isPublic: feedback.isPublic,
      adminNote: feedback.adminNote,
    });
    setModal("edit");
  };

  const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearImagePreview();
    setPendingImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    resetImageDraft();
    setForm((previous) => ({ ...previous, image: "" }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (modal === "create" && !canCreate) {
      toast.error("Bạn không có quyền tạo feedback.");
      return;
    }

    if (modal === "edit" && !canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa feedback.");
      return;
    }

    const name = normalizeText(form.name);
    const message = form.message.trim();

    if (!name) {
      toast.error("Tên khách hàng không được để trống.");
      return;
    }

    if (!message) {
      toast.error("Nội dung feedback không được để trống.");
      return;
    }

    if (message.length > 3000) {
      toast.error("Nội dung feedback tối đa 3000 ký tự.");
      return;
    }

    let uploadedImageUrl: string | null = null;
    let saveAttempted = false;

    try {
      let image = form.image.trim();

      if (pendingImageFile) {
        image = await uploadFeedbackImage(pendingImageFile);
        uploadedImageUrl = image;
      }

      if (!image && modal === "create") {
        toast.error("Vui lòng chọn ảnh feedback.");
        return;
      }

      saveAttempted = true;

      await saveMutation.mutateAsync({
        id: editingFeedback?.id,
        payload: {
          name,
          message,
          image,
          ...(editingFeedback
            ? {}
            : {
                subject: "feedback",
                status: "resolved",
                isPublic: true,
              }),
        },
      });
    } catch (saveError) {
      if (uploadedImageUrl) {
        await deleteUploadedImageByUrl(uploadedImageUrl);
      }

      if (!saveAttempted) {
        toast.error(getErrorMessage(saveError, "Không thể tải ảnh lên."));
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingFeedback) return;

    if (!canDelete) {
      toast.error("Bạn không có quyền xóa feedback.");
      return;
    }

    await deleteMutation.mutateAsync(deletingFeedback.id);
  };

  const handleQuickUpdate = async (
    feedback: FeedbackRow,
    payload: Partial<FeedbackFormState>,
    successMessage: string,
  ) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa feedback.");
      return;
    }

    try {
      await updateFeedback(feedback.id, payload);
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success(successMessage);
    } catch (quickUpdateError) {
      toast.error(
        getErrorMessage(quickUpdateError, "Không thể cập nhật feedback."),
      );
    }
  };

  const filteredFeedbacks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return feedbacks.filter((feedback) => {
      const matchesKeyword =
        !keyword ||
        feedback.name.toLowerCase().includes(keyword) ||
        feedback.email.toLowerCase().includes(keyword) ||
        feedback.subject.toLowerCase().includes(keyword) ||
        feedback.message.toLowerCase().includes(keyword) ||
        feedback.phone.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || feedback.status === statusFilter;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" && feedback.isPublic) ||
        (visibilityFilter === "private" && !feedback.isPublic);

      return matchesKeyword && matchesStatus && matchesVisibility;
    });
  }, [feedbacks, search, statusFilter, visibilityFilter]);

  const stats = useMemo(
    () => ({
      total: feedbacks.length,
      newCount: feedbacks.filter((item) => item.status === "new").length,
      resolvedCount: feedbacks.filter((item) => item.status === "resolved")
        .length,
      publicCount: feedbacks.filter((item) => item.isPublic).length,
    }),
    [feedbacks],
  );

  const modalPreviewSrc = imagePreview ?? getStaticAssetUrl(form.image);

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Quản lý Feedback</h2>
          <p className="tab-subtitle">
            Theo dõi phản hồi khách hàng và quản lý feedback hiển thị ngoài
            trang chủ.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn-secondary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <FiRefreshCw size={14} /> {isFetching ? "Đang tải..." : "Làm mới"}
          </button>
          {canCreate && (
            <button className="btn-primary" onClick={openCreate}>
              <FiPlus size={15} /> Tạo feedback
            </button>
          )}
        </div>
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiMessageSquare size={15} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng feedback</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiClock size={15} />
          </span>
          <div>
            <strong>{stats.newCount}</strong>
            <span>Feedback mới</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiCheckCircle size={15} />
          </span>
          <div>
            <strong>{stats.resolvedCount}</strong>
            <span>Đã hoàn tất</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiEye size={15} />
          </span>
          <div>
            <strong>{stats.publicCount}</strong>
            <span>Đang public</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <FiSearch className="tab-search-icon" />
          <input
            className="tab-search"
            placeholder="Tìm theo tên, nội dung, liên hệ..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button className="tab-search-clear" onClick={() => setSearch("")}>
              <FiX size={14} />
            </button>
          )}
        </div>

        <select
          className="form-input"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as FeedbackStatus | "all")
          }
          style={{ maxWidth: 180 }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="new">Mới</option>
          <option value="processing">Đang xử lý</option>
          <option value="resolved">Hoàn tất</option>
        </select>

        <select
          className="form-input"
          value={visibilityFilter}
          onChange={(event) =>
            setVisibilityFilter(
              event.target.value as "all" | "public" | "private",
            )
          }
          style={{ maxWidth: 180 }}
        >
          <option value="all">Tất cả hiển thị</option>
          <option value="public">Public</option>
          <option value="private">Nội bộ</option>
        </select>
      </section>

      {isLoading ? (
        <div className="tab-loading">
          <div className="db-spinner" />
          <p>Đang tải feedback...</p>
        </div>
      ) : isError ? (
        <div className="tab-empty">
          <FiAlertTriangle size={40} className="tab-empty-icon" />
          <p>{getErrorMessage(error, "Không thể tải danh sách feedback.")}</p>
          <button className="btn-secondary" onClick={() => refetch()}>
            <FiRefreshCw size={14} /> Thử lại
          </button>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="tab-empty">
          <FiMessageSquare size={40} className="tab-empty-icon" />
          <p>Không tìm thấy feedback phù hợp.</p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Chủ đề / Nội dung</th>
                <th>Trạng thái</th>
                <th>Hiển thị</th>
                <th>Ngày gửi</th>
                <th>Ảnh</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((feedback) => {
                const statusMeta = STATUS_META[feedback.status];
                return (
                  <tr key={feedback.id}>
                    <td>
                      <div style={{ display: "grid", gap: 2 }}>
                        <strong>{feedback.name}</strong>
                        {feedback.email && (
                          <span className="text-muted">
                            <FiMail size={12} style={{ marginRight: 4 }} />
                            {feedback.email}
                          </span>
                        )}
                        {feedback.phone && (
                          <span className="text-muted">{feedback.phone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span className="lc-name-chip">{feedback.subject}</span>
                        <p
                          className="text-muted"
                          style={{
                            margin: 0,
                            maxWidth: 340,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {feedback.message}
                        </p>
                      </div>
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="form-input"
                          value={feedback.status}
                          onChange={(event) =>
                            handleQuickUpdate(
                              feedback,
                              {
                                status: event.target.value as FeedbackStatus,
                              },
                              "Đã cập nhật trạng thái feedback.",
                            )
                          }
                          style={{ minWidth: 140, padding: "6px 10px" }}
                        >
                          <option value="new">Mới</option>
                          <option value="processing">Đang xử lý</option>
                          <option value="resolved">Hoàn tất</option>
                        </select>
                      ) : (
                        <span
                          className="lc-name-chip"
                          style={{
                            background: statusMeta.bg,
                            color: statusMeta.color,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <button
                          className={`status-badge ${
                            feedback.isPublic
                              ? "status-badge--active"
                              : "status-badge--inactive"
                          }`}
                          onClick={() =>
                            handleQuickUpdate(
                              feedback,
                              { isPublic: !feedback.isPublic },
                              feedback.isPublic
                                ? "Đã chuyển feedback về nội bộ."
                                : "Đã bật hiển thị public cho feedback.",
                            )
                          }
                        >
                          {feedback.isPublic ? (
                            <FiEye size={13} />
                          ) : (
                            <FiEyeOff size={13} />
                          )}
                          {feedback.isPublic ? "Public" : "Nội bộ"}
                        </button>
                      ) : (
                        <span className="text-muted">
                          {feedback.isPublic ? "Public" : "Nội bộ"}
                        </span>
                      )}
                    </td>
                    <td className="text-muted">
                      {formatDateTime(feedback.createdAt)}
                    </td>
                    <td>
                      {feedback.image ? (
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                          }}
                        >
                          <ImageWithFallback
                            src={getStaticAssetUrl(feedback.image)}
                            alt={`Feedback của ${feedback.name}`}
                            width={52}
                            height={52}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="tab-actions">
                        {canEdit && (
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => openEdit(feedback)}
                            title="Chỉnh sửa feedback"
                          >
                            <FiEdit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-icon btn-del"
                            onClick={() => setDeletingFeedback(feedback)}
                            title="Xóa feedback"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create" ? "Tạo feedback" : "Cập nhật feedback"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">
                  Tên khách hàng <span className="form-required">*</span>
                </label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Nhập tên khách hàng"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mô tả <span className="form-required">*</span>
                </label>
                <textarea
                  className="form-input form-textarea"
                  value={form.message}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Nhập mô tả feedback"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Ảnh đính kèm <span className="form-required">*</span>
                </label>
                <div className="lcu-upload-wrap">
                  <div className="lcu-upload-preview">
                    {modalPreviewSrc ? (
                      <ImageWithFallback
                        src={modalPreviewSrc}
                        alt="Preview feedback"
                        width={120}
                        height={120}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="lcu-upload-preview__empty">
                        <FiImage size={18} />
                        <span>Chưa có ảnh</span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={imageInputRef}
                    className="lcu-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelected}
                  />

                  <div className="lcu-upload-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <FiUpload size={14} />
                      {pendingImageFile ? "Đổi ảnh" : "Chọn ảnh"}
                    </button>

                    {(pendingImageFile || form.image) && (
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={handleRemoveImage}
                      >
                        <FiTrash2 size={14} /> Xóa ảnh
                      </button>
                    )}
                  </div>

                  <p className="form-hint">
                    Feedback mới tạo sẽ tự động hiển thị ở trang chủ. Dung lượng
                    ảnh tối đa 5MB, định dạng JPG/PNG/GIF/WEBP/SVG.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiUser size={14} />{" "}
                      {modal === "create" ? "Tạo feedback" : "Lưu thay đổi"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingFeedback && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingFeedback(null)}
        >
          <div
            className="modal-box modal-box--sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa feedback</h3>
              <button
                className="modal-close"
                onClick={() => setDeletingFeedback(null)}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa feedback của{" "}
                  <strong>{deletingFeedback.name}</strong>?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeletingFeedback(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <FiTrash2 size={14} /> Xóa feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbacksTab;
