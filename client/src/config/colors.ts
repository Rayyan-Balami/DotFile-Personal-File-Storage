export type ColorOption =
  // Classic colors
  | "default"
  | "blue"
  | "fire"
  | "lush"
  | "sunshine"
  | "violet"
  | "tangerine"
  // Gen Z colors (vibrant/mixed)
  | "minty"
  | "coralPop"
  | "lavenderDream"
  | "rosebud"
  | "tealWave"
  | "candyFloss"
  | "deepSea"
  // Premium colors
  | "blingGold"
  | "emeraldCity"
  | "midnightIndigo"
  | "royalViolet"
  | "sunsetGlow"
  | "aqua"
  | "bubblegum";

export interface ColorDefinition {
  primary: string;
  secondary: string;
}

export const colorMap: Record<ColorOption, ColorDefinition> = {
  // Classic colors - timeless and traditional
  default: { primary: "#FFA000", secondary: "#FFCA28" },
  blue: { primary: "#2563eb", secondary: "#60a5fa" },
  fire: { primary: "#dc2626", secondary: "#f87171" }, // red
  lush: { primary: "#16a34a", secondary: "#4ade80" }, // green
  sunshine: { primary: "#eab308", secondary: "#facc15" }, // yellow
  violet: { primary: "#9333ea", secondary: "#c084fc" },
  tangerine: { primary: "#ea580c", secondary: "#fb923c" }, // orange

  // Gen Z colors - vibrant and trendy
  minty: { primary: "#00BFA5", secondary: "#1DE9B6" }, // mint
  coralPop: { primary: "#FF6B6B", secondary: "#FF9E9E" }, // coral
  lavenderDream: { primary: "#9C27B0", secondary: "#BA68C8" }, // lavender
  rosebud: { primary: "#e11d48", secondary: "#f43f5e" }, // rose
  tealWave: { primary: "#0d9488", secondary: "#2dd4bf" }, // teal
  candyFloss: { primary: "#FF69B4", secondary: "#FFB6C1" }, // candy
  deepSea: { primary: "#00BCD4", secondary: "#4DD0E1" }, // ocean

  // Premium colors - sophisticated and rich
  blingGold: { primary: "#FFD700", secondary: "#FFE44D" }, // gold
  emeraldCity: { primary: "#047857", secondary: "#34d399" }, // emerald
  midnightIndigo: { primary: "#4f46e5", secondary: "#818cf8" }, // indigo
  royalViolet: { primary: "#8b5cf6", secondary: "#a78bfa" }, // violet
  sunsetGlow: { primary: "#FF7043", secondary: "#FFAB91" }, // sunset
  aqua: { primary: "#0891b2", secondary: "#22d3ee" }, // cyan
  bubblegum: { primary: "#db2777", secondary: "#f472b6" }, // pink
};

// Returns a Tailwind class if it's a known color, otherwise uses inline styles
export const getBgColor = (color: ColorOption) => {
  return colorMap[color]
    ? { backgroundColor: colorMap[color].primary }
    : { backgroundColor: color };
};

export const getFillColor = (color: ColorOption) => {
  return colorMap[color] ? { fill: colorMap[color].primary } : { fill: color };
};
