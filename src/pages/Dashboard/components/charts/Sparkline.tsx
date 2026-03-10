import type { SparklineProps } from "../../types";

const Sparkline = ({
  data,
  color,
  width = 120,
  height = 42,
}: SparklineProps) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) => height - 4 - ((v - min) / range) * (height - 8);
  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const area = `${toX(0)},${height} ${points} ${toX(data.length - 1)},${height}`;
  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
