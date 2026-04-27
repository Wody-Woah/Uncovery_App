import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF8F5',    // warm off-white background
        charcoal: '#333333',  // primary text
        steel: '#5F7F96',     // muted steel-blue accent
        muted: '#8B8B8B',     // soft gray for references/dates
        sunrise: '#D4755A',   // warm sunrise orange (use sparingly)
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        display: ['var(--font-lora)', 'Georgia', 'serif'],
      },
      maxWidth: {
        reading: '700px',
      },
    },
  },
  plugins: [],
}

export default config
