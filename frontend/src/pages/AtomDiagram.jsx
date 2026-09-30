// Draws a simple Bohr-model atom diagram from numbers (no HTML injection, just SVG).
const SHELL_CAPACITY = [2, 8, 8, 18];

function AtomDiagram({ diagram }) {
  if (!diagram) return null;

  const protons = Number(diagram.protons);
  const neutrons = Number(diagram.neutrons);
  const electrons = Number(diagram.electrons);
  const symbol = String(diagram.symbol || '').slice(0, 3);

  // Only draw if the numbers are sensible (elements 1-36 fit in 4 shells)
  const valid = [protons, neutrons, electrons].every(
    (n) => Number.isFinite(n) && n >= 0 && n <= 40
  );
  if (!valid || electrons > 36) return null;

  // Fill the shells: 2, 8, 8, 18
  const shells = [];
  let remaining = electrons;
  for (const capacity of SHELL_CAPACITY) {
    if (remaining <= 0) break;
    const inShell = Math.min(capacity, remaining);
    shells.push(inShell);
    remaining -= inShell;
  }

  const center = 150;
  const firstRadius = 55;
  const gap = 28;

  return (
    <div className="mb-6" style={{ textAlign: 'center' }}>
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label={`Atom diagram: ${protons} protons, ${neutrons} neutrons, ${electrons} electrons`}
        style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: 280 }}
      >
        {/* Electron shells and electrons */}
        {shells.map((count, i) => {
          const radius = firstRadius + i * gap;
          return (
            <g key={i}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              {Array.from({ length: count }).map((_, j) => {
                const angle = (2 * Math.PI * j) / count - Math.PI / 2;
                return (
                  <circle
                    key={j}
                    cx={center + radius * Math.cos(angle)}
                    cy={center + radius * Math.sin(angle)}
                    r="5"
                    fill="#2563eb"
                  />
                );
              })}
            </g>
          );
        })}

        {/* Nucleus */}
        <circle cx={center} cy={center} r="30" fill="#f59e0b" />
        <text
          x={center}
          y={center - 2}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#1f2937"
        >
          {symbol}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fontSize="10" fill="#1f2937">
          {protons}p {neutrons}n
        </text>
      </svg>

      <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
        <span style={{ color: '#f59e0b' }}>●</span> Nucleus ({protons} protons, {neutrons} neutrons){' '}
        <span style={{ color: '#2563eb' }}>●</span> Electrons ({electrons})
      </p>
    </div>
  );
}

export default AtomDiagram;
