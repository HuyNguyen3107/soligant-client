import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiBox,
  FiEdit2,
  FiImage,
  FiLayers,
  FiPackage,
  FiPlus,
  FiSliders,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import {
  createBearCustomizationGroup,
  createBearCustomizationOption,
  deleteBearCustomizationGroup,
  deleteBearCustomizationOption,
  getBearCustomizationGroups,
  type BearCustomizationGroupPayload,
  type BearCustomizationOptionPayload,
  updateBearCustomizationGroup,
  updateBearCustomizationOption,
} from "../../../services/bear-customizations.service";
import type {
  BearCustomizationGroup,
  BearCustomizationGroupForm,
  BearCustomizationOption,
  BearCustomizationOptionForm,
} from "../types";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl, http } from "../../../lib/http";
import { hasPermission } from "../../../lib/permissions";
import { isRichTextEmpty } from "../../../lib/rich-text";
import { useAuthStore } from "../../../store/auth.store";
import {
  ImageWithFallback,
  RichTextContent,
  RichTextEditor,
} from "../../../components/common";

interface UploadImageResponse {
  url?: string;
}

const DEFAULT_COLOR_CODE = "#D1D5DB";

const EMPTY_GROUP_FORM: BearCustomizationGroupForm = {
  name: "",
  helper: "",
};

const EMPTY_OPTION_FORM: BearCustomizationOptionForm = {
  groupId: "",
  name: "",
  description: "",
  price: "0",
  stockQuantity: "0",
  lowStockThreshold: "5",
  allowImageUpload: false,
  image: "",
  colorCode: DEFAULT_COLOR_CODE,
};

const BEARS_CUSTOMIZATIONS_NAME = "Tùy chỉnh Gấu";

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")} đ`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const deleteUploadedImageByUrl = async (url: string) => {
  const match = url.match(/\/uploads\/([^/?#]+)$/);
  if (!match) return;

  try {
    await http.delete(`/upload/image/${match[1]}`);
  } catch {
    // silently fail image deletion
  }
};

const BearCustomizationsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] =
    useState<BearCustomizationGroup | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<BearCustomizationGroup | null>(null);
  const [groupForm, setGroupForm] =
    useState<BearCustomizationGroupForm>(EMPTY_GROUP_FORM);

  const [optionModal, setOptionModal] = useState<"create" | "edit" | null>(
    null,
  );
  const [editingOption, setEditingOption] =
    useState<BearCustomizationOption | null>(null);
  const [confirmDeleteOption, setConfirmDeleteOption] =
    useState<BearCustomizationOption | null>(null);
  const [optionForm, setOptionForm] =
    useState<BearCustomizationOptionForm>(EMPTY_OPTION_FORM);

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useAuthStore((state) => state.user);
  const canCreate = hasPermission(currentUser, "bear-customizations.create");
  const canEdit = hasPermission(currentUser, "bear-customizations.edit");
  const canDelete = hasPermission(currentUser, "bear-customizations.delete");

  const { data: groups = [] } = useQuery({
    queryKey: ["bear-customizations"],
    queryFn: getBearCustomizationGroups,
  });

  const clearLocalPreview = useCallback(() => {
    setLocalPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const resetImageDraft = useCallback(() => {
    clearLocalPreview();
    setPendingImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [clearLocalPreview]);

  const closeGroupModal = useCallback(() => {
    setGroupModal(null);
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP_FORM);
  }, []);

  const closeOptionModal = useCallback(() => {
    setOptionModal(null);
    setEditingOption(null);
    setOptionForm(EMPTY_OPTION_FORM);
    resetImageDraft();
  }, [resetImageDraft]);

  // --- MUTATIONS ---
  const saveGroupMutation = useMutation({
    mutationFn: async (variables: {
      id?: string;
      payload: BearCustomizationGroupPayload;
    }) => {
      if (variables.id) {
        return updateBearCustomizationGroup(variables.id, variables.payload);
      }
      return createBearCustomizationGroup(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success(
        variables.id ? "Đã cập nhật nhóm tùy chỉnh." : "Đã tạo nhóm tùy chỉnh.",
      );
      closeGroupModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu nhóm tùy chỉnh."));
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteBearCustomizationGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success("Đã xóa nhóm tùy chỉnh.");
      setConfirmDeleteGroup(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa nhóm tùy chỉnh."));
    },
  });

  const saveOptionMutation = useMutation({
    mutationFn: async (variables: {
      id?: string;
      payload: BearCustomizationOptionPayload;
    }) => {
      if (variables.id) {
        return updateBearCustomizationOption(variables.id, variables.payload);
      }
      return createBearCustomizationOption(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success(
        variables.id ? "Đã cập nhật lựa chọn." : "Đã thêm lựa chọn.",
      );
      closeOptionModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu lựa chọn."));
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: deleteBearCustomizationOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success("Đã xóa lựa chọn.");
      setConfirmDeleteOption(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa lựa chọn."));
    },
  });

  // --- FILTERING ---
  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groups;

    return groups.filter((group) => {
      const groupMatches =
        group.name.toLowerCase().includes(keyword) ||
        group.helper.toLowerCase().includes(keyword);

      const hasMatchingOption = group.options.some(
        (opt) =>
          opt.name.toLowerCase().includes(keyword) ||
          opt.description.toLowerCase().includes(keyword),
      );

      return groupMatches || hasMatchingOption;
    });
  }, [groups, search]);

  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0);

  // --- UI HANDLERS: GROUPS ---
  const openCreateGroup = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền thêm nhóm.");
      return;
    }
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP_FORM);
    setGroupModal("create");
  };

  const openEditGroup = (group: BearCustomizationGroup) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền sửa nhóm.");
      return;
    }
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      helper: group.helper,
    });
    setGroupModal("edit");
  };

  const handleGroupFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setGroupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      toast.error("Vui lòng nhập tên nhóm.");
      return;
    }

    const isDuplicate = groups.find(
      (g) =>
        g.id !== editingGroup?.id &&
        g.name.trim().toLowerCase() === groupForm.name.trim().toLowerCase(),
    );

    if (isDuplicate) {
      toast.error("Tên nhóm này đã tồn tại.");
      return;
    }

    await saveGroupMutation.mutateAsync({
      id: editingGroup?.id,
      payload: {
        name: groupForm.name.trim(),
        helper: groupForm.helper.trim(),
      },
    });
  };

  // --- UI HANDLERS: OPTIONS ---
  const openCreateOption = (groupId: string) => {
    if (!canCreate) {
      toast.error("Bạn không có quyền thêm lựa chọn.");
      return;
    }
    setEditingOption(null);
    setOptionForm({
      ...EMPTY_OPTION_FORM,
      groupId,
      stockQuantity: "600",
      lowStockThreshold: "5",
    });
    resetImageDraft();
    setOptionModal("create");
  };

  const openEditOption = (option: BearCustomizationOption) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền sửa lựa chọn.");
      return;
    }
    setEditingOption(option);
    setOptionForm({
      groupId: option.groupId,
      name: option.name,
      description: option.description,
      price: String(option.price),
      stockQuantity: String(option.stockQuantity),
      lowStockThreshold: String(option.lowStockThreshold),
      allowImageUpload: option.allowImageUpload,
      image: option.image,
      colorCode:
        option.allowImageUpload || option.colorCode.trim()
          ? option.colorCode
          : DEFAULT_COLOR_CODE,
    });
    resetImageDraft();
    setOptionModal("edit");
  };

  const handleOptionFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (name === "allowImageUpload") {
      const allowImageUpload = (e.target as HTMLInputElement).checked;
      setOptionForm((prev) => ({
        ...prev,
        allowImageUpload,
        colorCode: allowImageUpload
          ? prev.colorCode
          : prev.colorCode.trim() || DEFAULT_COLOR_CODE,
      }));
      return;
    }

    if (type === "checkbox") {
      setOptionForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
      return;
    }

    setOptionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const resetInput = () => {
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    };

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh.");
      resetInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB.");
      resetInput();
      return;
    }

    clearLocalPreview();
    setLocalPreview(URL.createObjectURL(file));
    setPendingImageFile(file);
    resetInput();
  };

  const clearImage = () => {
    resetImageDraft();
    setOptionForm((prev) => ({ ...prev, image: "" }));
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = optionForm.name.trim();
    const price = Number(optionForm.price);
    const stockQuantity = Number(optionForm.stockQuantity);
    const lowStockThreshold = Number(optionForm.lowStockThreshold);

    if (!name) {
      toast.error("Vui lòng nhập tên lựa chọn.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      toast.error("Giá tiền không hợp lệ.");
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      toast.error("Tồn kho phải là số nguyên >= 0.");
      return;
    }

    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      toast.error("Ngưỡng tồn thấp phải là số nguyên >= 0.");
      return;
    }

    if (!optionForm.allowImageUpload && !optionForm.colorCode.trim()) {
      toast.error("Vui lòng chọn mã màu khi tắt chế độ dùng ảnh.");
      return;
    }

    if (
      optionForm.allowImageUpload &&
      !optionForm.image.trim() &&
      !pendingImageFile
    ) {
      toast.error(
        "Bạn đã bật chế độ ảnh, vui lòng tải lên ảnh cho lựa chọn này.",
      );
      return;
    }

    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (
      optionForm.colorCode.trim() &&
      !colorRegex.test(optionForm.colorCode.trim())
    ) {
      toast.error("Mã màu không hợp lệ. Vui lòng chọn màu từ bảng màu.");
      return;
    }

    let uploadedImageUrl: string | null = null;
    let finalImage = optionForm.image.trim();
    let finalColorCode = optionForm.colorCode.trim().toUpperCase();

    if (optionForm.allowImageUpload) {
      try {
        if (pendingImageFile) {
          const formData = new FormData();
          formData.append("file", pendingImageFile);

          const { data } = await http.post<UploadImageResponse>(
            "/upload/image",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
          );

          finalImage = typeof data?.url === "string" ? data.url.trim() : "";
          uploadedImageUrl = finalImage || null;

          if (!finalImage) {
            throw new Error("Tải ảnh thất bại.");
          }
        }

        finalColorCode = "";
      } catch (error) {
        toast.error(getErrorMessage(error, "Lỗi khi xử lý hình ảnh sản phẩm."));
        return;
      }
    } else {
      finalImage = "";
    }

    try {
      await saveOptionMutation.mutateAsync({
        id: editingOption?.id,
        payload: {
          groupId: optionForm.groupId,
          name,
          description: optionForm.description.trim(),
          price: Math.round(price),
          stockQuantity,
          lowStockThreshold,
          allowImageUpload: optionForm.allowImageUpload,
          image: finalImage,
          colorCode: finalColorCode,
        },
      });
    } catch (error) {
      if (uploadedImageUrl) {
        await deleteUploadedImageByUrl(uploadedImageUrl);
      }
      if (!saveOptionMutation.isError) {
        toast.error(getErrorMessage(error, "Lưu không thành công."));
      }
    }
  };

  const optionPreviewSrc = localPreview ?? getStaticAssetUrl(optionForm.image);

  return (
    <div className="tab-panel lf-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">{BEARS_CUSTOMIZATIONS_NAME}</h2>
          <p className="tab-subtitle">
            Cấu hình các tùy chọn thêm cho sản phẩm gấu.
          </p>
        </div>
        <div className="lf-header-actions">
          {canCreate && (
            <button className="btn-primary" onClick={openCreateGroup}>
              <FiPlus size={15} /> Thêm nhóm mới
            </button>
          )}
        </div>
      </div>

      <section className="lf-product-card">
        <div className="lf-product-card__icon">
          <FiSliders size={18} />
        </div>
        <div className="lf-product-card__content">
          <h3>Các nhóm {BEARS_CUSTOMIZATIONS_NAME.toLowerCase()}</h3>
          <p>
            Tạo các nhóm tùy chọn. Bên trong mỗi nhóm chứa các lựa chọn con (VD:
            Phụ kiện cầm tay, Nơ cổ, Ảnh tải lên).
          </p>
        </div>
      </section>

      <section className="lf-stats">
        <div className="lf-stat-card">
          <span className="lf-stat-card__icon lf-stat-card__icon--variant">
            <FiLayers size={16} />
          </span>
          <div>
            <strong>{groups.length}</strong>
            <span>Nhóm tùy chỉnh</span>
          </div>
        </div>
        <div className="lf-stat-card">
          <span className="lf-stat-card__icon lf-stat-card__icon--active">
            <FiPackage size={15} />
          </span>
          <div>
            <strong>{totalOptions}</strong>
            <span>Lựa chọn</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap" style={{ flex: 1, maxWidth: 400 }}>
          <input
            className="tab-search"
            placeholder="Tìm theo tên nhóm, lựa chọn..."
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

      {groups.length === 0 ? (
        <div className="tab-empty">
          <FiBox size={42} className="tab-empty-icon" />
          <p>Chưa có nhóm tùy chỉnh gấu nào được tạo.</p>
          {canCreate && (
            <button
              className="btn-primary mt-4"
              onClick={openCreateGroup}
              style={{ marginTop: 16 }}
            >
              <FiPlus size={15} /> Tạo nhóm đầu tiên
            </button>
          )}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="tab-empty">
          <FiAlertTriangle size={42} className="tab-empty-icon" />
          <p>Không tìm thấy nhóm hoặc lựa chọn phù hợp.</p>
        </div>
      ) : (
        <div className="lcu-group-list">
          {filteredGroups.map((group) => (
            <article key={group.id} className="lcu-group-card">
              <div className="lcu-group-card__header">
                <div>
                  <div className="lcu-group-card__meta">
                    <span className="lc-name-chip">{group.name}</span>
                  </div>

                  {isRichTextEmpty(group.helper) ? (
                    <p className="lcu-group-card__helper">
                      Chưa có mô tả hướng dẫn cho nhóm này.
                    </p>
                  ) : (
                    <RichTextContent
                      value={group.helper}
                      className="lcu-group-card__helper"
                    />
                  )}

                  <div className="lcu-group-card__foot">
                    <span>{group.optionCount} lựa chọn</span>
                    <span>Cập nhật: {formatDateTime(group.updatedAt)}</span>
                  </div>
                </div>

                <div className="tab-actions lcu-group-card__actions">
                  {canCreate && (
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => openCreateOption(group.id)}
                      title="Thêm lựa chọn"
                    >
                      <FiPlus size={14} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => openEditGroup(group)}
                      title="Chỉnh sửa nhóm"
                    >
                      <FiEdit2 size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="btn-icon btn-del"
                      onClick={() => setConfirmDeleteGroup(group)}
                      title="Xóa nhóm"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="lcu-group-card__body">
                {group.options.length === 0 ? (
                  <div className="lcu-option-empty">
                    Chưa có lựa chọn nào trong nhóm này. Tạo các mục như Áo đỏ,
                    Áo xanh, Nơ cổ... để khách hàng có thể chọn ở trang
                    customizer.
                  </div>
                ) : (
                  <div className="tab-table-wrap">
                    <table className="tab-table">
                      <thead>
                        <tr>
                          <th>Lựa chọn</th>
                          <th>Hiển thị</th>
                          <th>Giá</th>
                          <th>Tồn kho</th>
                          <th>Cập nhật</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.options.map((option) => {
                          const optionImageUrl = getStaticAssetUrl(
                            option.image,
                          );

                          return (
                            <tr key={option.id}>
                              <td>
                                <div className="lcu-option-name">
                                  <strong>{option.name}</strong>
                                  {isRichTextEmpty(option.description) ? (
                                    <span>Chưa có mô tả cho lựa chọn này.</span>
                                  ) : (
                                    <RichTextContent
                                      value={option.description}
                                      className="lcu-option-name__desc"
                                    />
                                  )}
                                </div>
                              </td>
                              <td>
                                {option.allowImageUpload ? (
                                  <div className="lcu-option-visual lcu-option-visual--image">
                                    <ImageWithFallback
                                      src={optionImageUrl}
                                      alt={option.name}
                                      fallback={<span>Chưa có ảnh</span>}
                                    />
                                  </div>
                                ) : (
                                  <div className="lcu-option-visual lcu-option-visual--color">
                                    <span
                                      className="lcu-color-swatch"
                                      style={{
                                        backgroundColor:
                                          option.colorCode || "#D1D5DB",
                                      }}
                                    />
                                    <span className="lcu-color-code">
                                      {option.colorCode || "#D1D5DB"}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="lcu-price">
                                {formatCurrency(option.price)}
                              </td>
                              <td>
                                <div style={{ display: "grid", gap: "2px" }}>
                                  <strong>{option.stockQuantity}</strong>
                                  <span
                                    className="text-muted"
                                    style={{ fontSize: "12px" }}
                                  >
                                    Ngưỡng thấp: {option.lowStockThreshold}
                                  </span>
                                </div>
                              </td>
                              <td className="text-muted">
                                {formatDateTime(option.updatedAt)}
                              </td>
                              <td>
                                <div className="tab-actions">
                                  {canEdit && (
                                    <button
                                      className="btn-icon btn-edit"
                                      onClick={() => openEditOption(option)}
                                      title="Chỉnh sửa lựa chọn"
                                    >
                                      <FiEdit2 size={14} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      className="btn-icon btn-del"
                                      onClick={() =>
                                        setConfirmDeleteOption(option)
                                      }
                                      title="Xóa lựa chọn"
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
              </div>
            </article>
          ))}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Nhóm */}
      {groupModal && (
        <div className="modal-overlay" onClick={closeGroupModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {groupModal === "create"
                  ? "Tạo nhóm tùy chỉnh"
                  : "Chỉnh sửa nhóm tùy chỉnh"}
              </h3>
              <button className="modal-close" onClick={closeGroupModal}>
                <FiX size={16} />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveGroup}>
              <div className="form-group">
                <label className="form-label">Tên nhóm</label>
                <input
                  className="form-input"
                  name="name"
                  value={groupForm.name}
                  onChange={handleGroupFormChange}
                  placeholder="VD: Phụ kiện cầm tay"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả hướng dẫn</label>
                <RichTextEditor
                  value={groupForm.helper}
                  onChange={(nextValue) =>
                    setGroupForm((prev) => ({ ...prev, helper: nextValue }))
                  }
                  placeholder="Gợi ý cho khách hàng, ví dụ: Chọn 1 loại phụ kiện ưng ý..."
                  minHeight={130}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeGroupModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveGroupMutation.isPending}
                >
                  {saveGroupMutation.isPending ? "Đang lưu..." : "Lưu nhóm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Thêm / Sửa Lựa chọn (Option) */}
      {optionModal && (
        <div className="modal-overlay" onClick={closeOptionModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {optionModal === "create" ? "Thêm lựa chọn" : "Sửa lựa chọn"}{" "}
                <span className="text-muted text-sm font-normal ml-2">
                  (Nhóm: {groups.find((g) => g.id === optionForm.groupId)?.name}
                  )
                </span>
              </h3>
              <button className="modal-close" onClick={closeOptionModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveOption}>
              <div className="form-group">
                <label className="form-label">Nhóm tùy chỉnh</label>
                <select
                  className="form-input"
                  name="groupId"
                  value={optionForm.groupId}
                  onChange={handleOptionFormChange}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tên lựa chọn</label>
                <input
                  className="form-input"
                  name="name"
                  value={optionForm.name}
                  onChange={handleOptionFormChange}
                  placeholder="VD: Trái tim"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <RichTextEditor
                  value={optionForm.description}
                  onChange={(nextValue) =>
                    setOptionForm((prev) => ({
                      ...prev,
                      description: nextValue,
                    }))
                  }
                  placeholder="Mô tả ngắn giúp khách hàng phân biệt lựa chọn này."
                  minHeight={130}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  name="price"
                  value={optionForm.price}
                  onChange={handleOptionFormChange}
                  placeholder="Để trống sẽ là miễn phí"
                />
                <p className="form-hint">
                  Để trống hoặc nhập 0 nếu bạn muốn lựa chọn này miễn phí.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Số lượng tồn kho</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  name="stockQuantity"
                  value={optionForm.stockQuantity}
                  onChange={handleOptionFormChange}
                  placeholder="VD: 25"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngưỡng cảnh báo tồn thấp</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  name="lowStockThreshold"
                  value={optionForm.lowStockThreshold}
                  onChange={handleOptionFormChange}
                  placeholder="VD: 5"
                />
              </div>

              <label className="form-toggle">
                <input
                  type="checkbox"
                  name="allowImageUpload"
                  checked={optionForm.allowImageUpload}
                  onChange={handleOptionFormChange}
                />
                <span className="form-toggle__track" />
                <span className="form-toggle__label">
                  Dùng ảnh cho lựa chọn này (tắt để dùng mã màu)
                </span>
              </label>

              {optionForm.allowImageUpload ? (
                <div className="form-group">
                  <label className="form-label">Ảnh lựa chọn</label>
                  <div className="lcu-upload-wrap">
                    <div className="lcu-upload-preview">
                      <ImageWithFallback
                        src={optionPreviewSrc}
                        alt={optionForm.name || "Ảnh lựa chọn"}
                        fallback={
                          <div className="lcu-upload-preview__empty">
                            <FiImage size={18} />
                            <span>Chưa có ảnh</span>
                          </div>
                        }
                      />
                    </div>

                    <div className="lcu-upload-actions">
                      <input
                        ref={imageInputRef}
                        className="lcu-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={saveOptionMutation.isPending}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <FiUpload size={14} />
                        {pendingImageFile
                          ? " Chọn lại ảnh"
                          : optionForm.image
                            ? " Đổi ảnh"
                            : " Tải ảnh lên"}
                      </button>
                      {(pendingImageFile || optionForm.image) && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={saveOptionMutation.isPending}
                          onClick={clearImage}
                        >
                          <FiX size={14} /> Xóa ảnh
                        </button>
                      )}
                    </div>

                    <p className="form-hint">
                      Ảnh dưới 5MB, sẽ upload khi bấm lưu lựa chọn.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Mã màu</label>
                  <div className="lcu-color-input-wrap">
                    <span
                      className="lcu-color-swatch"
                      style={{
                        backgroundColor: optionForm.colorCode.startsWith("#")
                          ? optionForm.colorCode
                          : "#ffffff",
                      }}
                    />
                    <input
                      className="form-input font-mono"
                      type="color"
                      name="colorCode"
                      value={
                        optionForm.colorCode.startsWith("#")
                          ? optionForm.colorCode
                          : "#ffffff"
                      }
                      onChange={(e) =>
                        setOptionForm((prev) => ({
                          ...prev,
                          colorCode: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                    <input
                      className="form-input font-mono"
                      name="colorCode"
                      value={optionForm.colorCode}
                      onChange={(e) =>
                        setOptionForm((prev) => ({
                          ...prev,
                          colorCode: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="#FFFFFF"
                      maxLength={7}
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeOptionModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveOptionMutation.isPending}
                >
                  {saveOptionMutation.isPending
                    ? "Đang lưu..."
                    : "Lưu lựa chọn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Group */}
      {confirmDeleteGroup && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmDeleteGroup(null)}
        >
          <div
            className="modal-box modal-box--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">
                Xóa nhóm tùy chỉnh
              </h3>
              <button
                className="modal-close"
                onClick={() => setConfirmDeleteGroup(null)}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa nhóm{" "}
                  <strong>{confirmDeleteGroup.name}</strong>?
                  {confirmDeleteGroup.optionCount > 0 && (
                    <span className="text-danger d-block mt-2 font-medium">
                      Nhóm này đang có {confirmDeleteGroup.optionCount} lựa
                      chọn. Hãy xóa hết các lựa chọn bên trong trước khi xóa
                      nhóm.
                    </span>
                  )}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmDeleteGroup(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn-danger"
                  onClick={() =>
                    deleteGroupMutation.mutate(confirmDeleteGroup.id)
                  }
                  disabled={
                    deleteGroupMutation.isPending ||
                    confirmDeleteGroup.optionCount > 0
                  }
                >
                  <FiTrash2 size={14} /> Đi tới Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Option */}
      {confirmDeleteOption && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmDeleteOption(null)}
        >
          <div
            className="modal-box modal-box--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa lựa chọn</h3>
              <button
                className="modal-close"
                onClick={() => setConfirmDeleteOption(null)}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa lựa chọn{" "}
                  <strong>{confirmDeleteOption.name}</strong>? Hành động này
                  không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmDeleteOption(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn-danger"
                  onClick={() =>
                    deleteOptionMutation.mutate(confirmDeleteOption.id)
                  }
                  disabled={deleteOptionMutation.isPending}
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

export default BearCustomizationsTab;
