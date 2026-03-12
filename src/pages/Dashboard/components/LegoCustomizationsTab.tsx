import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiEdit2,
  FiImage,
  FiLayers,
  FiPackage,
  FiPlus,
  FiSave,
  FiSliders,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl, http } from "../../../lib/http";
import { hasPermission } from "../../../lib/permissions";
import {
  createLegoCustomizationGroup,
  createLegoCustomizationOption,
  deleteLegoCustomizationGroup,
  deleteLegoCustomizationOption,
  getLegoCustomizationGroups,
  type LegoCustomizationGroupPayload,
  type LegoCustomizationOptionPayload,
  updateLegoCustomizationGroup,
  updateLegoCustomizationOption,
} from "../../../services/lego-customizations.service";
import { useAuthStore } from "../../../store/auth.store";
import type {
  LegoCustomizationGroup,
  LegoCustomizationGroupForm,
  LegoCustomizationOption,
  LegoCustomizationOptionForm,
} from "../types";

interface UploadImageResponse {
  url?: string;
}

const DEFAULT_COLOR_CODE = "#D1D5DB";

const EMPTY_GROUP_FORM: LegoCustomizationGroupForm = {
  name: "",
  helper: "",
};

const EMPTY_OPTION_FORM: LegoCustomizationOptionForm = {
  groupId: "",
  name: "",
  description: "",
  price: "",
  allowImageUpload: false,
  image: "",
  colorCode: DEFAULT_COLOR_CODE,
};

const formatCurrency = (value: number) => {
  if (value <= 0) {
    return "Miễn phí";
  }
  return `${value.toLocaleString("vi-VN")} đ`;
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

const normalizeColorCode = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const pureHex = normalized.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(pureHex)) {
    return "";
  }

  return `#${pureHex.toUpperCase()}`;
};

const resolveDisplayColor = (value: string) => normalizeColorCode(value) || DEFAULT_COLOR_CODE;

const deleteUploadedImageByUrl = async (url: string) => {
  const match = url.match(/\/uploads\/([^/?#]+)$/);
  if (!match) return;

  try {
    await http.delete(`/upload/image/${match[1]}`);
  } catch {
    // Ignore cleanup errors for temporary upload files.
  }
};

const LegoCustomizationsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canCreate = hasPermission(currentUser, "lego-customizations.create");
  const canEdit = hasPermission(currentUser, "lego-customizations.edit");
  const canDelete = hasPermission(currentUser, "lego-customizations.delete");

  const [search, setSearch] = useState("");
  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [optionModal, setOptionModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<LegoCustomizationGroup | null>(null);
  const [editingOption, setEditingOption] = useState<LegoCustomizationOption | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<LegoCustomizationGroup | null>(null);
  const [deletingOption, setDeletingOption] = useState<LegoCustomizationOption | null>(null);
  const [groupForm, setGroupForm] = useState<LegoCustomizationGroupForm>(
    EMPTY_GROUP_FORM,
  );
  const [optionForm, setOptionForm] = useState<LegoCustomizationOptionForm>(
    EMPTY_OPTION_FORM,
  );
  const [pendingOptionImageFile, setPendingOptionImageFile] = useState<File | null>(null);
  const [optionImagePreview, setOptionImagePreview] = useState<string | null>(null);

  const optionImageInputRef = useRef<HTMLInputElement>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["lego-customizations"],
    queryFn: getLegoCustomizationGroups,
  });

  useEffect(() => {
    return () => {
      if (optionImagePreview) {
        URL.revokeObjectURL(optionImagePreview);
      }
    };
  }, [optionImagePreview]);

  const clearOptionImagePreview = () => {
    setOptionImagePreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const resetOptionImageDraft = () => {
    clearOptionImagePreview();
    setPendingOptionImageFile(null);
    if (optionImageInputRef.current) {
      optionImageInputRef.current.value = "";
    }
  };

  const invalidateCustomizationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["lego-customizations"] });
    queryClient.invalidateQueries({ queryKey: ["public-lego-customizations"] });
  };

  const saveGroupMutation = useMutation({
    mutationFn: async (variables: { id?: string; payload: LegoCustomizationGroupPayload }) => {
      if (variables.id) {
        return updateLegoCustomizationGroup(variables.id, variables.payload);
      }

      return createLegoCustomizationGroup(variables.payload);
    },
    onSuccess: (_data, variables) => {
      invalidateCustomizationQueries();
      toast.success(
        variables.id ? "Đã cập nhật nhóm tùy chỉnh Lego." : "Đã tạo nhóm tùy chỉnh Lego mới.",
      );
      closeGroupModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu nhóm tùy chỉnh Lego."));
    },
  });

  const saveOptionMutation = useMutation({
    mutationFn: async (variables: { id?: string; payload: LegoCustomizationOptionPayload }) => {
      if (variables.id) {
        return updateLegoCustomizationOption(variables.id, variables.payload);
      }

      return createLegoCustomizationOption(variables.payload);
    },
    onSuccess: (_data, variables) => {
      invalidateCustomizationQueries();
      toast.success(
        variables.id
          ? "Đã cập nhật lựa chọn tùy chỉnh Lego."
          : "Đã tạo lựa chọn tùy chỉnh Lego mới.",
      );
      closeOptionModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu lựa chọn tùy chỉnh Lego."));
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteLegoCustomizationGroup,
    onSuccess: () => {
      invalidateCustomizationQueries();
      toast.success("Đã xóa nhóm tùy chỉnh Lego và các lựa chọn liên quan.");
      setDeletingGroup(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa nhóm tùy chỉnh Lego."));
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: deleteLegoCustomizationOption,
    onSuccess: () => {
      invalidateCustomizationQueries();
      toast.success("Đã xóa lựa chọn tùy chỉnh Lego.");
      setDeletingOption(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa lựa chọn tùy chỉnh Lego."));
    },
  });

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groups;

    return groups.filter((group) => {
      const matchGroup =
        group.name.toLowerCase().includes(keyword) ||
        group.helper.toLowerCase().includes(keyword);
      const matchOption = group.options.some(
        (option) =>
          option.name.toLowerCase().includes(keyword) ||
          option.description.toLowerCase().includes(keyword),
      );

      return matchGroup || matchOption;
    });
  }, [groups, search]);

  const totalOptions = useMemo(
    () => groups.reduce((sum, group) => sum + group.options.length, 0),
    [groups],
  );

  const groupsWithImageOptions = useMemo(
    () => groups.filter((group) => group.options.some((option) => option.allowImageUpload)).length,
    [groups],
  );

  const optionsWithImageMode = useMemo(
    () =>
      groups.reduce(
        (sum, group) => sum + group.options.filter((option) => option.allowImageUpload).length,
        0,
      ),
    [groups],
  );

  const closeGroupModal = () => {
    setGroupModal(null);
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP_FORM);
  };

  const closeOptionModal = () => {
    setOptionModal(null);
    setEditingOption(null);
    setOptionForm(EMPTY_OPTION_FORM);
    resetOptionImageDraft();
  };

  const openCreateGroup = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo nhóm tùy chỉnh Lego.");
      return;
    }

    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP_FORM);
    setGroupModal("create");
  };

  const openEditGroup = (group: LegoCustomizationGroup) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa nhóm tùy chỉnh Lego.");
      return;
    }

    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      helper: group.helper,
    });
    setGroupModal("edit");
  };

  const openCreateOption = (groupId?: string) => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo lựa chọn tùy chỉnh Lego.");
      return;
    }

    if (groups.length === 0) {
      toast.error("Hãy tạo ít nhất một nhóm tùy chỉnh trước.");
      return;
    }

    setEditingOption(null);
    setOptionForm({
      ...EMPTY_OPTION_FORM,
      groupId: groupId ?? groups[0]?.id ?? "",
    });
    resetOptionImageDraft();
    setOptionModal("create");
  };

  const openEditOption = (option: LegoCustomizationOption) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa lựa chọn tùy chỉnh Lego.");
      return;
    }

    setEditingOption(option);
    setOptionForm({
      groupId: option.groupId,
      name: option.name,
      description: option.description,
      price: option.price > 0 ? String(option.price) : "",
      allowImageUpload: option.allowImageUpload,
      image: option.allowImageUpload ? option.image : "",
      colorCode: option.allowImageUpload
        ? DEFAULT_COLOR_CODE
        : resolveDisplayColor(option.colorCode),
    });
    resetOptionImageDraft();
    setOptionModal("edit");
  };

  const handleGroupFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setGroupForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOptionFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;

    if (name === "allowImageUpload") {
      const allowImageUpload = checked;
      if (!allowImageUpload) {
        resetOptionImageDraft();
      }

      setOptionForm((prev) => ({
        ...prev,
        allowImageUpload,
        image: allowImageUpload ? prev.image : "",
        colorCode: resolveDisplayColor(prev.colorCode),
      }));
      return;
    }

    setOptionForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleOptionImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const resetInput = () => {
      if (optionImageInputRef.current) {
        optionImageInputRef.current.value = "";
      }
    };

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận tệp ảnh.");
      resetInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
      resetInput();
      return;
    }

    clearOptionImagePreview();
    setOptionImagePreview(URL.createObjectURL(file));
    setPendingOptionImageFile(file);
    resetInput();
  };

  const clearOptionImage = () => {
    resetOptionImageDraft();
    setOptionForm((prev) => ({ ...prev, image: "" }));
  };

  const handleSaveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (groupModal === "create" && !canCreate) {
      toast.error("Bạn không có quyền tạo nhóm tùy chỉnh Lego.");
      return;
    }

    if (groupModal === "edit" && !canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa nhóm tùy chỉnh Lego.");
      return;
    }

    const name = normalizeText(groupForm.name);
    const helper = normalizeText(groupForm.helper);

    if (!name) {
      toast.error("Tên nhóm không được để trống.");
      return;
    }

    const duplicate = groups.find(
      (group) =>
        group.id !== editingGroup?.id && group.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      toast.error("Tên nhóm tùy chỉnh đã tồn tại.");
      return;
    }

    await saveGroupMutation.mutateAsync({
      id: editingGroup?.id,
      payload: {
        name,
        helper,
      },
    });
  };

  const handleSaveOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (optionModal === "create" && !canCreate) {
      toast.error("Bạn không có quyền tạo lựa chọn tùy chỉnh Lego.");
      return;
    }

    if (optionModal === "edit" && !canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa lựa chọn tùy chỉnh Lego.");
      return;
    }

    const groupId = optionForm.groupId;
    const name = normalizeText(optionForm.name);
    const description = normalizeText(optionForm.description);
    const normalizedColorCode = normalizeColorCode(optionForm.colorCode);
    const allowImageUpload = optionForm.allowImageUpload;
    const trimmedPrice = optionForm.price.trim();
    const price = trimmedPrice === "" ? 0 : Number(trimmedPrice);

    if (!groupId) {
      toast.error("Vui lòng chọn nhóm tùy chỉnh.");
      return;
    }

    if (!groups.some((group) => group.id === groupId)) {
      toast.error("Nhóm tùy chỉnh đã chọn không còn tồn tại.");
      return;
    }

    if (!name) {
      toast.error("Tên lựa chọn không được để trống.");
      return;
    }

    if (!Number.isInteger(price) || price < 0) {
      toast.error("Giá phải là số nguyên từ 0 trở lên.");
      return;
    }

    if (!allowImageUpload && !normalizedColorCode) {
      toast.error("Vui lòng nhập mã màu hợp lệ dạng hex, ví dụ #FF0000.");
      return;
    }

    if (allowImageUpload && !optionForm.image.trim() && !pendingOptionImageFile) {
      toast.error("Bạn đã bật upload ảnh, vui lòng tải lên ảnh cho lựa chọn này.");
      return;
    }

    const duplicate = groups
      .find((group) => group.id === groupId)
      ?.options.find(
        (option) =>
          option.id !== editingOption?.id &&
          option.name.toLowerCase() === name.toLowerCase(),
      );

    if (duplicate) {
      toast.error("Lựa chọn này đã tồn tại trong nhóm đã chọn.");
      return;
    }

    let uploadedImageUrl: string | null = null;
    let saveAttempted = false;

    try {
      let image = optionForm.image.trim();

      if (allowImageUpload && pendingOptionImageFile) {
        const formData = new FormData();
        formData.append("file", pendingOptionImageFile);

        const { data } = await http.post<UploadImageResponse>("/upload/image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        image = typeof data?.url === "string" ? data.url.trim() : "";
        uploadedImageUrl = image || null;

        if (!image) {
          throw new Error("Tải ảnh lên thất bại.");
        }
      }

      saveAttempted = true;

      await saveOptionMutation.mutateAsync({
        id: editingOption?.id,
        payload: {
          groupId,
          name,
          description,
          price,
          allowImageUpload,
          image: allowImageUpload ? image : "",
          colorCode: allowImageUpload ? "" : normalizedColorCode,
        },
      });
    } catch (error) {
      if (uploadedImageUrl) {
        await deleteUploadedImageByUrl(uploadedImageUrl);
      }

      if (!saveAttempted) {
        toast.error(getErrorMessage(error, "Không thể tải ảnh lên."));
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    if (!canDelete) {
      toast.error("Bạn không có quyền xóa nhóm tùy chỉnh Lego.");
      return;
    }

    await deleteGroupMutation.mutateAsync(deletingGroup.id);
  };

  const handleDeleteOption = async () => {
    if (!deletingOption) return;

    if (!canDelete) {
      toast.error("Bạn không có quyền xóa lựa chọn tùy chỉnh Lego.");
      return;
    }

    await deleteOptionMutation.mutateAsync(deletingOption.id);
  };

  const optionModalPreviewSrc = optionImagePreview ?? getStaticAssetUrl(optionForm.image);

  return (
    <div className="tab-panel lcu-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Tùy chỉnh Lego</h2>
          <p className="tab-subtitle">
            Quản lý các nhóm như áo, quần, tóc, phụ kiện và từng lựa chọn cụ thể
            để hiển thị qua API public ở trang customizer.
          </p>
        </div>

        <div className="lcu-header-actions">
          {canCreate && (
            <button className="btn-secondary" onClick={() => openCreateOption()}>
              <FiPlus size={15} /> Thêm lựa chọn
            </button>
          )}
          {canCreate && (
            <button className="btn-primary" onClick={openCreateGroup}>
              <FiSliders size={15} /> Tạo nhóm
            </button>
          )}
        </div>
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiLayers size={15} />
          </span>
          <div>
            <strong>{groups.length}</strong>
            <span>Tổng nhóm tùy chỉnh</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiSliders size={15} />
          </span>
          <div>
            <strong>{groupsWithImageOptions}</strong>
            <span>Nhóm có lựa chọn ảnh</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiPackage size={15} />
          </span>
          <div>
            <strong>{totalOptions}</strong>
            <span>Lựa chọn đã tạo</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiPackage size={15} />
          </span>
          <div>
            <strong>{optionsWithImageMode}</strong>
            <span>Lựa chọn dùng ảnh</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên nhóm, mô tả hoặc lựa chọn..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

      {filteredGroups.length === 0 ? (
        <div className="tab-empty">
          <FiSliders size={40} className="tab-empty-icon" />
          <p>
            {groups.length === 0
              ? "Chưa có nhóm tùy chỉnh nào. Hãy tạo nhóm đầu tiên để cấp dữ liệu cho trang customizer."
              : "Không tìm thấy nhóm hoặc lựa chọn phù hợp."}
          </p>
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

                  <p className="lcu-group-card__helper">
                    {group.helper || "Chưa có mô tả hướng dẫn cho nhóm này."}
                  </p>

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
                      onClick={() => setDeletingGroup(group)}
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
                    Chưa có lựa chọn nào trong nhóm này. Tạo các mục như Áo đỏ, Áo xanh,
                    Quần jean... để khách hàng có thể chọn ở trang customizer.
                  </div>
                ) : (
                  <div className="tab-table-wrap">
                    <table className="tab-table">
                      <thead>
                        <tr>
                          <th>Lựa chọn</th>
                          <th>Hiển thị</th>
                          <th>Giá</th>
                          <th>Cập nhật</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.options.map((option) => {
                          const optionImageUrl = getStaticAssetUrl(option.image);

                          return (
                            <tr key={option.id}>
                              <td>
                                <div className="lcu-option-name">
                                  <strong>{option.name}</strong>
                                  <span>
                                    {option.description || "Chưa có mô tả cho lựa chọn này."}
                                  </span>
                                </div>
                              </td>
                              <td>
                                {option.allowImageUpload ? (
                                  <div className="lcu-option-visual lcu-option-visual--image">
                                    {optionImageUrl ? (
                                      <img src={optionImageUrl} alt={option.name} />
                                    ) : (
                                      <span>Chưa có ảnh</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="lcu-option-visual lcu-option-visual--color">
                                    <span
                                      className="lcu-color-swatch"
                                      style={{
                                        backgroundColor: resolveDisplayColor(option.colorCode),
                                      }}
                                    />
                                    <span className="lcu-color-code">
                                      {resolveDisplayColor(option.colorCode)}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="lcu-price">{formatCurrency(option.price)}</td>
                              <td className="text-muted">{formatDateTime(option.updatedAt)}</td>
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
                                      onClick={() => setDeletingOption(option)}
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

      <p className="lc-summary">
        Hiển thị {filteredGroups.length}/{groups.length} nhóm, tổng {totalOptions} lựa chọn
      </p>

      {groupModal && (
        <div className="modal-overlay" onClick={closeGroupModal}>
          <div className="modal-box modal-box--lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {groupModal === "create" ? "Tạo nhóm tùy chỉnh" : "Chỉnh sửa nhóm tùy chỉnh"}
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
                  placeholder="VD: Áo"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả hướng dẫn</label>
                <textarea
                  className="form-input form-textarea"
                  name="helper"
                  rows={4}
                  value={groupForm.helper}
                  onChange={handleGroupFormChange}
                  placeholder="Giải thích ngắn cho khách hàng biết nhóm này dùng để chọn gì."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeGroupModal}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={saveGroupMutation.isPending}>
                  {saveGroupMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> Lưu nhóm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {optionModal && (
        <div className="modal-overlay" onClick={closeOptionModal}>
          <div className="modal-box modal-box--lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {optionModal === "create"
                  ? "Tạo lựa chọn tùy chỉnh"
                  : "Chỉnh sửa lựa chọn tùy chỉnh"}
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
                  placeholder="VD: Áo đỏ"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input form-textarea"
                  name="description"
                  rows={4}
                  value={optionForm.description}
                  onChange={handleOptionFormChange}
                  placeholder="Mô tả ngắn giúp khách hàng phân biệt lựa chọn này."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá</label>
                <input
                  className="form-input"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  value={optionForm.price}
                  onChange={handleOptionFormChange}
                  placeholder="Để trống sẽ là miễn phí"
                />
                <p className="form-hint">Để trống hoặc nhập 0 nếu bạn muốn lựa chọn này miễn phí.</p>
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
                      {optionModalPreviewSrc ? (
                        <img src={optionModalPreviewSrc} alt={optionForm.name || "Ảnh lựa chọn"} />
                      ) : (
                        <div className="lcu-upload-preview__empty">
                          <FiImage size={18} />
                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                    </div>

                    <div className="lcu-upload-actions">
                      <input
                        ref={optionImageInputRef}
                        className="lcu-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleOptionImageSelect}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={saveOptionMutation.isPending}
                        onClick={() => optionImageInputRef.current?.click()}
                      >
                        <FiUpload size={14} />
                        {pendingOptionImageFile
                          ? " Chọn lại ảnh"
                          : optionForm.image
                            ? " Đổi ảnh"
                            : " Tải ảnh lên"}
                      </button>
                      {(pendingOptionImageFile || optionForm.image) && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={saveOptionMutation.isPending}
                          onClick={clearOptionImage}
                        >
                          <FiX size={14} /> Xóa ảnh
                        </button>
                      )}
                    </div>

                    <p className="form-hint">Ảnh dưới 5MB, sẽ upload khi bấm lưu lựa chọn.</p>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Mã màu</label>
                  <div className="lcu-color-input-wrap">
                    <span
                      className="lcu-color-swatch"
                      style={{ backgroundColor: resolveDisplayColor(optionForm.colorCode) }}
                    />
                    <input
                      className="form-input"
                      name="colorCode"
                      value={optionForm.colorCode}
                      onChange={handleOptionFormChange}
                      placeholder="#FF0000"
                    />
                  </div>
                  <p className="form-hint">Nhập mã hex, ví dụ #FF0000 hoặc FF0000.</p>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeOptionModal}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={saveOptionMutation.isPending}>
                  {saveOptionMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> Lưu lựa chọn
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingGroup && (
        <div className="modal-overlay" onClick={() => setDeletingGroup(null)}>
          <div className="modal-box modal-box--sm" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa nhóm tùy chỉnh</h3>
              <button className="modal-close" onClick={() => setDeletingGroup(null)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="danger-box">
                <FiAlertTriangle size={16} />
                <div>
                  <strong>Bạn chắc chắn muốn xóa nhóm này?</strong>
                  <p>
                    Nhóm <strong>{deletingGroup.name}</strong> sẽ bị xóa cùng toàn bộ <strong>{deletingGroup.optionCount}</strong> lựa chọn bên trong.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeletingGroup(null)}>
                Hủy
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteGroup}
                disabled={deleteGroupMutation.isPending}
              >
                {deleteGroupMutation.isPending ? (
                  <>
                    <span className="btn-spinner" /> Đang xóa...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={14} /> Xóa nhóm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingOption && (
        <div className="modal-overlay" onClick={() => setDeletingOption(null)}>
          <div className="modal-box modal-box--sm" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa lựa chọn tùy chỉnh</h3>
              <button className="modal-close" onClick={() => setDeletingOption(null)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="danger-box">
                <FiAlertTriangle size={16} />
                <div>
                  <strong>Bạn chắc chắn muốn xóa lựa chọn này?</strong>
                  <p>
                    Mục <strong>{deletingOption.name}</strong> sẽ bị xóa khỏi nhóm hiện tại và
                    không còn xuất hiện ở API public.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeletingOption(null)}>
                Hủy
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteOption}
                disabled={deleteOptionMutation.isPending}
              >
                {deleteOptionMutation.isPending ? (
                  <>
                    <span className="btn-spinner" /> Đang xóa...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={14} /> Xóa lựa chọn
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

export default LegoCustomizationsTab;
