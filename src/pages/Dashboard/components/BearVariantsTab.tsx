import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiBox,
  FiEdit2,
  FiImage,
  FiPackage,
  FiPlus,
  FiSave,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { ImageWithFallback } from "../../../components/common";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl, http } from "../../../lib/http";
import {
  normalizeRichTextForStorage,
  toRichTextPlainText,
} from "../../../lib/rich-text";
import {
  createBearVariant,
  deleteBearVariant,
  getBearVariants,
  type BearVariantPayload,
  updateBearVariant,
} from "../../../services/bear-variants.service";
import { getProductCategories } from "../../../services/product-categories.service";
import type { BearVariant, BearVariantForm } from "../types";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import { RichTextContent, RichTextEditor } from "../../../components/common";

interface CollectionOption {
  _id: string;
  name: string;
  isActive: boolean;
}

interface UploadImageResponse {
  url?: string;
}

const BEAR_PRODUCT_NAME = "Sản phẩm Gấu";

const EMPTY_FORM: BearVariantForm = {
  collectionId: "",
  categoryId: "",
  name: "",
  variantSymbol: "",
  description: "",
  image: "",
  price: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
  isActive: true,
};

const getCollectionOptions = async () => {
  const { data } = await http.get<CollectionOption[]>("/collections");
  return data;
};

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
    // Bỏ qua lỗi dọn ảnh tạm
  }
};

const BearVariantsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingVariant, setEditingVariant] = useState<BearVariant | null>(null);
  const [confirmDeleteVariant, setConfirmDeleteVariant] =
    useState<BearVariant | null>(null);
  const [form, setForm] = useState<BearVariantForm>(EMPTY_FORM);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const canCreateVariant = hasPermission(currentUser, "bear-variants.create");
  const canEditVariant = hasPermission(currentUser, "bear-variants.edit");
  const canDeleteVariant = hasPermission(currentUser, "bear-variants.delete");

  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: collections = [], error: collectionsError } = useQuery({
    queryKey: ["bear-variant-collections-options"],
    queryFn: getCollectionOptions,
  });

  const { data: productCategories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: getProductCategories,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["bear-variants"],
    queryFn: getBearVariants,
  });

  const collectionsById = useMemo(
    () => new Map(collections.map((collection) => [collection._id, collection])),
    [collections],
  );
  const categoriesById = useMemo(
    () => new Map(productCategories.map((category) => [category.id, category])),
    [productCategories],
  );

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

  const closeModal = useCallback(() => {
    setModal(null);
    setEditingVariant(null);
    setForm(EMPTY_FORM);
    resetImageDraft();
  }, [resetImageDraft]);

  const saveMutation = useMutation({
    mutationFn: async (variables: {
      id?: string;
      payload: BearVariantPayload;
    }) => {
      if (variables.id) {
        return updateBearVariant(variables.id, variables.payload);
      }

      return createBearVariant(variables.payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bear-variants"] });
      toast.success(
        variables.id
          ? "Đã cập nhật biến thể gấu."
          : "Đã thêm biến thể gấu mới.",
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu biến thể."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBearVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-variants"] });
      toast.success("Đã xóa biến thể gấu.");
      setConfirmDeleteVariant(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa biến thể."));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (variant: BearVariant) => {
      return updateBearVariant(variant.id, {
        collectionId: variant.collectionId,
        categoryId: variant.categoryId,
        name: variant.name,
        variantSymbol: variant.variantSymbol,
        description: variant.description,
        image: variant.image,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
        lowStockThreshold: variant.lowStockThreshold,
        isActive: !variant.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bear-variants"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể thay đổi trạng thái biến thể."));
    },
  });

  const resolveCollectionName = useCallback(
    (variant: BearVariant) => {
      return (
        collectionsById.get(variant.collectionId)?.name ||
        variant.collectionName ||
        "Chưa chọn bộ sưu tập"
      );
    },
    [collectionsById],
  );

  const resolveCategoryName = useCallback(
    (variant: BearVariant) => {
      return (
        categoriesById.get(variant.categoryId)?.name ||
        variant.categoryName ||
        "Danh mục không còn tồn tại"
      );
    },
    [categoriesById],
  );

  const filteredVariants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return variants.filter((variant) => {
      const byKeyword =
        !keyword ||
        variant.name.toLowerCase().includes(keyword) ||
        variant.variantSymbol.toLowerCase().includes(keyword) ||
        toRichTextPlainText(variant.description).toLowerCase().includes(keyword) ||
        resolveCollectionName(variant).toLowerCase().includes(keyword) ||
        resolveCategoryName(variant).toLowerCase().includes(keyword);
      const byStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && variant.isActive) ||
        (statusFilter === "inactive" && !variant.isActive);

      return byKeyword && byStatus;
    });
  }, [
    resolveCategoryName,
    resolveCollectionName,
    search,
    variants,
    statusFilter,
  ]);

  const activeCount = variants.filter((variant) => variant.isActive).length;

  const openCreate = () => {
    if (!canCreateVariant) {
      toast.error("Bạn không có quyền tạo biến thể gấu.");
      return;
    }

    if (collections.length === 0) {
      toast.error("Vui lòng tạo ít nhất một bộ sưu tập trước khi thêm biến thể.");
      return;
    }

    if (productCategories.length === 0) {
      toast.error("Vui lòng tạo ít nhất một danh mục sản phẩm trước khi thêm biến thể.");
      return;
    }

    setEditingVariant(null);
    setForm({
      collectionId: collections[0]?._id ?? "",
      categoryId: productCategories[0]?.id ?? "",
      name: "",
      variantSymbol: "",
      description: "",
      image: "",
      price: "",
      stockQuantity: "0",
      lowStockThreshold: "5",
      isActive: true,
    });
    resetImageDraft();
    setModal("create");
  };

  const openEdit = (variant: BearVariant) => {
    if (!canEditVariant) {
      toast.error("Bạn không có quyền chỉnh sửa biến thể gấu.");
      return;
    }

    setEditingVariant(variant);
    setForm({
      collectionId: variant.collectionId,
      categoryId: variant.categoryId,
      name: variant.name,
      variantSymbol: variant.variantSymbol,
      description: variant.description,
      image: variant.image,
      price: String(variant.price),
      stockQuantity: String(variant.stockQuantity),
      lowStockThreshold: String(variant.lowStockThreshold),
      isActive: variant.isActive,
    });
    resetImageDraft();
    setModal("edit");
  };

  const onFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      toast.error("Chỉ chấp nhận tệp ảnh.");
      resetInput();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.");
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
    setForm((prev) => ({ ...prev, image: "" }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreateVariant) {
      toast.error("Bạn không có quyền tạo biến thể gấu.");
      return;
    }

    if (modal === "edit" && !canEditVariant) {
      toast.error("Bạn không có quyền chỉnh sửa biến thể gấu.");
      return;
    }

    const name = form.name.trim();
    const variantSymbol = form.variantSymbol.trim().toUpperCase();
    const description = normalizeRichTextForStorage(form.description);
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!form.collectionId) {
      toast.error("Vui lòng chọn bộ sưu tập.");
      return;
    }

    if (!form.categoryId) {
      toast.error("Vui lòng chọn danh mục sản phẩm.");
      return;
    }

    if (!name) {
      toast.error("Tên biến thể không được để trống.");
      return;
    }

    if (!variantSymbol) {
      toast.error("Ký hiệu biến thể không được để trống.");
      return;
    }

    if (!/^[A-Z0-9]{1,10}$/.test(variantSymbol)) {
      toast.error("Ký hiệu biến thể chỉ gồm chữ cái in hoa và số (tối đa 10 ký tự).");
      return;
    }

    if (!form.image.trim() && !pendingImageFile) {
      toast.error("Vui lòng tải lên ảnh cho biến thể.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Giá tiền phải lớn hơn 0.");
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      toast.error("Tồn kho phải là số nguyên từ 0 trở lên.");
      return;
    }

    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      toast.error("Ngưỡng cảnh báo tồn kho thấp phải là số nguyên từ 0 trở lên.");
      return;
    }

    const duplicateVariant = variants.find(
      (variant) =>
        variant.id !== editingVariant?.id &&
        variant.collectionId === form.collectionId &&
        variant.categoryId === form.categoryId &&
        variant.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicateVariant) {
      toast.error("Biến thể này đã tồn tại trong cùng bộ sưu tập và danh mục.");
      return;
    }

    const duplicateSymbol = variants.find(
      (variant) =>
        variant.id !== editingVariant?.id &&
        variant.variantSymbol.trim().toLowerCase() === variantSymbol.toLowerCase(),
    );

    if (duplicateSymbol) {
      toast.error("Ký hiệu biến thể đã tồn tại, vui lòng dùng ký hiệu khác.");
      return;
    }

    let uploadedImageUrl: string | null = null;

    try {
      let image = form.image.trim();

      if (pendingImageFile) {
        const formData = new FormData();
        formData.append("file", pendingImageFile);

        const { data } = await http.post<UploadImageResponse>(
          "/upload/image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        image = typeof data?.url === "string" ? data.url.trim() : "";
        uploadedImageUrl = image || null;

        if (!image) {
          throw new Error("Tải ảnh lên thất bại.");
        }
      }

      await saveMutation.mutateAsync({
        id: editingVariant?.id,
        payload: {
          collectionId: form.collectionId,
          categoryId: form.categoryId,
          name,
          variantSymbol,
          description,
          image,
          price: Math.round(price),
          stockQuantity,
          lowStockThreshold,
          isActive: form.isActive,
        },
      });
    } catch (error) {
      if (uploadedImageUrl) {
        await deleteUploadedImageByUrl(uploadedImageUrl);
      }

      if (!saveMutation.isError) {
        toast.error(getErrorMessage(error, "Không thể lưu biến thể."));
      }
    }
  };

  const handleToggleStatus = async (variant: BearVariant) => {
    if (!canEditVariant) {
      toast.error("Bạn không có quyền chỉnh sửa biến thể gấu.");
      return;
    }

    await toggleMutation.mutateAsync(variant);
  };

  const handleDelete = async () => {
    if (!confirmDeleteVariant) return;

    if (!canDeleteVariant) {
      toast.error("Bạn không có quyền xóa biến thể gấu.");
      return;
    }

    await deleteMutation.mutateAsync(confirmDeleteVariant.id);
  };

  const collectionErrorMessage = collectionsError
    ? getErrorMessage(
        collectionsError,
        "Không thể tải danh sách bộ sưu tập. Vui lòng kiểm tra lại.",
      )
    : null;

  const modalPreviewSrc = localPreview ?? getStaticAssetUrl(form.image);

  return (
    <div className="tab-panel lf-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">{BEAR_PRODUCT_NAME}</h2>
          <p className="tab-subtitle">
            Tạo và quản lý các biến thể sản phẩm gấu.
          </p>
        </div>
        <div className="lf-header-actions">
          {canCreateVariant && (
            <button className="btn-primary" onClick={openCreate}>
              <FiPlus size={15} /> Thêm biến thể
            </button>
          )}
        </div>
      </div>

      <section className="lf-product-card">
        <div className="lf-product-card__icon">
          <FiBox size={18} />
        </div>
        <div className="lf-product-card__content">
          <h3>{BEAR_PRODUCT_NAME}</h3>
          <p>
            Mỗi biến thể sẽ gắn với bộ sưu tập, danh mục, tên sản phẩm, mô tả,
            ảnh sản phẩm và giá tiền.
          </p>
        </div>
      </section>

      <section className="lf-stats">
        <div className="lf-stat-card">
          <span className="lf-stat-card__icon lf-stat-card__icon--variant">
            <FiPackage size={16} />
          </span>
          <div>
            <strong>{variants.length}</strong>
            <span>Biến thể</span>
          </div>
        </div>
        <div className="lf-stat-card">
          <span className="lf-stat-card__icon lf-stat-card__icon--active">A</span>
          <div>
            <strong>{activeCount}</strong>
            <span>Đang bán</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên, mô tả, bộ sưu tập hoặc danh mục..."
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

        <div className="lf-filters">
          <select
            className="form-input lf-filter-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="inactive">Đang ẩn</option>
          </select>
        </div>
      </section>

      {filteredVariants.length === 0 ? (
        <div className="tab-empty">
          <FiPackage size={42} className="tab-empty-icon" />
          <p>
            {variants.length === 0
              ? "Chưa có biến thể nào cho sản phẩm gấu."
              : "Không tìm thấy biến thể phù hợp bộ lọc."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tên biến thể</th>
                <th>Ký hiệu</th>
                <th>Bộ sưu tập</th>
                <th>Danh mục</th>
                <th>Tồn kho</th>
                <th>Giá tiền</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map((variant) => {
                const variantImageUrl = getStaticAssetUrl(variant.image);

                return (
                  <tr
                    key={variant.id}
                    className={variant.isActive ? "" : "row--inactive"}
                  >
                    <td>
                      <div className="lf-thumb">
                        <ImageWithFallback
                          src={variantImageUrl}
                          alt={variant.name}
                          fallback={<span>Không có ảnh</span>}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="lf-name-cell">
                        <p className="lf-name-cell__title">{variant.name}</p>
                        {variant.description && (
                          <RichTextContent value={variant.description} className="lf-name-cell__desc" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="lf-size-cell">{variant.variantSymbol}</span>
                    </td>
                    <td>{resolveCollectionName(variant)}</td>
                    <td>{resolveCategoryName(variant)}</td>
                    <td>
                      <span
                        className={`lf-stock${variant.stockQuantity <= variant.lowStockThreshold ? " low" : ""}${variant.stockQuantity === 0 ? " is-out" : ""}`}
                      >
                        {variant.stockQuantity}
                      </span>
                    </td>
                    <td className="lf-price-cell">{formatCurrency(variant.price)}</td>
                    <td>
                      <button
                        className={`status-badge ${
                          variant.isActive
                            ? "status-badge--active"
                            : "status-badge--inactive"
                        }`}
                        onClick={() => handleToggleStatus(variant)}
                        title="Bật/Tắt trạng thái"
                        disabled={!canEditVariant}
                      >
                        {variant.isActive ? "Đang bán" : "Đang ẩn"}
                      </button>
                    </td>
                    <td className="text-muted">{formatDateTime(variant.updatedAt)}</td>
                    <td>
                      <div className="tab-actions">
                        {canEditVariant && (
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => openEdit(variant)}
                            title="Chỉnh sửa"
                          >
                            <FiEdit2 size={14} />
                          </button>
                        )}
                        {canDeleteVariant && (
                          <button
                            className="btn-icon btn-del"
                            onClick={() => setConfirmDeleteVariant(variant)}
                            title="Xóa"
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

      <p className="lf-summary">
        Hiển thị {filteredVariants.length}/{variants.length} biến thể của {BEAR_PRODUCT_NAME}
      </p>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box modal-box--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create" ? "Thêm biến thể gấu" : "Chỉnh sửa biến thể gấu"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Bộ sưu tập <span className="form-required">*</span>
                  </label>
                  <select
                    className="form-input"
                    name="collectionId"
                    value={form.collectionId}
                    onChange={onFormChange}
                  >
                    <option value="">-- Chọn bộ sưu tập --</option>
                    {collections.map((collection) => (
                      <option key={collection._id} value={collection._id}>
                        {collection.name}
                        {collection.isActive ? "" : " (đang ẩn)"}
                      </option>
                    ))}
                    {form.collectionId && !collectionsById.has(form.collectionId) && (
                      <option value={form.collectionId}>
                        Bộ sưu tập cũ (không còn tồn tại)
                      </option>
                    )}
                  </select>
                  {collectionErrorMessage && (
                    <p className="form-hint lf-empty-hint">{collectionErrorMessage}</p>
                  )}
                  {!collectionErrorMessage && collections.length === 0 && (
                    <p className="form-hint lf-empty-hint">
                      Chưa có bộ sưu tập nào để chọn.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Danh mục sản phẩm <span className="form-required">*</span>
                  </label>
                  <select
                    className="form-input"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={onFormChange}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {productCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    {form.categoryId && !categoriesById.has(form.categoryId) && (
                      <option value={form.categoryId}>
                        Danh mục cũ (không còn tồn tại)
                      </option>
                    )}
                  </select>
                  {productCategories.length === 0 && (
                    <p className="form-hint lf-empty-hint">
                      Chưa có danh mục sản phẩm. Hãy tạo ở tab Danh mục sản phẩm.
                    </p>
                  )}
                </div>
              </div>

              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Tên biến thể <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    name="name"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder="VD: Gấu bông ôm tim"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Ký hiệu biến thể <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    name="variantSymbol"
                    value={form.variantSymbol}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        variantSymbol: event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 10),
                      }))
                    }
                    placeholder="VD: G1"
                  />
                  <p className="form-hint">Dùng cho mã đơn hàng, ví dụ: G1, G2, GB01.</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(nextValue) =>
                    setForm((prev) => ({ ...prev, description: nextValue }))
                  }
                  placeholder="Mô tả ngắn cho biến thể gấu..."
                  minHeight={130}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Ảnh biến thể <span className="form-required">*</span>
                </label>
                <div className="lf-image-field">
                  <div className="lf-image-preview">
                    <ImageWithFallback
                      src={modalPreviewSrc}
                      alt={form.name || "Ảnh biến thể"}
                      fallback={
                      <div className="lf-image-preview__empty">
                        <FiImage size={18} />
                        <span>Chưa có ảnh</span>
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
                      className="btn-secondary"
                      disabled={saveMutation.isPending}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <FiUpload size={14} />
                      {pendingImageFile
                        ? " Chọn lại ảnh"
                        : form.image
                          ? " Đổi ảnh"
                          : " Tải ảnh lên"}
                    </button>
                    {(pendingImageFile || form.image) && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={saveMutation.isPending}
                        onClick={clearImage}
                      >
                        <FiX size={14} /> Xóa ảnh
                      </button>
                    )}
                  </div>

                  <p className="form-hint">
                    Dùng file ảnh dưới 5MB. Ảnh sẽ được tải lên khi bấm lưu.
                  </p>
                </div>
              </div>

              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Giá tiền (VND) <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={1000}
                    step={1000}
                    name="price"
                    value={form.price}
                    onChange={onFormChange}
                    placeholder="VD: 349000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Tồn kho hiện tại <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    step={1}
                    name="stockQuantity"
                    value={form.stockQuantity}
                    onChange={onFormChange}
                    placeholder="VD: 30"
                  />
                </div>
              </div>

              <div className="lf-form-row">
                <div className="form-group">
                  <label className="form-label">
                    Ngưỡng cảnh báo tồn kho thấp <span className="form-required">*</span>
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    step={1}
                    name="lowStockThreshold"
                    value={form.lowStockThreshold}
                    onChange={onFormChange}
                    placeholder="VD: 5"
                  />
                  <p className="form-hint">
                    Khi tồn kho nhỏ hơn hoặc bằng ngưỡng này, sản phẩm sẽ được đánh dấu tồn thấp.
                  </p>
                </div>

                <div className="form-group form-group--row lf-toggle-wrap">
                  <label className="form-toggle">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    <span className="form-toggle__track" />
                    <span className="form-toggle__label">
                      {form.isActive ? "Đang bán" : "Đang ẩn"}
                    </span>
                  </label>
                </div>
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
                      <FiSave size={14} /> Lưu biến thể
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteVariant && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteVariant(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa biến thể</h3>
              <button className="modal-close" onClick={() => setConfirmDeleteVariant(null)}>
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa biến thể <strong>{confirmDeleteVariant.name}</strong>?
                  Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmDeleteVariant(null)}
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

export default BearVariantsTab;
