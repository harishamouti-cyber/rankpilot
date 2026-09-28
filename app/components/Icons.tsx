import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * SlidersHorizontalIcon:
 * Minimalist, refined sliders icon inspired by Lucide & Radix UI.
 * 1.5px optical stroke weight, perfectly balanced for 16px actions.
 */
export const SlidersHorizontalIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-sliders ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <line x1="21" x2="14" y1="4" y2="4" />
    <line x1="10" x2="3" y1="4" y2="4" />
    <line x1="21" x2="12" y1="12" y2="12" />
    <line x1="8" x2="3" y1="12" y2="12" />
    <line x1="21" x2="16" y1="20" y2="20" />
    <line x1="12" x2="3" y1="20" y2="20" />
    <line x1="14" x2="14" y1="2" y2="6" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="16" x2="16" y1="18" y2="22" />
  </svg>
);

/**
 * LayersIcon:
 * Clean, geometric layered sheets icon for bulk catalog operations.
 */
export const LayersIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-layers ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

/**
 * WandMinimalIcon:
 * Refined geometric wand with 1.5px stroke width and delicate angled spark dot.
 * Replaces cartoonish sparkle/magic stars with high-end 21st.dev aesthetic.
 */
export const WandMinimalIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-wand ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="m15 4 5 5L7.5 21.5a2.12 2.12 0 0 1-3-3L15 4Z" />
    <path d="m13 6 3 3" />
    <path d="M9 2v3" />
    <path d="M2 9h3" />
    <path d="m4 4 2 2" />
  </svg>
);

/**
 * SparklesMinimalIcon:
 * Minimal 4-point micro-sparkle for clean AI touches without cartoonish fluff.
 */
export const SparklesMinimalIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-sparkles ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    <path d="M5 3v4" />
    <path d="M3 5h4" />
  </svg>
);

/**
 * BoltMinimalIcon:
 * Clean, geometric 1.5px lightning glyph without bloated cartoon shapes.
 */
export const BoltMinimalIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-bolt ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/**
 * ArrowRightMinimalIcon:
 * Minimal forward arrow with subtle hover micro-nudge.
 */
export const ArrowRightMinimalIcon: React.FC<IconProps> = ({
  size = 16,
  className = "",
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`rankpilot-icon rankpilot-icon-arrow ${className}`}
    style={{ ...style }}
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
