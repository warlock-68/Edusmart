// Reusable horizontal bar chart (plain divs, no library).
// rows: [{ label: 'Form 2: Atoms', value: 12 }]
// suffix: text after the number, e.g. '%'
// max: value that equals a full bar (defaults to the largest value in rows)
// colorFor: optional function (value) => color; otherwise a single blue is used
function BarChart({ title, rows, suffix = '', max, colorFor }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const cleaned = rows.map((row, i) => {
    const raw = Number(row.value);
    return {
      id: i,
      label: String(row.label ?? ''),
      value: Number.isFinite(raw) && raw >= 0 ? raw : 0,
    };
  });

  const fullBar = max ?? Math.max(...cleaned.map((r) => r.value), 1);

  return (
    <div className="mb-8" role="img" aria-label={`Bar chart: ${title}`}>
      {title && <h3 className="text-lg mb-3">{title}</h3>}

      {cleaned.map((row) => {
        const width = Math.min(100, (row.value / fullBar) * 100);
        const color = colorFor ? colorFor(row.value) : '#2563eb';
        return (
          <div key={row.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                marginBottom: 4,
                gap: 12,
              }}
            >
              <span>{row.label}</span>
              <strong>
                {Math.round(row.value)}
                {suffix}
              </strong>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 6, height: 14, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${width}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 6,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BarChart;
