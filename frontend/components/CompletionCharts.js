"use client";

import { useId } from "react";

const palette = ["var(--mint)", "var(--amber)", "var(--coral)"];

export function CompletionDonut({ values, centerLabel = "Tasks" }) {
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return <div className="dashboard-empty-chart">No task data in this period yet.</div>;
  }

  return <div className="flex flex-col items-center">
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full" role="img" aria-label={`${total} tasks by status`}>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--field)" strokeWidth="16"/>
        <g transform="rotate(-90 80 80)">
          {values.filter((item) => item.value > 0).map((item, index) => {
            const length = item.value / total * circumference;
            const segment = <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={item.color || palette[index % palette.length]}
              strokeWidth="16"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            ><title>{item.label}: {item.value}</title></circle>;
            offset += length;
            return segment;
          })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-serif text-3xl tabular-nums">{total}</span>
        <span className="dashboard-stat-label">{centerLabel}</span>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {values.map((item, index) => <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || palette[index % palette.length] }}/>
        {item.label} <span className="font-mono text-gray-500">{item.value}</span>
      </span>)}
    </div>
  </div>;
}

export function CompletionTrend({ rows, emptyMessage = "Complete a task to start building your productivity history." }) {
  const gradientId = `completion-fill-${useId().replace(/:/g, "")}`;
  if (!rows?.length || rows.every((row) => row.total === 0)) {
    return <div className="dashboard-empty-chart">{emptyMessage}</div>;
  }

  const width = 640;
  const height = 220;
  const left = 38;
  const right = 14;
  const top = 12;
  const bottom = 32;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;
  const points = rows.map((row, index) => ({
    x: rows.length === 1 ? left + graphWidth / 2 : left + index * graphWidth / (rows.length - 1),
    y: top + (100 - row.completion_percentage) / 100 * graphHeight,
    row,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${path} L${points.at(-1).x},${top + graphHeight} L${points[0].x},${top + graphHeight} Z`;
  const labels = rows.length > 7
    ? points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0)
    : points;

  return <div className="w-full overflow-hidden">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Task completion percentage over time">
      <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--mint)" stopOpacity="0.2"/><stop offset="100%" stopColor="var(--mint)" stopOpacity="0"/></linearGradient></defs>
      {[0, 25, 50, 75, 100].map((value) => {
        const y = top + (100 - value) / 100 * graphHeight;
        return <g key={value}><line x1={left} x2={width - right} y1={y} y2={y} className="dashboard-chart-grid"/><text x={left - 8} y={y + 3} textAnchor="end" className="dashboard-chart-label">{value}%</text></g>;
      })}
      <path d={area} fill={`url(#${gradientId})`}/>
      <path d={path} fill="none" stroke="var(--mint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((point) => <circle key={point.row.period} cx={point.x} cy={point.y} r="4" fill="var(--surface)" stroke="var(--mint)" strokeWidth="2"><title>{point.row.period}: {point.row.completion_percentage}% complete ({point.row.completed}/{point.row.total})</title></circle>)}
      {labels.map((point) => <text key={`label-${point.row.period}`} x={point.x} y={height - 8} textAnchor="middle" className="dashboard-chart-label">{point.row.period}</text>)}
    </svg>
  </div>;
}
