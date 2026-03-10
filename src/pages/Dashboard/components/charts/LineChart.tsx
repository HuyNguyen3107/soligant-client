const LineChart = () => {
  const months = [
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
  ];
  const data = [18, 22, 25, 28, 32, 34, 31, 38, 44, 40, 46, 48];
  const W = 560,
    H = 200;
  const pad = { top: 10, right: 20, bottom: 30, left: 44 };
  const toX = (i: number) =>
    pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
  const toY = (v: number) =>
    H - pad.bottom - (v / 60) * (H - pad.top - pad.bottom);
  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = `${toX(0)},${toY(0)} ${points} ${toX(data.length - 1)},${toY(0)}`;

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto" }}
      >
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#731618" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#731618" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 15, 30, 45, 60].map((t) => (
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
              ${t}k
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#lineGrad)" />
        <polyline
          points={points}
          fill="none"
          stroke="#731618"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {months.map((m, i) => (
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
