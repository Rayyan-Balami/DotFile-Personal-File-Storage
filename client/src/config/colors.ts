export type ColorOption = 
  // Original colors
  'default' | 'blue' | 'green' | 'red' | 'purple' | 'gray' | 'pink' | 'orange' | 
  'teal' | 'indigo' | 'lime' | 'cyan' | 'sky' | 
  // Additional colors - standard variations
  'yellow' | 'amber' | 'emerald' | 'violet' | 'fuchsia' | 'rose' | 
  'slate' | 'zinc' | 'stone' | 'neutral' | 
  // Special colors
  'gold' | 'silver' | 'bronze' | 'chocolate' | 'navy' | 'olive' | 
  'maroon' | 'mint' | 'lavender' | 'turquoise' | 'coral' | 'magenta' |
  // Gradients
  'sunset' | 'ocean' | 'forest' | 'candy' | 'midnight';

export interface ColorDefinition {
  primary: string;
  secondary: string;
}

export const colorMap: Record<ColorOption, ColorDefinition> = {
  // Original colors
  default: { primary: '#FFA000', secondary: '#FFCA28' },
  blue: { primary: '#2563eb', secondary: '#60a5fa' },
  sky: { primary: '#0284c7', secondary: '#38bdf8' },
  green: { primary: '#16a34a', secondary: '#4ade80' },
  red: { primary: '#dc2626', secondary: '#f87171' },
  purple: { primary: '#9333ea', secondary: '#c084fc' },
  gray: { primary: '#4b5563', secondary: '#9ca3af' },
  pink: { primary: '#db2777', secondary: '#f472b6' },
  orange: { primary: '#ea580c', secondary: '#fb923c' },
  teal: { primary: '#0d9488', secondary: '#2dd4bf' },
  indigo: { primary: '#4f46e5', secondary: '#818cf8' },
  lime: { primary: '#65a30d', secondary: '#a3e635' },
  cyan: { primary: '#0891b2', secondary: '#22d3ee' },
  
  // Additional colors - standard variations
  yellow: { primary: '#eab308', secondary: '#facc15' },
  amber: { primary: '#ca8a04', secondary: '#fbbf24' },
  emerald: { primary: '#047857', secondary: '#34d399' },
  violet: { primary: '#8b5cf6', secondary: '#a78bfa' },
  fuchsia: { primary: '#a21caf', secondary: '#d946ef' },
  rose: { primary: '#e11d48', secondary: '#f43f5e' },
  slate: { primary: '#475569', secondary: '#64748b' },
  zinc: { primary: '#3f3f46', secondary: '#52525b' },
  stone: { primary: '#7c7c7e', secondary: '#a1a1aa' },
  neutral: { primary: '#18181b', secondary: '#27272a' },
  
  // Special colors
  gold: { primary: '#B5871C', secondary: '#F0CA65' },
  silver: { primary: '#717577', secondary: '#D5D6D8' },
  bronze: { primary: '#804A00', secondary: '#CD7F32' },
  chocolate: { primary: '#5A3A22', secondary: '#A67B5B' },
  navy: { primary: '#001F3F', secondary: '#0D47A1' },
  olive: { primary: '#3C3C00', secondary: '#808000' },
  maroon: { primary: '#5A0000', secondary: '#800000' },
  mint: { primary: '#008066', secondary: '#AAF0D1' },
  lavender: { primary: '#734F96', secondary: '#E6E6FA' },
  turquoise: { primary: '#006D77', secondary: '#83E8DE' },
  coral: { primary: '#D84727', secondary: '#FF7F50' },
  magenta: { primary: '#C71585', secondary: '#FF00FF' },
  
  // Gradients
  sunset: { primary: '#FF512F', secondary: '#F09819' },
  ocean: { primary: '#2E3192', secondary: '#1BFFFF' },
  forest: { primary: '#2C5E1A', secondary: '#87D37C' },
  candy: { primary: '#D53369', secondary: '#DAAE51' },
  midnight: { primary: '#232526', secondary: '#414345' },
};


// Returns a Tailwind class if it's a known color, otherwise uses inline styles
export const getBgColor = (color: ColorOption) => {
  return colorMap[color] ? { backgroundColor: colorMap[color].primary } : { backgroundColor: color };
};

export const getFillColor = (color: ColorOption) => {
  return colorMap[color] ? { fill: colorMap[color].primary } : { fill: color };
};