export type ThemeType = 'TERMINAL' | 'TI99' | 'C64' | 'APPLE_II';

export interface ThemeConfig {
  name: string;
  className: string; // Tailwind classes for bg and text
  style: React.CSSProperties; // Custom styles for specific colors if tailwind isn't enough
  fontVariable: string; // The CSS variable for the font
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  TERMINAL: {
    name: 'Classic Terminal',
    className: 'bg-black text-green-500',
    style: {},
    fontVariable: 'var(--font-vt323)',
  },
  TI99: {
    name: 'TI-99/4A',
    className: 'text-black',
    style: { backgroundColor: '#40C0E0' }, // Cyan
    fontVariable: 'var(--font-press-start-2p)',
  },
  C64: {
    name: 'Commodore 64',
    className: '',
    style: { backgroundColor: '#352879', color: '#887ECB' },
    fontVariable: 'var(--font-press-start-2p)',
  },
  APPLE_II: {
    name: 'Apple II',
    className: 'bg-black text-[#33FF33] uppercase',
    style: {},
    fontVariable: 'var(--font-vt323)', // Closest to Apple II without custom font
  },
};
