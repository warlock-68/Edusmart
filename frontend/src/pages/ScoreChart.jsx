// Horizontal bar chart of average score per topic.
// Built with plain divs (no chart library to install). Data comes from /dashboard/weak-areas.
function barColor(percent) {
  if (percent < 40) return '#dc2626'; // red - needs a lot of work
  if (percent < 60) return '#f59e0b'; // amber - getting there
  return '#16a34a'; // green - close to the target
}

function ScoreChart({ areas }) {
  if (!Array.isArray(areas) || areas.length === 0) return null;

  const rows = areas
    .map((area) => {
      const raw = Number(area.avg_percentage);
      const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
      return {
        id: area.topic_id,
        label: `${area.grade}: ${area.topic}`,
        percent,
      };
    })
    .sort((a, b) => a.percent - b.percent); // weakest first

  return (
    <div className="mb-6" role="img" aria-label="Bar chart of average quiz score for each topic to revisit">
      <h3 className="text-lg mb-3">Your Scores at a Glance</h3>

      {rows.map((row) => (
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
            <strong>{Math.round(row.percent)}%</strong>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 6, height: 14, overflow: 'hidden' }}>
            <div
              style={{
                width: `${row.percent}%`,
                height: '100%',
                background: barColor(row.percent),
                borderRadius: 6,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      ))}

      <p style={{ fontSize: '0.8rem', marginTop: 8 }}>
        <span style={{ color: '#dc2626' }}>●</span> under 40%{' '}
        <span style={{ color: '#f59e0b' }}>●</span> 40-59%{' '}
        <span style={{ color: '#16a34a' }}>●</span> 60% and above
      </p>
    </div>
  );
}

export default ScoreChart;
