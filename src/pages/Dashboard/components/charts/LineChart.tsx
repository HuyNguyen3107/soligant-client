interface LineChartProps {
  labels: string[];
  data: number[];
  color: string;
  valueFormatter: (value: number) => string;
  isLoading?: boolean;
}

const LineChart = ({
  labels,
  data,
  color,
  valueFormatter,
  isLoading = false,
}: LineChartProps) => {
  const safeData = data.length > 0 ? data : [0];
  const maxData = Math.max(...safeData);
  const yMax = Math.max(maxData, 1);
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((index / 4) * yMax),
  );

  const W = 560,
    H = 200;
  const pad = { top: 10, right: 20, bottom: 30, left: 44 };
  const toX = (i: number) =>
    data.length <= 1
      ? pad.left
      : pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
  const toY = (v: number) =>
    H - pad.bottom - (v / yMax) * (H - pad.top - pad.bottom);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = `${toX(0)},${toY(0)} ${points} ${toX(data.length - 1)},${toY(0)}`;
  const gradId = `line-grad-${color.replace("#", "")}`;

  return (
    <div className="line-chart-wrap">
      {isLoading && (
        <div className="line-chart__loading">Đang tải dữ liệu...</div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={toY(t)}
              y2={toY(t)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={toY(t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#94a3b8"
            >
              {valueFormatter(t)}
            </text>
          </g>
        ))}
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {labels.map((m, i) => (
          <text
            key={m}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#94a3b8"
          >
            {m}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default LineChart;
