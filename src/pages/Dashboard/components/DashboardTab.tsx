import { useState } from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { Sparkline, LineChart, DonutChart } from "./charts";
import { statCards } from "../config";
import type { GoalItem } from "../types";

const goals: GoalItem[] = [
  {
    label: "Doanh thu tháng",
    current: 48295,
    target: 55000,
    pct: 88,
    color: "#731618",
  },
  {
    label: "Khách hàng mới",
    current: 847,
    target: 1000,
    pct: 85,
    color: "#3b82f6",
  },
  {
    label: "Tỷ lệ chuyển đổi",
    current: 76,
    target: 100,
    pct: 76,
    color: "#f59e0b",
  },
];

const DashboardTab = () => {
  const [chartTab, setChartTab] = useState<"revenue" | "orders" | "profit">(
    "revenue",
  );
  return (
    <div className="tab-content">
      <div className="stat-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card">
              <div className="stat-card__top">
                <div className="stat-card__left">
                  <p className="stat-card__label">{card.label}</p>
                  <p className="stat-card__value">{card.value}</p>
                  <p className={`stat-card__change ${card.up ? "up" : "down"}`}>
                    {card.up ? (
                      <FiTrendingUp size={13} />
                    ) : (
                      <FiTrendingDown size={13} />
                    )}
                    <span>{card.change} so với tháng trước</span>
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
                <Sparkline data={card.sparkData} color={card.color} />
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
                Hiệu suất hàng tháng trong năm nay
              </p>
            </div>
            <div className="chart-tab-group">
              {(["revenue", "orders", "profit"] as const).map((t) => (
                <button
                  key={t}
                  className={`chart-tab-btn${chartTab === t ? " active" : ""}`}
                  onClick={() => setChartTab(t)}
                >
                  {t === "revenue"
                    ? "Doanh thu"
                    : t === "orders"
                      ? "Đơn hàng"
                      : "Lợi nhuận"}
                </button>
              ))}
            </div>
          </div>
          <LineChart />
        </div>

        <div className="right-col">
          <div className="info-card">
            <h3 className="info-card__title">Nguồn truy cập</h3>
            <p className="info-card__sub">Khách hàng đến từ đâu</p>
            <DonutChart />
          </div>

          <div className="info-card">
            <h3 className="info-card__title">Mục tiêu tháng</h3>
            <p className="info-card__sub">Theo dõi tiến độ mục tiêu</p>
            <div className="goals-list">
              {goals.map((goal) => (
                <div key={goal.label} className="goal-item">
                  <div className="goal-item__header">
                    <span className="goal-item__label">{goal.label}</span>
                    <span className="goal-item__pct">{goal.pct}%</span>
                  </div>
                  <div className="goal-bar">
                    <div
                      className="goal-bar__fill"
                      style={{ width: `${goal.pct}%`, background: goal.color }}
                    />
                  </div>
                  <div className="goal-item__footer">
                    <span>{goal.current.toLocaleString("vi-VN")}</span>
                    <span>Mục tiêu: {goal.target.toLocaleString("vi-VN")}</span>
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
