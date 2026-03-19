import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiArchive,
  FiEdit2,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiX,
} from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import {
  getInventoryItems,
  updateInventoryItem,
} from "../../../services/inventory.service";
import type { InventoryItemRow, InventoryStockStatus } from "../types";

type InventorySource = InventoryItemRow["source"];

const STOCK_STATUS_LABELS: Record<InventoryStockStatus, string> = {
  in_stock: "Còn hàng",
  low_stock: "Tồn thấp",
  out_of_stock: "Hết hàng",
};

const STOCK_STATUS_STYLES: Record<
  InventoryStockStatus,
  { background: string; color: string }
> = {
  in_stock: { background: "#dcfce7", color: "#166534" },
  low_stock: { background: "#fef3c7", color: "#92400e" },
  out_of_stock: { background: "#fee2e2", color: "#991b1b" },
};

const OPTION_VISUAL_LABELS: Record<
  InventoryItemRow["optionVisualType"],
  string
> = {
  image: "Ảnh",
  color: "Màu",
};

const INVENTORY_SOURCE_LABELS: Record<InventorySource, string> = {
  lego: "Lego",
  bear: "Gấu",
};

const resolveItemSource = (item: InventoryItemRow): InventorySource =>
  item.source === "bear" ? "bear" : "lego";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface InventoryEditFormState {
  mode: "set" | "adjust";
  stockQuantity: string;
  stockDelta: string;
  lowStockThreshold: string;
}

const InventoryTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canEditInventory = hasPermission(currentUser, "inventory.edit");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    InventoryStockStatus | "all"
  >("all");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [editForm, setEditForm] = useState<InventoryEditFormState>({
    mode: "set",
    stockQuantity: "0",
    stockDelta: "0",
    lowStockThreshold: "5",
  });

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: getInventoryItems,
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: Parameters<typeof updateInventoryItem>[1];
    }) => updateInventoryItem(variables.id, variables.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["lego-customizations"] });
      queryClient.invalidateQueries({ queryKey: ["bear-customizations"] });
      queryClient.invalidateQueries({
        queryKey: ["public-lego-customizations"],
      });
      toast.success("Đã cập nhật tồn kho.");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật tồn kho."),
      );
    },
  });

  const stats = useMemo(() => {
    const legoCount = items.filter(
      (item) => resolveItemSource(item) === "lego",
    ).length;
    const bearCount = items.filter(
      (item) => resolveItemSource(item) === "bear",
    ).length;
    const lowStockCount = items.filter(
      (item) => item.stockStatus === "low_stock",
    ).length;
    const outOfStockCount = items.filter(
      (item) => item.stockStatus === "out_of_stock",
    ).length;

    return {
      total: items.length,
      legoCount,
      bearCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.optionName.toLowerCase().includes(keyword) ||
        item.groupName.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || item.stockStatus === statusFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && item.isActive) ||
        (activeFilter === "inactive" && !item.isActive);

      return matchesKeyword && matchesStatus && matchesActive;
    });
  }, [activeFilter, items, search, statusFilter]);

  const legoFilteredItems = useMemo(
    () => filteredItems.filter((item) => resolveItemSource(item) === "lego"),
    [filteredItems],
  );

  const bearFilteredItems = useMemo(
    () => filteredItems.filter((item) => resolveItemSource(item) === "bear"),
    [filteredItems],
  );

  const openEdit = (item: InventoryItemRow) => {
    if (!canEditInventory) {
      toast.error("Bạn không có quyền cập nhật tồn kho.");
      return;
    }

    setEditingItem(item);
    setEditForm({
      mode: "set",
      stockQuantity: String(item.stockQuantity),
      stockDelta: "0",
      lowStockThreshold: String(item.lowStockThreshold),
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditForm({
      mode: "set",
      stockQuantity: "0",
      stockDelta: "0",
      lowStockThreshold: "5",
    });
  };

  const applyQuickDelta = async (item: InventoryItemRow, delta: number) => {
    if (!canEditInventory) {
      toast.error("Bạn không có quyền cập nhật tồn kho.");
      return;
    }

    await updateMutation.mutateAsync({
      id: item.id,
      payload: { stockDelta: delta },
    });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingItem) {
      return;
    }

    if (!canEditInventory) {
      toast.error("Bạn không có quyền cập nhật tồn kho.");
      return;
    }

    const lowStockThreshold = Number(editForm.lowStockThreshold);
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      toast.error("Ngưỡng tồn kho thấp phải là số nguyên từ 0 trở lên.");
      return;
    }

    const payload: Parameters<typeof updateInventoryItem>[1] = {
      lowStockThreshold,
    };

    if (editForm.mode === "set") {
      const stockQuantity = Number(editForm.stockQuantity);

      if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
        toast.error("Tồn kho mới phải là số nguyên từ 0 trở lên.");
        return;
      }

      payload.stockQuantity = stockQuantity;
    } else {
      const stockDelta = Number(editForm.stockDelta);

      if (!Number.isInteger(stockDelta) || stockDelta === 0) {
        toast.error("Giá trị điều chỉnh phải là số nguyên và khác 0.");
        return;
      }

      payload.stockDelta = stockDelta;
    }

    await updateMutation.mutateAsync({ id: editingItem.id, payload });
    closeEditModal();
  };

  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Quản lý kho</h2>
          <p className="tab-subtitle">
            Theo dõi tồn kho cho từng lựa chọn tùy chỉnh và cập nhật nhập/xuất
            kho ngay trên dashboard.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Làm mới tồn kho"
        >
          <FiRefreshCw size={14} /> {isFetching ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiArchive size={15} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng lựa chọn</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">L</span>
          <div>
            <strong>{stats.legoCount}</strong>
            <span>Lựa chọn Lego</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">G</span>
          <div>
            <strong>{stats.bearCount}</strong>
            <span>Lựa chọn Gấu</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">!</span>
          <div>
            <strong>{stats.lowStockCount}</strong>
            <span>Tồn thấp</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">0</span>
          <div>
            <strong>{stats.outOfStockCount}</strong>
            <span>Hết hàng</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên lựa chọn hoặc nhóm tùy chỉnh..."
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

        <select
          className="form-input"
          style={{ maxWidth: "210px" }}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as InventoryStockStatus | "all")
          }
        >
          <option value="all">Tất cả trạng thái kho</option>
          <option value="in_stock">Còn hàng</option>
          <option value="low_stock">Tồn thấp</option>
          <option value="out_of_stock">Hết hàng</option>
        </select>

        <select
          className="form-input"
          style={{ maxWidth: "170px" }}
          value={activeFilter}
          onChange={(event) =>
            setActiveFilter(event.target.value as "all" | "active" | "inactive")
          }
        >
          <option value="all">Mọi trạng thái bán</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Đang ẩn</option>
        </select>
      </section>

      {isLoading ? (
        <div className="tab-empty">
          <FiArchive size={40} className="tab-empty-icon" />
          <p>Đang tải dữ liệu tồn kho...</p>
        </div>
      ) : isError ? (
        <div className="tab-empty">
          <FiAlertTriangle size={40} className="tab-empty-icon" />
          <p>{getErrorMessage(error, "Không thể tải dữ liệu tồn kho.")}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="tab-empty">
          <FiArchive size={40} className="tab-empty-icon" />
          <p>
            {items.length === 0
              ? "Chưa có lựa chọn tùy chỉnh nào để quản lý kho."
              : "Không có lựa chọn khớp điều kiện lọc."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {[
            { source: "lego" as const, sourceItems: legoFilteredItems },
            { source: "bear" as const, sourceItems: bearFilteredItems },
          ].map(({ source, sourceItems }) => (
            <section key={source}>
              <div
                className="tab-toolbar"
                style={{ marginBottom: 8, padding: "10px 12px" }}
              >
                <div>
                  <strong>
                    Kho lựa chọn {INVENTORY_SOURCE_LABELS[source]}
                  </strong>
                  <p
                    className="text-muted"
                    style={{ margin: "2px 0 0", fontSize: 12 }}
                  >
                    {sourceItems.length} lựa chọn
                  </p>
                </div>
                <span className="lc-name-chip">
                  {INVENTORY_SOURCE_LABELS[source]}
                </span>
              </div>

              {sourceItems.length === 0 ? (
                <div className="tab-empty" style={{ padding: "18px 12px" }}>
                  <p>
                    Không có lựa chọn{" "}
                    {INVENTORY_SOURCE_LABELS[source].toLowerCase()} khớp điều
                    kiện lọc.
                  </p>
                </div>
              ) : (
                <div className="tab-table-wrap">
                  <table className="tab-table">
                    <thead>
                      <tr>
                        <th>Lựa chọn</th>
                        <th>Nhóm tùy chỉnh</th>
                        <th>Kiểu hiển thị</th>
                        <th>Tồn kho</th>
                        <th>Ngưỡng thấp</th>
                        <th>Trạng thái kho</th>
                        <th>Cập nhật</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceItems.map((item) => {
                        const statusStyles =
                          STOCK_STATUS_STYLES[item.stockStatus];

                        return (
                          <tr
                            key={`${resolveItemSource(item)}-${item.id}`}
                            className={item.isActive ? "" : "row--inactive"}
                          >
                            <td>
                              <strong>{item.optionName}</strong>
                            </td>
                            <td>{item.groupName || "-"}</td>
                            <td>
                              <span className="lc-name-chip">
                                {OPTION_VISUAL_LABELS[item.optionVisualType]}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`lf-stock${item.stockStatus === "low_stock" ? " low" : ""}${item.stockStatus === "out_of_stock" ? " is-out" : ""}`}
                              >
                                {item.stockQuantity}
                              </span>
                            </td>
                            <td>{item.lowStockThreshold}</td>
                            <td>
                              <span
                                className="lc-name-chip"
                                style={{
                                  background: statusStyles.background,
                                  color: statusStyles.color,
                                }}
                              >
                                {STOCK_STATUS_LABELS[item.stockStatus]}
                              </span>
                            </td>
                            <td className="text-muted">
                              {formatDateTime(item.updatedAt)}
                            </td>
                            <td>
                              <div
                                className="tab-actions"
                                style={{ flexWrap: "wrap" }}
                              >
                                {canEditInventory && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      title="Giảm 1"
                                      style={{
                                        background: "#fef2f2",
                                        color: "#b91c1c",
                                      }}
                                      onClick={() => applyQuickDelta(item, -1)}
                                      disabled={
                                        updateMutation.isPending ||
                                        item.stockQuantity <= 0
                                      }
                                    >
                                      <FiMinus size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon"
                                      title="Tăng 1"
                                      style={{
                                        background: "#ecfdf5",
                                        color: "#166534",
                                      }}
                                      onClick={() => applyQuickDelta(item, 1)}
                                      disabled={updateMutation.isPending}
                                    >
                                      <FiPlus size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-icon btn-edit"
                                      title="Chỉnh sửa chi tiết tồn kho"
                                      onClick={() => openEdit(item)}
                                      disabled={updateMutation.isPending}
                                    >
                                      <FiEdit2 size={13} />
                                    </button>
                                  </>
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
            </section>
          ))}
        </div>
      )}

      <p className="lf-summary">
        Hiển thị {filteredItems.length}/{items.length} lựa chọn trong kho
        {` (Lego: ${legoFilteredItems.length}/${stats.legoCount}, Gấu: ${bearFilteredItems.length}/${stats.bearCount})`}
      </p>

      {editingItem && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div
            className="modal-box modal-box--sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                Cập nhật kho: {editingItem.optionName}
              </h3>
              <button className="modal-close" onClick={closeEditModal}>
                <FiX size={16} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nguồn kho</label>
                <input
                  className="form-input"
                  value={
                    INVENTORY_SOURCE_LABELS[resolveItemSource(editingItem)]
                  }
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lựa chọn tùy chỉnh</label>
                <input
                  className="form-input"
                  value={editingItem.optionName}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nhóm</label>
                <input
                  className="form-input"
                  value={editingItem.groupName}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chế độ cập nhật</label>
                <div className="promo-radio-group">
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="inventory-mode"
                      value="set"
                      checked={editForm.mode === "set"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, mode: "set" }))
                      }
                    />
                    <span>Đặt số lượng tồn kho</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="inventory-mode"
                      value="adjust"
                      checked={editForm.mode === "adjust"}
                      onChange={() =>
                        setEditForm((prev) => ({ ...prev, mode: "adjust" }))
                      }
                    />
                    <span>Điều chỉnh nhập/xuất (+/-)</span>
                  </label>
                </div>
              </div>

              {editForm.mode === "set" ? (
                <div className="form-group">
                  <label className="form-label">Tồn kho mới *</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    step={1}
                    value={editForm.stockQuantity}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        stockQuantity: event.target.value,
                      }))
                    }
                    placeholder="VD: 25"
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    Điều chỉnh tồn kho (+/-) *
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    step={1}
                    value={editForm.stockDelta}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        stockDelta: event.target.value,
                      }))
                    }
                    placeholder="VD: +10 hoặc -5"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Ngưỡng cảnh báo tồn kho thấp *
                </label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step={1}
                  value={editForm.lowStockThreshold}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      lowStockThreshold: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEditModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> Lưu tồn kho
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTab;
