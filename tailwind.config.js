/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        background:  '#09090B',
        foreground:  '#FAFAFA',
        muted:       '#27272A',
        'muted-foreground': '#A1A1AA',
        accent:      '#DFE104',
        'accent-foreground': '#000000',
        border:      '#3F3F46',
      },
      fontSize: {
        'display': ['clamp(3.5rem, 11vw, 13rem)', { lineHeight: '0.85', 
                    letterSpacing: '-0.03em', fontWeight: '700' }],
        'hero':    ['clamp(3rem, 12vw, 14rem)',  { lineHeight: '0.85', 
                    letterSpacing: '-0.03em', fontWeight: '700' }],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        sm:   '0px',
        md:   '0px',
        lg:   '0px',
        xl:   '0px',
        '2xl':'0px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl:': '1440px',
      },
    },
  },
  plugins: [],
}