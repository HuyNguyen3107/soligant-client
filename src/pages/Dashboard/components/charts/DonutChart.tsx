import type { DonutSegment } from "../../types";

const DonutChart = () => {
  const segments: DonutSegment[] = [
    { label: "Trực tiếp", value: 35, color: "#731618" },
    { label: "Tìm kiếm", value: 28, color: "#3b82f6" },
    { label: "Giới thiệu", value: 22, color: "#f59e0b" },
    { label: "Mạng xã hội", value: 15, color: "#a855f7" },
  ];
  const r = 52,
    cx = 70,
    cy = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / 100) * circ;
    const el = (
      <circle
        key={seg.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth="16"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: `${cx}px ${cy}px`,
        }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="donut-wrapper">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
        />
        {arcs}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#1e293b"
        >
          284K
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          Lượt truy cập
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((seg) => (
          <div key={seg.label} className="donut-legend-item">
            <span className="donut-dot" style={{ background: seg.color }} />
            <span className="donut-legend-label">{seg.label}</span>
            <span className="donut-legend-value">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
