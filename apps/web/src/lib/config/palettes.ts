/**
 * Palette system — each palette is a complete set of design tokens.
 * One palette ID per shop; users can switch from the Appearance settings.
 */

export interface Palette {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  light: Tokens;
  dark: Tokens;
}

export interface Tokens {
  bg: string;
  surface: string;
  surface2: string;
  inset: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  primary: string;
  primaryDim: string;
  primaryFg: string;
  primaryMid: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarActive: string;
  sidebarAccent: string;
}

/** Convert a hex color to HSL space-separated string (e.g. "240 10% 97%") */
export function hexToHsl(hex: string): string {
  // Handle rgba() strings — return as-is (not convertible to simple HSL)
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) return hex;

  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h2 = 0,
    s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h2 = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h2 = ((b - r) / d + 2) / 6;
    else h2 = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h2 * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Map palette token names to CSS variable names used in app.css */
const TOKEN_TO_CSS_VAR: Record<string, string> = {
  bg: "--background",
  surface: "--card",
  surface2: "--secondary",
  inset: "--muted",
  border: "--border",
  text: "--foreground",
  text2: "--muted-foreground", // approximate mapping
  primary: "--primary",
  primaryFg: "--primary-foreground",
  primaryMid: "--ring",
  sidebarBg: "--sidebar-bg",
  sidebarText: "--sidebar-text",
  sidebarMuted: "--sidebar-muted",
  sidebarActive: "--sidebar-active",
  sidebarAccent: "--sidebar-accent",
};

const mint = "#10B981";
const mintDark = "#34D399";

export const PALETTES: Palette[] = [
  {
    id: "graphite-mint",
    name: "Graphite & Mint",
    tagline: "Cool, fintech-modern",
    accent: mint,
    light: {
      bg: "#F7F7F8",
      surface: "#FFFFFF",
      surface2: "#F1F1F3",
      inset: "#ECECEE",
      border: "#E4E4E7",
      text: "#0B0B0F",
      text2: "#3F3F46",
      text3: "#71717A",
      primary: "#0B0B0F",
      primaryDim: "rgba(11,11,15,0.06)",
      primaryFg: "#FFFFFF",
      primaryMid: "#27272A",
      sidebarBg: "#0B0B0F",
      sidebarText: "#FAFAFA",
      sidebarMuted: "#71717A",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: mint,
    },
    dark: {
      bg: "#08080A",
      surface: "#111114",
      surface2: "#18181B",
      inset: "#0E0E10",
      border: "#27272A",
      text: "#FAFAFA",
      text2: "#A1A1AA",
      text3: "#71717A",
      primary: "#FAFAFA",
      primaryDim: "rgba(250,250,250,0.06)",
      primaryFg: "#0B0B0F",
      primaryMid: "#D4D4D8",
      sidebarBg: "#08080A",
      sidebarText: "#FAFAFA",
      sidebarMuted: "#52525B",
      sidebarActive: "rgba(255,255,255,0.05)",
      sidebarAccent: mintDark,
    },
  },
  {
    id: "ink-gold",
    name: "Ink & Gold",
    tagline: "Editorial, boutique",
    accent: "#C9A875",
    light: {
      bg: "#FAF8F4",
      surface: "#FFFFFF",
      surface2: "#F2EEE7",
      inset: "#EBE5DA",
      border: "#E5DFD1",
      text: "#1A1814",
      text2: "#4A463E",
      text3: "#8A857A",
      primary: "#1A1814",
      primaryDim: "rgba(26,24,20,0.05)",
      primaryFg: "#FAF8F4",
      primaryMid: "#36322C",
      sidebarBg: "#1A1814",
      sidebarText: "#FAF8F4",
      sidebarMuted: "#8A857A",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#C9A875",
    },
    dark: {
      bg: "#121110",
      surface: "#1C1A18",
      surface2: "#252220",
      inset: "#161412",
      border: "#2D2A26",
      text: "#F2EEE7",
      text2: "#B8B2A6",
      text3: "#7A7468",
      primary: "#F2EEE7",
      primaryDim: "rgba(242,238,231,0.06)",
      primaryFg: "#121110",
      primaryMid: "#D8D2C6",
      sidebarBg: "#0E0D0C",
      sidebarText: "#F2EEE7",
      sidebarMuted: "#5A554D",
      sidebarActive: "rgba(255,255,255,0.05)",
      sidebarAccent: "#C9A875",
    },
  },
  {
    id: "mist-violet",
    name: "Mist & Violet",
    tagline: "Soft magenta",
    accent: "#A855F7",
    light: {
      bg: "#FAF5FF",
      surface: "#FFFFFF",
      surface2: "#F0E4FC",
      inset: "#E8D8F8",
      border: "#D8C4F0",
      text: "#1A0840",
      text2: "#401878",
      text3: "#7040A8",
      primary: "#9333EA",
      primaryDim: "rgba(147,51,234,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#7C3AED",
      sidebarBg: "#1A0840",
      sidebarText: "#F0E8FF",
      sidebarMuted: "#7040A8",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#C084FC",
    },
    dark: {
      bg: "#10081C",
      surface: "#1A0E28",
      surface2: "#221434",
      inset: "#160C22",
      border: "#302048",
      text: "#F4EEFF",
      text2: "#B8A0D8",
      text3: "#7040A8",
      primary: "#C084FC",
      primaryDim: "rgba(192,132,252,0.10)",
      primaryFg: "#10081C",
      primaryMid: "#A855F7",
      sidebarBg: "#0C0614",
      sidebarText: "#F4EEFF",
      sidebarMuted: "#503080",
      sidebarActive: "rgba(192,132,252,0.08)",
      sidebarAccent: "#C084FC",
    },
  },
  {
    id: "ocean-cobalt",
    name: "Ocean Cobalt",
    tagline: "Coastal, airy",
    accent: "#06B6D4",
    light: {
      bg: "#F0FBFD",
      surface: "#FFFFFF",
      surface2: "#E0F4F8",
      inset: "#CCEEF4",
      border: "#B0E0EC",
      text: "#0A2530",
      text2: "#1E5060",
      text3: "#4A8090",
      primary: "#0891B2",
      primaryDim: "rgba(8,145,178,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#0E7490",
      sidebarBg: "#0A2530",
      sidebarText: "#E0F4F8",
      sidebarMuted: "#4A8090",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#22D3EE",
    },
    dark: {
      bg: "#061618",
      surface: "#0C2428",
      surface2: "#103038",
      inset: "#081C20",
      border: "#1A4048",
      text: "#E0F4F8",
      text2: "#80B8C8",
      text3: "#4A8090",
      primary: "#22D3EE",
      primaryDim: "rgba(34,211,238,0.10)",
      primaryFg: "#061618",
      primaryMid: "#06B6D4",
      sidebarBg: "#040E10",
      sidebarText: "#E0F4F8",
      sidebarMuted: "#3A6068",
      sidebarActive: "rgba(34,211,238,0.08)",
      sidebarAccent: "#22D3EE",
    },
  },
  {
    id: "forest-linen",
    name: "Forest & Linen",
    tagline: "Olive, muted",
    accent: "#65A30D",
    light: {
      bg: "#F6F7F0",
      surface: "#FAFBF8",
      surface2: "#EAEEE0",
      inset: "#DEE4CE",
      border: "#C8D4A8",
      text: "#1A2808",
      text2: "#3A5020",
      text3: "#6A8040",
      primary: "#4D7C0F",
      primaryDim: "rgba(77,124,15,0.08)",
      primaryFg: "#FAFBF8",
      primaryMid: "#3F6212",
      sidebarBg: "#1A2808",
      sidebarText: "#E8F0D8",
      sidebarMuted: "#6A8040",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#84CC16",
    },
    dark: {
      bg: "#0E1208",
      surface: "#181E10",
      surface2: "#202818",
      inset: "#141A0C",
      border: "#303C20",
      text: "#E8F0D8",
      text2: "#A0B878",
      text3: "#6A8040",
      primary: "#84CC16",
      primaryDim: "rgba(132,204,22,0.10)",
      primaryFg: "#0E1208",
      primaryMid: "#65A30D",
      sidebarBg: "#080C04",
      sidebarText: "#E8F0D8",
      sidebarMuted: "#4A6030",
      sidebarActive: "rgba(132,204,22,0.08)",
      sidebarAccent: "#84CC16",
    },
  },
  {
    id: "rose-clay",
    name: "Rose & Clay",
    tagline: "Deep rose",
    accent: "#E11D48",
    light: {
      bg: "#FFF5F5",
      surface: "#FFFFFF",
      surface2: "#FFE8E8",
      inset: "#FFD4D4",
      border: "#FFB8B8",
      text: "#280808",
      text2: "#581818",
      text3: "#883838",
      primary: "#BE123C",
      primaryDim: "rgba(190,18,60,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#9F1239",
      sidebarBg: "#280808",
      sidebarText: "#FFF0F0",
      sidebarMuted: "#883838",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#FB7185",
    },
    dark: {
      bg: "#180608",
      surface: "#240C10",
      surface2: "#301418",
      inset: "#1E0A0C",
      border: "#402028",
      text: "#FFF0F0",
      text2: "#C88898",
      text3: "#883848",
      primary: "#FB7185",
      primaryDim: "rgba(251,113,133,0.10)",
      primaryFg: "#180608",
      primaryMid: "#E11D48",
      sidebarBg: "#100406",
      sidebarText: "#FFF0F0",
      sidebarMuted: "#5A2830",
      sidebarActive: "rgba(251,113,133,0.08)",
      sidebarAccent: "#FB7185",
    },
  },
  {
    id: "sandstone",
    name: "Sandstone",
    tagline: "Warm sand",
    accent: "#D97706",
    light: {
      bg: "#FFFBF0",
      surface: "#FFFFFF",
      surface2: "#FFF3E0",
      inset: "#FFE8C8",
      border: "#FFD8A8",
      text: "#302008",
      text2: "#604818",
      text3: "#907038",
      primary: "#B45309",
      primaryDim: "rgba(180,83,9,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#92400E",
      sidebarBg: "#302008",
      sidebarText: "#FFFAF0",
      sidebarMuted: "#907038",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#FBBF24",
    },
    dark: {
      bg: "#1A1208",
      surface: "#241A0E",
      surface2: "#2E2214",
      inset: "#1E140A",
      border: "#3C2C18",
      text: "#FFF8E8",
      text2: "#C8A870",
      text3: "#907040",
      primary: "#FBBF24",
      primaryDim: "rgba(251,191,36,0.10)",
      primaryFg: "#1A1208",
      primaryMid: "#D97706",
      sidebarBg: "#140E06",
      sidebarText: "#FFF8E8",
      sidebarMuted: "#5A4828",
      sidebarActive: "rgba(251,191,36,0.08)",
      sidebarAccent: "#FBBF24",
    },
  },
  {
    id: "slate-mono",
    name: "Slate Mono",
    tagline: "True grayscale, no colour",
    accent: "#52525B",
    light: {
      bg: "#F4F4F5",
      surface: "#FFFFFF",
      surface2: "#E4E4E7",
      inset: "#D4D4D8",
      border: "#D4D4D8",
      text: "#09090B",
      text2: "#3F3F46",
      text3: "#71717A",
      primary: "#18181B",
      primaryDim: "rgba(24,24,27,0.06)",
      primaryFg: "#FAFAFA",
      primaryMid: "#27272A",
      sidebarBg: "#09090B",
      sidebarText: "#FAFAFA",
      sidebarMuted: "#71717A",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#A1A1AA",
    },
    dark: {
      bg: "#09090B",
      surface: "#131316",
      surface2: "#1C1C20",
      inset: "#0E0E11",
      border: "#27272A",
      text: "#FAFAFA",
      text2: "#A1A1AA",
      text3: "#71717A",
      primary: "#FAFAFA",
      primaryDim: "rgba(250,250,250,0.06)",
      primaryFg: "#09090B",
      primaryMid: "#D4D4D8",
      sidebarBg: "#050507",
      sidebarText: "#FAFAFA",
      sidebarMuted: "#52525B",
      sidebarActive: "rgba(255,255,255,0.05)",
      sidebarAccent: "#A1A1AA",
    },
  },
  {
    id: "sapphire",
    name: "Sapphire",
    tagline: "Deep indigo",
    accent: "#6366F1",
    light: {
      bg: "#F2F0FF",
      surface: "#FFFFFF",
      surface2: "#E8E5FC",
      inset: "#DBD8F8",
      border: "#C8C4F0",
      text: "#1A1050",
      text2: "#382880",
      text3: "#5848B0",
      primary: "#4F46E5",
      primaryDim: "rgba(79,70,229,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#4338CA",
      sidebarBg: "#1A1050",
      sidebarText: "#EEECFF",
      sidebarMuted: "#5848B0",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#818CF8",
    },
    dark: {
      bg: "#0E0A20",
      surface: "#161030",
      surface2: "#1E163C",
      inset: "#120E28",
      border: "#2E2450",
      text: "#F0ECFF",
      text2: "#B0A8D8",
      text3: "#5848B0",
      primary: "#818CF8",
      primaryDim: "rgba(129,140,248,0.10)",
      primaryFg: "#0E0A20",
      primaryMid: "#6366F1",
      sidebarBg: "#0A0818",
      sidebarText: "#F0ECFF",
      sidebarMuted: "#403870",
      sidebarActive: "rgba(129,140,248,0.08)",
      sidebarAccent: "#818CF8",
    },
  },
  {
    id: "sunset-coral",
    name: "Sunset Coral",
    tagline: "Warm orange",
    accent: "#F97316",
    light: {
      bg: "#FFFAF5",
      surface: "#FFFFFF",
      surface2: "#FFF0E0",
      inset: "#FFE4CC",
      border: "#FFD4B0",
      text: "#301808",
      text2: "#603820",
      text3: "#906040",
      primary: "#EA580C",
      primaryDim: "rgba(234,88,12,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#C2410C",
      sidebarBg: "#301808",
      sidebarText: "#FFFAF5",
      sidebarMuted: "#906040",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#FB923C",
    },
    dark: {
      bg: "#1C0E06",
      surface: "#281610",
      surface2: "#321E16",
      inset: "#20120A",
      border: "#402A1A",
      text: "#FFF0E0",
      text2: "#D0A888",
      text3: "#906848",
      primary: "#FB923C",
      primaryDim: "rgba(251,146,60,0.10)",
      primaryFg: "#1C0E06",
      primaryMid: "#F97316",
      sidebarBg: "#140A04",
      sidebarText: "#FFF0E0",
      sidebarMuted: "#5A4030",
      sidebarActive: "rgba(251,146,60,0.08)",
      sidebarAccent: "#FB923C",
    },
  },
  {
    id: "emerald-noir",
    name: "Emerald Noir",
    tagline: "Teal, luxe",
    accent: "#14B8A6",
    light: {
      bg: "#EFFAF9",
      surface: "#FFFFFF",
      surface2: "#D4F0EC",
      inset: "#B8E6E0",
      border: "#98D8D0",
      text: "#082828",
      text2: "#185858",
      text3: "#388888",
      primary: "#0D9488",
      primaryDim: "rgba(13,148,136,0.08)",
      primaryFg: "#FFFFFF",
      primaryMid: "#0F766E",
      sidebarBg: "#082828",
      sidebarText: "#E0F5F2",
      sidebarMuted: "#388888",
      sidebarActive: "rgba(255,255,255,0.06)",
      sidebarAccent: "#2DD4BF",
    },
    dark: {
      bg: "#061614",
      surface: "#0C2422",
      surface2: "#10302C",
      inset: "#081C1A",
      border: "#1A3C38",
      text: "#E0F5F2",
      text2: "#80B8B0",
      text3: "#388888",
      primary: "#2DD4BF",
      primaryDim: "rgba(45,212,191,0.10)",
      primaryFg: "#061614",
      primaryMid: "#14B8A6",
      sidebarBg: "#040E0C",
      sidebarText: "#E0F5F2",
      sidebarMuted: "#2A5850",
      sidebarActive: "rgba(45,212,191,0.08)",
      sidebarAccent: "#2DD4BF",
    },
  },
];

export const DEFAULT_PALETTE = PALETTES[0];

export function getPalette(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE;
}

/**
 * Apply a palette's tokens as CSS custom properties on the document root.
 * Converts hex values to HSL space-separated format for Tailwind/shadcn compatibility.
 */
export function applyPaletteTokens(palette: Palette, isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tokens = isDark ? palette.dark : palette.light;

  for (const [key, value] of Object.entries(tokens)) {
    const cssVar = TOKEN_TO_CSS_VAR[key];
    if (cssVar) {
      // Convert hex to HSL for CSS variables that expect HSL format
      if (value.startsWith("#")) {
        root.style.setProperty(cssVar, hexToHsl(value));
      } else {
        // rgba() or other formats — use as-is
        root.style.setProperty(cssVar, value);
      }
    }
  }
}
