export type ColorOption = 
  // Classic colors
  'default' | 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange' | 
  // Gen Z colors (vibrant/mixed)
  'mint' | 'coral' | 'lavender' | 'rose' | 'teal' | 'candy' | 'ocean' |
  // Premium colors
  'gold' | 'emerald' | 'indigo' | 'violet' | 'sunset' | 'cyan' | 'pink';

export interface ColorDefinition {
  primary: string;
  secondary: string;
}

export const colorMap: Record<ColorOption, ColorDefinition> = {
  // Classic colors - timeless and traditional
  default: { primary: '#FFA000', secondary: '#FFCA28' },
  blue: { primary: '#2563eb', secondary: '#60a5fa' },
  red: { primary: '#dc2626', secondary: '#f87171' },
  green: { primary: '#16a34a', secondary: '#4ade80' },
  yellow: { primary: '#eab308', secondary: '#facc15' },
  purple: { primary: '#9333ea', secondary: '#c084fc' },
  orange: { primary: '#ea580c', secondary: '#fb923c' },
  
  // Gen Z colors - vibrant and trendy
  mint: { primary: '#00BFA5', secondary: '#1DE9B6' },
  coral: { primary: '#FF6B6B', secondary: '#FF9E9E' },
  lavender: { primary: '#9C27B0', secondary: '#BA68C8' },
  rose: { primary: '#e11d48', secondary: '#f43f5e' },
  teal: { primary: '#0d9488', secondary: '#2dd4bf' },
  candy: { primary: '#FF69B4', secondary: '#FFB6C1' },
  ocean: { primary: '#00BCD4', secondary: '#4DD0E1' },

  // Premium colors - sophisticated and rich
  gold: { primary: '#FFD700', secondary: '#FFE44D' },
  emerald: { primary: '#047857', secondary: '#34d399' },
  indigo: { primary: '#4f46e5', secondary: '#818cf8' },
  violet: { primary: '#8b5cf6', secondary: '#a78bfa' },
  sunset: { primary: '#FF7043', secondary: '#FFAB91' },
  cyan: { primary: '#0891b2', secondary: '#22d3ee' },
  pink: { primary: '#db2777', secondary: '#f472b6' },
};

// Returns a Tailwind class if it's a known color, otherwise uses inline styles
export const getBgColor = (color: ColorOption) => {
  return colorMap[color] ? { backgroundColor: colorMap[color].primary } : { backgroundColor: color };
};

export const getFillColor = (color: ColorOption) => {
  return colorMap[color] ? { fill: colorMap[color].primary } : { fill: color };
};