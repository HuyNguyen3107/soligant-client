import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiBox,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiGrid,
  FiImage,
  FiLayers,
  FiPlus,
  FiSave,
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
import { useAuthStore } from "../../../store/auth.store";
import { ImageWithFallback } from "../../../components/common";

interface UploadImageResponse {
  url?: string;
}

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
  colorCode: "",
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<BearCustomizationGroup | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<BearCustomizationGroup | null>(null);
  const [groupForm, setGroupForm] = useState<BearCustomizationGroupForm>(EMPTY_GROUP_FORM);

  const [optionModal, setOptionModal] = useState<"create" | "edit" | null>(null);
  const [editingOption, setEditingOption] = useState<BearCustomizationOption | null>(null);
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
    mutationFn: async (variables: { id?: string; payload: BearCustomizationGroupPayload }) => {
      if (variables.id) {
        return updateBearCustomizationGroup(variables.id, variables.payload);
      }
      return createBearCustomizationGroup(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success(variables.id ? "Đã cập nhật nhóm tùy chỉnh." : "Đã tạo nhóm tùy chỉnh.");
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

  const toggleGroupMutation = useMutation({
    mutationFn: async (group: BearCustomizationGroup) => {
      return updateBearCustomizationGroup(group.id, {
        name: group.name,
        helper: group.helper,
        isActive: !group.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể trạng thái chuyển nhóm."));
    },
  });

  const saveOptionMutation = useMutation({
    mutationFn: async (variables: { id?: string; payload: BearCustomizationOptionPayload }) => {
      if (variables.id) {
        return updateBearCustomizationOption(variables.id, variables.payload);
      }
      return createBearCustomizationOption(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      toast.success(variables.id ? "Đã cập nhật lựa chọn." : "Đã thêm lựa chọn.");
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

  const toggleOptionMutation = useMutation({
    mutationFn: async (option: BearCustomizationOption) => {
      return updateBearCustomizationOption(option.id, {
        groupId: option.groupId,
        name: option.name,
        description: option.description,
        price: option.price,
        stockQuantity: option.stockQuantity,
        lowStockThreshold: option.lowStockThreshold,
        allowImageUpload: option.allowImageUpload,
        image: option.image,
        colorCode: option.colorCode,
        isActive: !option.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đổi trạng thái lựa chọn."));
    },
  });

  // --- FILTERING ---
  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groups;

    return groups
      .map((group) => {
        const groupMatches =
          group.name.toLowerCase().includes(keyword) ||
          group.helper.toLowerCase().includes(keyword);

        const matchingOptions = group.options.filter(
          (opt) =>
            opt.name.toLowerCase().includes(keyword) ||
            opt.description.toLowerCase().includes(keyword),
        );

        if (groupMatches || matchingOptions.length > 0) {
          return {
            ...group,
            options: groupMatches ? group.options : matchingOptions,
            _isExpandedDueToSearch: true,
          };
        }
        return null;
      })
      .filter((g) => g !== null) as (BearCustomizationGroup & {
      _isExpandedDueToSearch?: boolean;
    })[];
  }, [groups, search]);

  useEffect(() => {
    if (search.trim()) {
      const allExpanded = filteredGroups.reduce(
        (acc, g) => {
          if (g._isExpandedDueToSearch) acc[g.id] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setExpandedGroups(allExpanded);
    }
  }, [search, filteredGroups]);

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

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
      colorCode: option.colorCode,
    });
    resetImageDraft();
    setOptionModal("edit");
  };

  const handleOptionFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setOptionForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setOptionForm((prev) => ({ ...prev, [name]: value }));
    }
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

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB.");
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

    if (
      !optionForm.allowImageUpload &&
      !optionForm.colorCode.trim() &&
      !optionForm.image.trim() &&
      !pendingImageFile
    ) {
      toast.error(
        "Vui lòng thiết lập Ảnh, hoặc Màu sắc, hoặc bật 'Cho phép khách tự tải ảnh lên'.",
      );
      return;
    }

    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (optionForm.colorCode.trim() && !colorRegex.test(optionForm.colorCode.trim())) {
      toast.error("Mã màu không hợp lệ. Vui lòng chọn màu từ bảng màu.");
      return;
    }

    let uploadedImageUrl: string | null = null;
    let finalImage = optionForm.image.trim();
    let finalColorCode = optionForm.colorCode.trim().toUpperCase();

    if (optionForm.allowImageUpload) {
      finalImage = "";
      finalColorCode = "";
    } else {
      try {
        if (pendingImageFile && !optionForm.allowImageUpload) {
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
          finalColorCode = "";
        } else if (finalColorCode) {
          finalImage = "";
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Lỗi khi xử lý hình ảnh sản phẩm."));
        return;
      }
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
            Tạo các nhóm tùy chọn. Bên trong mỗi nhóm chứa các lựa chọn con 
            (VD: Phụ kiện cầm tay, Nơ cổ, Ảnh tải lên).
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
            <FiGrid size={16} />
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
        <div className="lf-groups-list">
          {filteredGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.id];

            return (
              <div key={group.id} className="lf-group-card">
                <div
                  className="lf-group-header"
                  onClick={() => toggleGroupExpand(group.id)}
                >
                  <div className="lf-group-header__title">
                    <h4>{group.name}</h4>
                    {group.helper && <span>{group.helper}</span>}
                  </div>

                  <div
                    className="lf-group-header__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="lf-badge">
                      {group.optionCount} lựa chọn
                    </span>
                    <button
                      className={`status-badge ${
                        group.isActive
                          ? "status-badge--active"
                          : "status-badge--inactive"
                      }`}
                      onClick={() =>
                        canEdit
                          ? toggleGroupMutation.mutate(group)
                          : toast.error("Bạn không có quyền sửa nhóm.")
                      }
                      title="Bật/Tắt nhóm"
                    >
                      {group.isActive ? "Đang mở" : "Đang ẩn"}
                    </button>
                    {canEdit && (
                      <button
                        className="btn-icon"
                        onClick={() => openEditGroup(group)}
                        title="Sửa nhóm"
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
                    <button
                      className="btn-icon"
                      onClick={() => toggleGroupExpand(group.id)}
                    >
                      {isExpanded ? (
                        <FiChevronUp size={16} />
                      ) : (
                        <FiChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="lf-group-body">
                    <div className="lf-group-body__toolbar">
                      <h5>Các lựa chọn</h5>
                      {canCreate && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => openCreateOption(group.id)}
                        >
                          <FiPlus size={14} /> Thêm lựa chọn
                        </button>
                      )}
                    </div>

                    {group.options.length === 0 ? (
                      <div className="tab-empty tab-empty--sm">
                        <p>Chưa có lựa chọn nào trong nhóm này.</p>
                      </div>
                    ) : (
                      <div className="tab-table-wrap">
                        <table className="tab-table">
                          <thead>
                            <tr>
                              <th>Hiển thị</th>
                              <th>Tên lựa chọn</th>
                              <th>Giá thu thêm</th>
                              <th>Tồn kho</th>
                              <th>Trạng thái</th>
                              <th>Cập nhật</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.options.map((option) => (
                              <tr
                                key={option.id}
                                className={option.isActive ? "" : "row--inactive"}
                              >
                                <td>
                                  {option.allowImageUpload ? (
                                    <div className="lf-visual-cell lf-visual-cell--upload">
                                      <FiUpload size={14} />
                                      <span>Khách tải lên</span>
                                    </div>
                                  ) : option.colorCode ? (
                                    <div className="lf-visual-cell">
                                      <span
                                        className="lf-color-swatch"
                                        style={{
                                          backgroundColor: option.colorCode,
                                        }}
                                        title={option.colorCode}
                                      />
                                    </div>
                                  ) : (
                                    <div className="lf-visual-cell">
                                      <div className="lf-thumb lf-thumb--sm">
                                        <ImageWithFallback
                                          src={getStaticAssetUrl(option.image)}
                                          alt={option.name}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="lf-name-cell">
                                    <p className="lf-name-cell__title">
                                      {option.name}
                                    </p>
                                    {option.description && (
                                      <p className="lf-name-cell__desc">
                                        {option.description}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="lf-price-cell">
                                  {option.price > 0
                                    ? `+ ${formatCurrency(option.price)}`
                                    : "Miễn phí"}
                                </td>
                                <td>
                                  <span
                                    className={`lf-stock${
                                      option.stockQuantity <= option.lowStockThreshold
                                        ? " low"
                                        : ""
                                    }${option.stockQuantity === 0 ? " is-out" : ""}`}
                                    title={`Ngưỡng cảnh báo: ${option.lowStockThreshold}`}
                                  >
                                    {option.stockQuantity}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className={`status-badge ${
                                      option.isActive
                                        ? "status-badge--active"
                                        : "status-badge--inactive"
                                    }`}
                                    onClick={() =>
                                      canEdit
                                        ? toggleOptionMutation.mutate(option)
                                        : toast.error("Bạn không có quyền sửa lựa chọn.")
                                    }
                                  >
                                    {option.isActive ? "Bật" : "Tắt"}
                                  </button>
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
                                        title="Chỉnh sửa"
                                      >
                                        <FiEdit2 size={14} />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        className="btn-icon btn-del"
                                        onClick={() => setConfirmDeleteOption(option)}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Nhóm */}
      {groupModal && (
        <div className="modal-overlay" onClick={closeGroupModal}>
          <div
            className="modal-box modal-box--md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {groupModal === "create" ? "Thêm nhóm tùy chỉnh mới" : "Sửa nhóm tùy chỉnh"}
              </h3>
              <button className="modal-close" onClick={closeGroupModal}>
                <FiX size={16} />
              </button>
            </div>
            <form className="modal-body" onSubmit={handleSaveGroup}>
              <div className="form-group">
                <label className="form-label">
                  Tên nhóm <span className="form-required">*</span>
                </label>
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
                <label className="form-label">Gợi ý cho khách hàng</label>
                <input
                  className="form-input"
                  name="helper"
                  value={groupForm.helper}
                  onChange={handleGroupFormChange}
                  placeholder="VD: Chọn 1 loại phụ kiện ưng ý..."
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
                  (Nhóm: {groups.find((g) => g.id === optionForm.groupId)?.name})
                </span>
              </h3>
              <button className="modal-close" onClick={closeOptionModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveOption}>
              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Tên lựa chọn <span className="form-required">*</span>
                  </label>
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
                  <label className="form-label">
                    Giá thu thêm (VND) <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    step={1000}
                    name="price"
                    value={optionForm.price}
                    onChange={handleOptionFormChange}
                  />
                  <p className="form-hint">Để 0 nếu miễn phí.</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả thêm</label>
                <textarea
                  className="form-input"
                  name="description"
                  rows={2}
                  value={optionForm.description}
                  onChange={handleOptionFormChange}
                  placeholder="VD: Kích thước 3x3cm..."
                />
              </div>

              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Tồn kho <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    name="stockQuantity"
                    value={optionForm.stockQuantity}
                    onChange={handleOptionFormChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Mức cảnh báo sắp hết <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    name="lowStockThreshold"
                    value={optionForm.lowStockThreshold}
                    onChange={handleOptionFormChange}
                  />
                </div>
              </div>

              <div className="form-group lf-visual-config">
                <div className="lf-visual-config__header">
                  <label className="form-label mb-0">Thiết lập hiển thị</label>
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      name="allowImageUpload"
                      checked={optionForm.allowImageUpload}
                      onChange={handleOptionFormChange}
                    />
                    <span className="form-toggle__track" />
                    <span className="form-toggle__label">
                      Cho phép khách tải ảnh lên thay vì chọn mẫu
                    </span>
                  </label>
                </div>

                {!optionForm.allowImageUpload && (
                  <div className="lf-visual-config__body">
                    <div className="lf-visual-section">
                      <label className="form-label">Cách 1: Chọn màu sắc (Mã HEX)</label>
                      <div className="lf-color-picker-wrap">
                        <input
                          type="color"
                          className="lf-color-input"
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
                          placeholder="#FF0000"
                          maxLength={7}
                        />
                        {optionForm.colorCode && (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() =>
                              setOptionForm((prev) => ({ ...prev, colorCode: "" }))
                            }
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <p className="form-hint">Ưu tiên hiển thị bảng màu nếu có mã màu.</p>
                    </div>

                    <div className="lf-visual-section--divider">HOẶC</div>

                    <div className="lf-visual-section">
                      <label className="form-label">Cách 2: Tải ảnh minh họa</label>
                      <div className="lf-image-field">
                        <div className="lf-image-preview lf-image-preview--sm">
                          <ImageWithFallback
                            src={optionPreviewSrc}
                            alt="Preview"
                            fallback={
                              <div className="lf-image-preview__empty">
                                <FiImage size={16} />
                                <span>Chưa có</span>
                              </div>
                            }
                          />
                        </div>
                        <div className="lf-image-actions">
                          <input
                            ref={imageInputRef}
                            className="lf-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                          />
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <FiUpload size={14} /> Chọn ảnh
                          </button>
                          {(pendingImageFile || optionForm.image) && (
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={clearImage}
                            >
                              <FiX size={14} /> Xóa ảnh
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                  {saveOptionMutation.isPending ? "Đang lưu..." : "Lưu lựa chọn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Group */}
      {confirmDeleteGroup && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteGroup(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa nhóm tùy chỉnh</h3>
              <button className="modal-close" onClick={() => setConfirmDeleteGroup(null)}>
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa nhóm <strong>{confirmDeleteGroup.name}</strong>?
                  {confirmDeleteGroup.optionCount > 0 && (
                    <span className="text-danger d-block mt-2 font-medium">
                      Nhóm này đang có {confirmDeleteGroup.optionCount} lựa chọn. Hãy xóa
                      hết các lựa chọn bên trong trước khi xóa nhóm.
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
                  onClick={() => deleteGroupMutation.mutate(confirmDeleteGroup.id)}
                  disabled={
                    deleteGroupMutation.isPending || confirmDeleteGroup.optionCount > 0
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
        <div className="modal-overlay" onClick={() => setConfirmDeleteOption(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa lựa chọn</h3>
              <button className="modal-close" onClick={() => setConfirmDeleteOption(null)}>
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa lựa chọn <strong>{confirmDeleteOption.name}</strong>?
                  Hành động này không thể hoàn tác.
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
                  onClick={() => deleteOptionMutation.mutate(confirmDeleteOption.id)}
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
