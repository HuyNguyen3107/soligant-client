interface DonutSegmentValue {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegmentValue[];
  total: number;
  centerLabel: string;
  centerSubLabel: string;
}

const DonutChart = ({
  segments,
  total,
  centerLabel,
  centerSubLabel,
}: DonutChartProps) => {
  const r = 52,
    cx = 70,
    cy = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.pct / 100) * circ;
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

  const hasData = total > 0 && segments.length > 0;

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
        {hasData ? arcs : null}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="#1e293b"
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          {centerSubLabel}
        </text>
      </svg>
      <div className="donut-legend">
        {!hasData ? (
          <div className="donut-empty">Chưa có dữ liệu đơn hàng.</div>
        ) : (
          segments.map((seg) => (
            <div key={seg.label} className="donut-legend-item">
              <span className="donut-dot" style={{ background: seg.color }} />
              <span className="donut-legend-label">{seg.label}</span>
              <span className="donut-legend-value">{seg.pct.toFixed(1)}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DonutChart;
