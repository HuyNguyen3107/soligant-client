import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiDollarSign,
  FiMessageCircle,
  FiShoppingBag,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Sparkline, LineChart, DonutChart } from "./charts";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { getFeedbacks } from "../../../services/feedbacks.service";
import { getOrders } from "../../../services/orders.service";
import { useAuthStore } from "../../../store/auth.store";
import type { FeedbackRow, OrderRow, OrderStatus } from "../types";

type ChartTab = "revenue" | "orders" | "discounts";

type StatCardViewModel = {
  label: string;
  value: string;
  changeText: string;
  up: boolean;
  icon: React.ElementType;
  sparkData: number[];
  color: string;
};

type MonthlyMetricViewModel = {
  label: string;
  currentLabel: string;
  previousLabel: string;
  pct: number;
  deltaText: string;
  up: boolean;
  color: string;
};

const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
] as const;

const PAID_ORDER_STATUSES = new Set<OrderStatus>([
  "paid",
  "designing",
  "waiting_design_approval",
  "producing",
  "shipped",
  "delivering",
  "completed",
  "complaint",
  "handling_complaint",
  "complaint_closed",
  "closed",
]);

const DONE_ORDER_STATUSES = new Set<OrderStatus>(["completed", "closed"]);

const ORDER_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  waiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  producing: "Đang sản xuất",
  shipped: "Đã gửi vận chuyển",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  closed: "Kết thúc",
  cancelled: "Hủy đơn",
};

const DONUT_COLORS = ["#731618", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"];

const formatCurrency = (value: number) =>
  `${Math.max(0, Math.round(value)).toLocaleString("vi-VN")}đ`;

const formatCount = (value: number) =>
  Math.max(0, Math.round(value)).toLocaleString("vi-VN");

const formatCompactNumber = (value: number) => {
  const normalized = Math.abs(value);
  if (normalized >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (normalized >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (normalized >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Math.round(value).toString();
};

const formatCompactCurrency = (value: number) => {
  const normalized = Math.abs(value);
  if (normalized >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (normalized >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} triệu`;
  }
  if (normalized >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return Math.round(value).toString();
};

const calculatePctChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
};

const formatPctChange = (pct: number) => {
  const rounded = Math.round(pct * 10) / 10;
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
};

const normalizeOrderFieldValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(" ");
  }
  return "";
};

const getCustomerKey = (order: OrderRow) => {
  let email = "";
  let phone = "";
  let name = "";

  order.customerInfoEntries.forEach((entry) => {
    const label = (entry.label ?? "").toLowerCase();
    const value = normalizeOrderFieldValue(entry.value).toLowerCase();
    if (!value) return;

    if (!email && /(email|mail)/i.test(label)) {
      email = value;
      return;
    }

    if (!phone && /(sđt|điện\s*thoại|phone|tel|zalo)/i.test(label)) {
      phone = value;
      return;
    }

    if (!name && /(họ\s*tên|tên|full\s*name|name)/i.test(label)) {
      name = value;
    }
  });

  return phone || email || name || `guest-${order.id}`;
};

const DashboardTab = () => {
  const [chartTab, setChartTab] = useState<ChartTab>("revenue");
  const currentUser = useAuthStore((state) => state.user);
  const canViewOrders = hasPermission(currentUser, "orders.view");
  const canViewFeedbacks = hasPermission(currentUser, "feedbacks.view");

  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    error: ordersError,
  } = useQuery({
    queryKey: ["dashboard-overview-orders"],
    queryFn: getOrders,
    enabled: canViewOrders,
  });

  const {
    data: feedbacks = [],
    isLoading: isFeedbacksLoading,
    isError: isFeedbacksError,
    error: feedbacksError,
  } = useQuery({
    queryKey: ["dashboard-overview-feedbacks"],
    queryFn: getFeedbacks,
    enabled: canViewFeedbacks,
  });

  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousMonthYear =
      currentMonth === 0 ? currentYear - 1 : currentYear;

    const monthlyRevenue = Array.from({ length: 12 }, () => 0);
    const monthlyOrders = Array.from({ length: 12 }, () => 0);
    const monthlyDiscounts = Array.from({ length: 12 }, () => 0);
    const monthlyCompletedOrders = Array.from({ length: 12 }, () => 0);
    const monthlyCustomers = Array.from(
      { length: 12 },
      () => new Set<string>(),
    );

    const allCustomers = new Set<string>();
    const orderStatusCount = new Map<OrderStatus, number>();

    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    let currentMonthOrders = 0;
    let previousMonthOrders = 0;
    let currentMonthDiscounts = 0;
    let previousMonthDiscounts = 0;
    let currentMonthCompleted = 0;
    let previousMonthCompleted = 0;
    let totalRevenue = 0;
    let totalCompletedOrders = 0;

    orders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) return;

      const month = orderDate.getMonth();
      const year = orderDate.getFullYear();
      const customerKey = getCustomerKey(order);

      allCustomers.add(customerKey);
      orderStatusCount.set(
        order.status,
        (orderStatusCount.get(order.status) ?? 0) + 1,
      );

      const revenueValue = PAID_ORDER_STATUSES.has(order.status)
        ? order.pricingSummary.finalTotal
        : 0;
      const discountValue =
        order.pricingSummary.productDiscountTotal +
        order.pricingSummary.orderDiscountTotal;
      const isCompleted = DONE_ORDER_STATUSES.has(order.status);

      if (PAID_ORDER_STATUSES.has(order.status)) {
        totalRevenue += revenueValue;
      }

      if (isCompleted) {
        totalCompletedOrders += 1;
      }

      if (year === currentYear) {
        monthlyOrders[month] += 1;
        monthlyRevenue[month] += revenueValue;
        monthlyDiscounts[month] += discountValue;
        monthlyCustomers[month].add(customerKey);
        if (isCompleted) {
          monthlyCompletedOrders[month] += 1;
        }
      }

      if (year === currentYear && month === currentMonth) {
        currentMonthOrders += 1;
        currentMonthRevenue += revenueValue;
        currentMonthDiscounts += discountValue;
        if (isCompleted) {
          currentMonthCompleted += 1;
        }
      }

      if (year === previousMonthYear && month === previousMonth) {
        previousMonthOrders += 1;
        previousMonthRevenue += revenueValue;
        previousMonthDiscounts += discountValue;
        if (isCompleted) {
          previousMonthCompleted += 1;
        }
      }
    });

    const currentMonthCustomers = monthlyCustomers[currentMonth]?.size ?? 0;
    const previousMonthCustomers =
      previousMonthYear === currentYear
        ? (monthlyCustomers[previousMonth]?.size ?? 0)
        : 0;

    const publicFeedbacks = feedbacks.filter(
      (feedback) => feedback.isPublic,
    ).length;
    const currentMonthFeedbacks = feedbacks.filter((feedback) => {
      const createdAt = new Date(feedback.createdAt);
      return (
        !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === currentYear &&
        createdAt.getMonth() === currentMonth
      );
    }).length;
    const previousMonthFeedbacks = feedbacks.filter((feedback) => {
      const createdAt = new Date(feedback.createdAt);
      return (
        !Number.isNaN(createdAt.getTime()) &&
        createdAt.getFullYear() === previousMonthYear &&
        createdAt.getMonth() === previousMonth
      );
    }).length;

    const topStatusEntries = [...orderStatusCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const topStatusTotal = topStatusEntries.reduce(
      (sum, entry) => sum + entry[1],
      0,
    );
    const remainingStatusTotal = orders.length - topStatusTotal;

    const donutSegments = topStatusEntries.map(([status, count], index) => ({
      label: ORDER_STATUS_LABELS[status] ?? status,
      value: count,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));

    if (remainingStatusTotal > 0) {
      donutSegments.push({
        label: "Khác",
        value: remainingStatusTotal,
        color: DONUT_COLORS[donutSegments.length % DONUT_COLORS.length],
      });
    }

    const donutSegmentsWithPct = donutSegments.map((segment) => ({
      ...segment,
      pct: orders.length > 0 ? (segment.value / orders.length) * 100 : 0,
    }));

    const statCards: StatCardViewModel[] = [
      {
        label: "Tổng doanh thu",
        value: formatCurrency(totalRevenue),
        changeText: formatPctChange(
          calculatePctChange(currentMonthRevenue, previousMonthRevenue),
        ),
        up: currentMonthRevenue >= previousMonthRevenue,
        icon: FiDollarSign,
        sparkData: monthlyRevenue,
        color: "#731618",
      },
      {
        label: "Khách hàng",
        value: formatCount(allCustomers.size),
        changeText: formatPctChange(
          calculatePctChange(currentMonthCustomers, previousMonthCustomers),
        ),
        up: currentMonthCustomers >= previousMonthCustomers,
        icon: FiUsers,
        sparkData: monthlyCustomers.map(
          (customersByMonth) => customersByMonth.size,
        ),
        color: "#3b82f6",
      },
      {
        label: "Tổng đơn hàng",
        value: formatCount(orders.length),
        changeText: formatPctChange(
          calculatePctChange(currentMonthOrders, previousMonthOrders),
        ),
        up: currentMonthOrders >= previousMonthOrders,
        icon: FiShoppingBag,
        sparkData: monthlyOrders,
        color: "#f59e0b",
      },
      {
        label: canViewFeedbacks ? "Feedback công khai" : "Đơn hoàn thành",
        value: formatCount(
          canViewFeedbacks ? publicFeedbacks : totalCompletedOrders,
        ),
        changeText: formatPctChange(
          calculatePctChange(
            canViewFeedbacks ? currentMonthFeedbacks : currentMonthCompleted,
            canViewFeedbacks ? previousMonthFeedbacks : previousMonthCompleted,
          ),
        ),
        up: canViewFeedbacks
          ? currentMonthFeedbacks >= previousMonthFeedbacks
          : currentMonthCompleted >= previousMonthCompleted,
        icon: canViewFeedbacks ? FiMessageCircle : FiShoppingBag,
        sparkData: canViewFeedbacks
          ? Array.from({ length: 12 }, (_, index) => {
              return feedbacks.filter((feedback: FeedbackRow) => {
                const createdAt = new Date(feedback.createdAt);
                return (
                  !Number.isNaN(createdAt.getTime()) &&
                  createdAt.getFullYear() === currentYear &&
                  createdAt.getMonth() === index &&
                  feedback.isPublic
                );
              }).length;
            })
          : monthlyCompletedOrders,
        color: canViewFeedbacks ? "#8b5cf6" : "#10b981",
      },
    ];

    const monthlyComparison: MonthlyMetricViewModel[] = [
      {
        label: "Doanh thu tháng",
        currentLabel: formatCurrency(currentMonthRevenue),
        previousLabel: formatCurrency(previousMonthRevenue),
        pct: Math.round(
          (currentMonthRevenue /
            Math.max(currentMonthRevenue, previousMonthRevenue, 1)) *
            100,
        ),
        deltaText: formatPctChange(
          calculatePctChange(currentMonthRevenue, previousMonthRevenue),
        ),
        up: currentMonthRevenue >= previousMonthRevenue,
        color: "#731618",
      },
      {
        label: "Đơn hàng mới",
        currentLabel: formatCount(currentMonthOrders),
        previousLabel: formatCount(previousMonthOrders),
        pct: Math.round(
          (currentMonthOrders /
            Math.max(currentMonthOrders, previousMonthOrders, 1)) *
            100,
        ),
        deltaText: formatPctChange(
          calculatePctChange(currentMonthOrders, previousMonthOrders),
        ),
        up: currentMonthOrders >= previousMonthOrders,
        color: "#3b82f6",
      },
      {
        label: "Khách hàng mới",
        currentLabel: formatCount(currentMonthCustomers),
        previousLabel: formatCount(previousMonthCustomers),
        pct: Math.round(
          (currentMonthCustomers /
            Math.max(currentMonthCustomers, previousMonthCustomers, 1)) *
            100,
        ),
        deltaText: formatPctChange(
          calculatePctChange(currentMonthCustomers, previousMonthCustomers),
        ),
        up: currentMonthCustomers >= previousMonthCustomers,
        color: "#f59e0b",
      },
    ];

    return {
      statCards,
      monthlyRevenue,
      monthlyOrders,
      monthlyDiscounts,
      monthlyComparison,
      donutSegments: donutSegmentsWithPct,
      totalOrders: orders.length,
    };
  }, [canViewFeedbacks, feedbacks, orders]);

  const chartData = useMemo(() => {
    if (chartTab === "revenue") {
      return {
        data: analytics.monthlyRevenue,
        color: "#731618",
        valueFormatter: formatCompactCurrency,
      };
    }

    if (chartTab === "orders") {
      return {
        data: analytics.monthlyOrders,
        color: "#3b82f6",
        valueFormatter: formatCompactNumber,
      };
    }

    return {
      data: analytics.monthlyDiscounts,
      color: "#f59e0b",
      valueFormatter: formatCompactCurrency,
    };
  }, [
    analytics.monthlyDiscounts,
    analytics.monthlyOrders,
    analytics.monthlyRevenue,
    chartTab,
  ]);

  const canShowData = canViewOrders;
  const isLoadingData =
    (canViewOrders && isOrdersLoading) ||
    (canViewFeedbacks && isFeedbacksLoading);

  const feedbackErrorMessage =
    canViewFeedbacks && isFeedbacksError
      ? getErrorMessage(feedbacksError, "Không thể tải dữ liệu feedback.")
      : "";

  const orderErrorMessage =
    canViewOrders && isOrdersError
      ? getErrorMessage(ordersError, "Không thể tải dữ liệu đơn hàng.")
      : "";

  return (
    <div className="tab-content">
      {!canShowData && (
        <div className="dashboard-alert">
          Bạn chưa có quyền xem dữ liệu thống kê đơn hàng. Vui lòng cấp quyền
          <strong> orders.view</strong> để hiển thị dashboard theo dữ liệu thật.
        </div>
      )}

      {orderErrorMessage && (
        <div className="dashboard-alert dashboard-alert--error">
          {orderErrorMessage}
        </div>
      )}

      {feedbackErrorMessage && (
        <div className="dashboard-alert dashboard-alert--warn">
          {feedbackErrorMessage}
        </div>
      )}

      <div className="stat-grid">
        {analytics.statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="stat-card__top">
                <div className="stat-card__left">
                  <p className="stat-card__label">{card.label}</p>
                  <p className="stat-card__value">
                    {canShowData ? card.value : "-"}
                  </p>
                  <p className={`stat-card__change ${card.up ? "up" : "down"}`}>
                    {card.up ? (
                      <FiTrendingUp size={13} />
                    ) : (
                      <FiTrendingDown size={13} />
                    )}
                    <span>
                      {canShowData
                        ? `${card.changeText} so với tháng trước`
                        : "Không có dữ liệu"}
                    </span>
                  </p>
                </div>
                <div
                  className="stat-card__icon"
                  style={{ background: card.color + "20", color: card.color }}
                >
                  <Icon size={22} />
                </div>
              </div>
              <div className="stat-card__spark">
                <Sparkline
                  data={
                    canShowData
                      ? card.sparkData
                      : Array.from({ length: 12 }, () => 0)
                  }
                  color={card.color}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bottom-row">
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <h3 className="chart-card__title">Tổng quan</h3>
              <p className="chart-card__sub">
                Dữ liệu thực tế theo tháng trong năm hiện tại
              </p>
            </div>
            <div className="chart-tab-group">
              {(["revenue", "orders", "discounts"] as const).map((t) => (
                <button
                  key={t}
                  className={`chart-tab-btn${chartTab === t ? " active" : ""}`}
                  onClick={() => setChartTab(t)}
                >
                  {t === "revenue"
                    ? "Doanh thu"
                    : t === "orders"
                      ? "Đơn hàng"
                      : "Giảm giá"}
                </button>
              ))}
            </div>
          </div>
          <LineChart
            labels={[...MONTH_LABELS]}
            data={
              canShowData ? chartData.data : Array.from({ length: 12 }, () => 0)
            }
            color={chartData.color}
            valueFormatter={chartData.valueFormatter}
            isLoading={isLoadingData}
          />
        </div>

        <div className="right-col">
          <div className="info-card">
            <h3 className="info-card__title">Trạng thái đơn hàng</h3>
            <p className="info-card__sub">
              Phân bổ đơn theo trạng thái hiện tại
            </p>
            <DonutChart
              segments={analytics.donutSegments}
              total={analytics.totalOrders}
              centerLabel={formatCount(analytics.totalOrders)}
              centerSubLabel="Tổng đơn"
            />
          </div>

          <div className="info-card">
            <h3 className="info-card__title">So sánh theo tháng</h3>
            <p className="info-card__sub">
              Đối chiếu tháng hiện tại với tháng trước
            </p>
            <div className="goals-list">
              {analytics.monthlyComparison.map((goal) => (
                <div key={goal.label} className="goal-item metric-item">
                  <div className="goal-item__header">
                    <span className="goal-item__label">{goal.label}</span>
                    <span
                      className={`goal-item__pct ${goal.up ? "up" : "down"}`}
                    >
                      {goal.deltaText}
                    </span>
                  </div>
                  <div className="goal-bar">
                    <div
                      className="goal-bar__fill"
                      style={{ width: `${goal.pct}%`, background: goal.color }}
                    />
                  </div>
                  <div className="goal-item__footer">
                    <span>Tháng này: {goal.currentLabel}</span>
                    <span>Tháng trước: {goal.previousLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
