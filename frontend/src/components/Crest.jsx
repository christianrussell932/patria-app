/**
 * Crest — small monogram used as occasional editorial divider.
 * Restrained engraved feel. Stay minimal — never decorative excess.
 */
export function Crest({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      {/* Inner square (rotated) — heraldic frame */}
      <rect x="6.5" y="6.5" width="11" height="11" stroke="currentColor" strokeWidth="0.5" opacity="0.35" transform="rotate(45 12 12)" />
      {/* Center monogram "P" stem + cross-bar */}
      <path d="M10 7v10M10 7h2.5a2.5 2.5 0 010 5H10" stroke="currentColor" strokeWidth="0.9" strokeLinecap="square" fill="none" />
      {/* Small cross above */}
      <path d="M12 3v2M11 4h2" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

/** Editorial divider: thin rule with centered crest. Use sparingly. */
export function CrestDivider({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 my-10 ${className}`} aria-hidden="true">
      <div className="flex-1 h-px bg-border" />
      <Crest size={16} className="text-muted-foreground/70" />
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/**
 * Sacred Heart engraving — single-line monochrome SVG with a restrained oxblood accent.
 * Reverent, never kitsch. Use only on the Sacred Heart tab hero.
 */
export function SacredHeartEngraving({ size = 220, className = "" }) {
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      className={className}
      aria-hidden="true"
    >
      {/* Heart outline */}
      <path
        d="M100 210
           C 50 175, 15 145, 15 100
           C 15 70, 40 50, 65 50
           C 82 50, 95 60, 100 75
           C 105 60, 118 50, 135 50
           C 160 50, 185 70, 185 100
           C 185 145, 150 175, 100 210 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {/* Inner heart shadow (very thin) */}
      <path
        d="M100 200 C 55 168, 22 142, 22 100 C 22 75, 43 57, 65 57 C 82 57, 95 67, 100 82
           C 105 67, 118 57, 135 57 C 157 57, 178 75, 178 100 C 178 142, 145 168, 100 200 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.45"
        opacity="0.55"
      />
      {/* Cross rising from top */}
      <path d="M100 50 L100 8 M86 22 L114 22" stroke="currentColor" strokeWidth="1.2" />
      {/* Crown of thorns — three loops around heart */}
      <ellipse cx="100" cy="120" rx="80" ry="36" stroke="currentColor" strokeWidth="0.6" fill="none" transform="rotate(-8 100 120)" opacity="0.55" />
      {/* Rays — narrow, sparse */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = -75 + i * (150 / 11);
        const rad = (a * Math.PI) / 180;
        const r1 = 110;
        const r2 = 128;
        const x1 = 100 + r1 * Math.sin(rad);
        const y1 = 110 - r1 * Math.cos(rad);
        const x2 = 100 + r2 * Math.sin(rad);
        const y2 = 110 - r2 * Math.cos(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.4" opacity="0.4" />;
      })}
      {/* Flame at top — single line */}
      <path
        d="M100 18 C 96 8, 104 4, 100 -4"
        stroke="currentColor"
        strokeWidth="0.7"
        fill="none"
        opacity="0.7"
      />
      {/* Restrained oxblood drop — the only color */}
      <circle cx="100" cy="135" r="2.6" fill="hsl(var(--liturgical-red))" />
      <path d="M100 138 Q 99 146, 100 152 Q 101 146, 100 138 Z" fill="hsl(var(--liturgical-red))" opacity="0.85" />
    </svg>
  );
}
