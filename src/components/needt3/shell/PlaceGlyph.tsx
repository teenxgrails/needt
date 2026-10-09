import { SHELL_PLACES } from "./places";

/** Frozen Sidebar.jsx duotone marks; secondary places keep their route icon. */
export function PlaceGlyph({ id }: { id: string }) {
  const A = "var(--accent)",
    I = "var(--info)",
    S = "var(--success)",
    D = "var(--destructive)",
    W = "var(--surface-raised)",
    R = "var(--border)";
  const marks: Record<string, React.ReactNode> = {
    today: (
      <g>
        <path
          d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"
          fill={`color-mix(in oklch, ${A} 26%, transparent)`}
        />
        <path
          d="M2.6 11.6 12 3.6l9.4 8"
          fill="none"
          stroke={A}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="9.6" y="13.5" width="4.8" height="7" rx="1.2" fill={A} />
      </g>
    ),
    tasks: (
      <g>
        <rect x="3" y="3" width="18" height="18" rx="4.5" fill={A} />
        <path
          d="M7.6 12.3l3 3 5.8-6.4"
          fill="none"
          stroke={W}
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ),
    calendar: (
      <g>
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
          fill={W}
          stroke={R}
          strokeWidth="1"
        />
        <path d="M6 4h12a3 3 0 0 1 3 3v2H3V7a3 3 0 0 1 3-3z" fill={D} />
        <text
          x="12"
          y="18.4"
          textAnchor="middle"
          fontSize="8.6"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill="var(--text-primary)"
        >
          6
        </text>
      </g>
    ),
    mail: (
      <g>
        <rect x="2.5" y="5" width="19" height="14" rx="2.6" fill={I} />
        <path
          d="M3.6 6.6 12 12.8l8.4-6.2"
          fill="none"
          stroke={W}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    ),
    docs: (
      <g>
        <path
          d="M6 2.8h8.2L19 7.6V19.6A1.6 1.6 0 0 1 17.4 21.2H6A1.6 1.6 0 0 1 4.4 19.6V4.4A1.6 1.6 0 0 1 6 2.8z"
          fill={W}
          stroke={R}
          strokeWidth="1"
        />
        <path
          d="M14.2 2.8v4.8H19"
          fill="color-mix(in oklch, var(--text-primary) 8%, transparent)"
        />
        <rect x="7" y="10" width="8.5" height="1.9" rx=".95" fill={A} />
        <rect x="7" y="13.6" width="6" height="1.9" rx=".95" fill={S} />
        <rect x="7" y="17.2" width="7.4" height="1.9" rx=".95" fill={I} />
      </g>
    ),
  };
  if (!marks[id]) {
    const Icon = SHELL_PLACES.find((place) => place.id === id)?.icon;
    return Icon ? <Icon size={24} aria-hidden="true" /> : null;
  }
  return (
    <svg
      className="shell-place-glyph-svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {marks[id]}
    </svg>
  );
}
