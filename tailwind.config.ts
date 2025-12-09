import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        md: "2rem",
        lg: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "960px",
        lg: "1280px",
        xl: "1440px",
        "2xl": "1680px",
      },
    },
    screens: {
      xs: "361px",
      sm: "640px",
      md: "1024px",
      lg: "1280px",
      xl: "1536px",
      "2xl": "1920px",
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Data Centre Status Colors
        dc: {
          green: "hsl(var(--dc-green))",
          "green-light": "hsl(var(--dc-green-light))",
          amber: "hsl(var(--dc-amber))",
          "amber-light": "hsl(var(--dc-amber-light))",
          red: "hsl(var(--dc-red))",
          "red-light": "hsl(var(--dc-red-light))",
          blue: "hsl(var(--dc-blue))",
          "blue-light": "hsl(var(--dc-blue-light))",
          cyan: "hsl(var(--dc-cyan))",
          purple: "hsl(var(--dc-purple))",
          "purple-light": "hsl(var(--dc-purple-light))",
          // Domain-specific semantic colors
          thermal: "hsl(var(--dc-red))",
          cooling: "hsl(var(--dc-cyan))",
          power: "hsl(var(--dc-amber))",
          gpu: "hsl(var(--dc-purple))",
          sovereignty: "hsl(var(--dc-blue))",
          network: "hsl(var(--dc-cyan))",
          // Status colors
          primary: "hsl(var(--dc-cyan))",
          success: "hsl(var(--dc-green))",
          warning: "hsl(var(--dc-amber))",
          critical: "hsl(var(--dc-red))",
          info: "hsl(var(--dc-blue))",
          // Surface colors
          background: "hsl(var(--noc-bg))",
          surface: "hsl(var(--noc-surface))",
          "surface-elevated": "hsl(var(--noc-surface-elevated))",
          border: "hsl(var(--noc-border))",
          "bg-primary": "hsl(var(--noc-bg))",
          "bg-secondary": "hsl(var(--noc-surface))",
          "primary-foreground": "hsl(var(--text-primary))",
        },
        // NOC Surface Colors
        noc: {
          "bg-deep": "hsl(var(--noc-bg-deep))",
          bg: "hsl(var(--noc-bg))",
          surface: "hsl(var(--noc-surface))",
          "surface-elevated": "hsl(var(--noc-surface-elevated))",
          border: "hsl(var(--noc-border))",
          "border-subtle": "hsl(var(--noc-border-subtle))",
        },
        // Semantic status
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.75rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-elevated)',
        'glow-cyan': 'var(--glow-cyan)',
        'glow-green': 'var(--glow-green)',
        'glow-amber': 'var(--glow-amber)',
        'glow-red': 'var(--glow-red)',
        'glow-purple': 'var(--glow-purple)',
        'glow-blue': 'var(--glow-blue)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "data-flow": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "0.8" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        "status-blink": {
          "0%, 50%, 100%": { opacity: "1" },
          "25%, 75%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        "data-flow": "data-flow 3s linear infinite",
        "status-blink": "status-blink 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
