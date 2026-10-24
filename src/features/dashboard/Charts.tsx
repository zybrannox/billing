import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { formatRupeesWhole as money } from "../../format/money";
import { type RevenuePoint, type StatusCount } from "./types";

// ---------------------------------------------------------------------
// Revenue bar chart - dark rounded bars, active period highlighted
// ---------------------------------------------------------------------
// A smooth gradient-filled area chart, not bars - the bar version read as
// a fairly plain "spreadsheet chart"; a curved line with a soft fill below
// it and a glowing current-period marker is the more premium, editorial-
// analytics look this redesign is going for, and it's a more natural way
// to read a single continuous trend (revenue over time) than discrete
// columns are. Hover-to-inspect a period is preserved from the old bar
// chart, not dropped.
export function RevenueAreaChart({ data }: { data: RevenuePoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered ?? data.length - 1;
  const width = 640;
  const height = 190;
  const chartTop = 28;
  const chartBottom = height - 30;
  const chartHeight = chartBottom - chartTop;
  // Horizontal inset for the plotted points - without it, the first/last
  // point sits exactly on x=0/x=width, and their period-label text (which
  // is centered on that x via textAnchor="middle") ends up half outside
  // the viewBox, silently clipped. The gridlines and fill below still run
  // edge to edge; only the actual data points/labels are inset.
  const chartLeft = 28;
  const chartRight = 28;
  const innerWidth = width - chartLeft - chartRight;
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const n = Math.max(1, data.length - 1);

  const points = data.map((d, i) => ({
    x: n === 0 ? width / 2 : chartLeft + (i / n) * innerWidth,
    y: chartBottom - (d.revenue / max) * chartHeight,
    d,
  }));

  // Smooth cubic-bezier line through the points (horizontal-offset control
  // points, the standard trick for a curve that never overshoots between
  // two data points) rather than sharp straight segments.
  const linePath = points.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midX = (prev.x + p.x) / 2;
    return `${path} C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
  }, "");
  const areaPath = `${linePath} L ${width} ${chartBottom} L 0 ${chartBottom} Z`;

  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            y1={chartBottom - chartHeight * f}
            x2={width}
            y2={chartBottom - chartHeight * f}
            stroke="var(--slate-100)"
            strokeWidth={f === 0 ? 2 : 1}
          />
        ))}
        <path d={areaPath} fill="url(#revenueAreaFill)" />
        <path d={linePath} fill="none" stroke="var(--blue-600)" strokeWidth={2.5} strokeLinecap="round" />
        {points.map((p, i) => {
          const active = i === activeIdx;
          return (
            <g
              key={`${p.d.period}-${i}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Invisible full-height hit column, so hovering is easy to
                  land on even though the visible marker is small. Spans
                  the midpoint to each neighbor (full chart edge for the
                  first/last point), not a fixed width - correct
                  regardless of how the points themselves are spaced. */}
              <rect
                x={i === 0 ? 0 : (points[i - 1].x + p.x) / 2}
                y={chartTop}
                width={
                  (i === points.length - 1 ? width : (points[i + 1].x + p.x) / 2) -
                  (i === 0 ? 0 : (points[i - 1].x + p.x) / 2)
                }
                height={chartHeight}
                fill="transparent"
              />
              {active && (
                <line x1={p.x} y1={chartTop} x2={p.x} y2={chartBottom} stroke="var(--blue-200)" strokeWidth={1} strokeDasharray="3 3" />
              )}
              <circle cx={p.x} cy={p.y} r={active ? 5.5 : 3.5} fill="var(--white)" stroke="var(--blue-600)" strokeWidth={active ? 3 : 2} style={{ transition: "r 0.15s ease" }} />
              {active && (
                <text x={Math.min(Math.max(p.x, 40), width - 40)} y={Math.max(p.y - 14, 16)} textAnchor="middle" fontSize="12" fontWeight={800} fill="var(--slate-900)">
                  {money(p.d.revenue)}
                </text>
              )}
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                fontSize={data.length > 10 ? "9" : "11"}
                fontWeight={600}
                fill={active ? "var(--slate-900)" : "var(--slate-400)"}
              >
                {p.d.period}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

// ---------------------------------------------------------------------
// Status donut - a multi-segment ring (count-weighted arcs) with the
// total in the hub and a legend beside it. Used for both Print Status
// and Priority Mix so the two "how is the workload split up" cards read
// as a matched pair rather than two different chart styles.
// ---------------------------------------------------------------------
export function StatusDonut({
  data,
  colorFor,
  centerLabel,
}: {
  data: StatusCount[];
  colorFor: (label: string) => string;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 104;
  const stroke = 15;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
        No metric data available.
      </Typography>
    );
  }

  // Each segment's offset is every prior segment's share of the ring,
  // stacked in order - carried through reduce's own accumulator (not a
  // `let` reassigned from the callback) so this stays a pure computation
  // instead of a closure variable mutated across iterations.
  const { segments } = data.reduce<{
    segments: Array<StatusCount & { dash: number; offset: number; color: string; pct: number }>;
    cumulative: number;
  }>(
    (acc, d) => {
      const fraction = d.count / total;
      const dash = fraction * circumference;
      const offset = acc.cumulative * circumference;
      return {
        segments: [
          ...acc.segments,
          { ...d, dash, offset, color: colorFor(d.label), pct: Math.round(fraction * 100) },
        ],
        cumulative: acc.cumulative + fraction,
      };
    },
    { segments: [], cumulative: 0 },
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
      <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              // `stroke` moved into `style` rather than passed as a bare
              // SVG presentation attribute - s.color can now be a CSS
              // var(--x) reference (see getSemanticColor), and var()
              // resolution inside a presentation attribute isn't
              // guaranteed the way it is in an actual style context.
              style={{ transition: "stroke-dasharray 0.6s ease", stroke: s.color }}
            />
          ))}
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "var(--fs-5xl)", color: "var(--slate-900)", lineHeight: 1 }}>{total}</Typography>
          <Typography variant="caption" sx={{ color: "var(--slate-400)", fontSize: "var(--fs-2xs)", mt: 0.25 }}>{centerLabel}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, flex: 1, minWidth: 0 }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--slate-700)" }} noWrap>
                {s.label}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--slate-900)", flexShrink: 0 }}>
              {s.count}
              <Typography component="span" variant="caption" sx={{ color: "var(--slate-400)", fontWeight: 600 }}>
                {" "}({s.pct}%)
              </Typography>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
