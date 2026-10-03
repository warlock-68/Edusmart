// Small PDF document icon, tinted by Form (grade) so materials are easy to tell apart.
const GRADE_COLORS = {
  1: '#2563eb', // Form 1 - blue
  2: '#16a34a', // Form 2 - green
  3: '#7c3aed', // Form 3 - purple
  4: '#ea580c', // Form 4 - orange
};

function PdfBadge({ grade }) {
  const match = String(grade || '').match(/[1-4]/);
  const color = match ? GRADE_COLORS[match[0]] : '#6b7280';

  return (
    <svg
      viewBox="0 0 40 50"
      width="36"
      height="45"
      role="img"
      aria-label={`PDF document${grade ? `, ${grade}` : ''}`}
      style={{ flexShrink: 0 }}
    >
      {/* Page with folded corner */}
      <path
        d="M4 2 H26 L36 12 V46 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 Z"
        fill="#ffffff"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M26 2 V12 H36" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Text lines */}
      <rect x="10" y="18" width="20" height="2.5" rx="1" fill="#d1d5db" />
      <rect x="10" y="24" width="20" height="2.5" rx="1" fill="#d1d5db" />

      {/* PDF label band */}
      <rect x="4" y="32" width="32" height="12" fill={color} />
      <text
        x="20"
        y="41.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="bold"
        fill="#ffffff"
        fontFamily="Arial, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

export default PdfBadge;
