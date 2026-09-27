import React from "react";
import { C } from "../theme";

// 線画アイコン（24x24 基準）。size / color / strokeWidth で調整。
type P = { size?: number; color?: string; sw?: number; style?: React.CSSProperties };

const Svg: React.FC<P & { children: React.ReactNode }> = ({ size = 32, color = C.blue, sw = 1.8, style, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {children}
  </svg>
);

export const IconMic: React.FC<P> = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
  </Svg>
);

export const IconChats: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3.5 4.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8l-3 2.5V12H3.5A1.5 1.5 0 0 1 2 10.5V6a1.5 1.5 0 0 1 1.5-1.5z" />
    <path d="M17 8.5h3.5A1.5 1.5 0 0 1 22 10v4.5a1.5 1.5 0 0 1-1.5 1.5H19v2.5L16 16h-4.5a1.5 1.5 0 0 1-1.5-1.5v-.5" />
    <path d="M6 8.3h.01M8.5 8.3h.01M11 8.3h.01" />
  </Svg>
);

export const IconWave: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3 10v4M7 7v10M11 4v16M15 7v10M19 9v6" />
  </Svg>
);

export const IconDoc: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M6 2.5h8l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5z" />
    <path d="M14 2.5V7h4.5M8 12h8M8 15.5h8M8 8.5h3" />
  </Svg>
);

export const IconSpeaker: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
);

export const IconBubble: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3h-.5A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z" />
    <path d="M8 11h.01M12 11h.01M16 11h.01" />
  </Svg>
);

export const IconLaugh: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M6.5 8.5q1.5-2 3 0M14.5 8.5q1.5-2 3 0" />
    <path d="M6 13h12a6 6 0 0 1-12 0z" />
  </Svg>
);

export const IconSigh: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3 8c4-3 8-3 11 0s3 7-1 8" />
    <path d="M15.5 13.5 13 16l2.8 1.8" />
  </Svg>
);

export const IconClock: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const IconCopy: React.FC<P> = (p) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12.5" height="12.5" rx="2" />
    <path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9.5A1.5 1.5 0 0 0 5 16h3" />
  </Svg>
);

export const IconPersonVoice: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
    <path d="M17 5.5a4 4 0 0 1 0 5M19.5 3.5a7 7 0 0 1 0 9" />
  </Svg>
);

export const IconShield: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M12 2.5 20 5.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z" />
  </Svg>
);

export const IconCheckSquare: React.FC<P> = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="m7.5 12.5 3 3 6-6.5" />
  </Svg>
);

export const IconTrophy: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.8 3.5M17 6h2.5a2.5 2.5 0 0 1-2.8 3.5M12 14v3.5M8.5 20.5h7M9.5 20.5v-1a2.5 2.5 0 0 1 5 0v1" />
  </Svg>
);

export const IconInfo: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5h.01" />
  </Svg>
);

export const IconArrowRight: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M3 12h17M14.5 6.5 20 12l-5.5 5.5" />
  </Svg>
);

export const IconArrowDown: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M12 3v17M6.5 14.5 12 20l5.5-5.5" />
  </Svg>
);

export const IconUser: React.FC<P> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconSparkle: React.FC<P> = (p) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </Svg>
);
