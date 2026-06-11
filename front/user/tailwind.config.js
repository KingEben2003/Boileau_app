/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: {
        xs: "480px",
      },
      colors: {
        ink: {
          900: "#030712",
          800: "#0b1020",
          700: "#0d1117",
        },
        brand: {
          DEFAULT: "#6366f1",
          accent: "#ec4899",
        },
      },
      fontSize: {
        // Tailles fluides (mobile-first) via clamp — responsives "comme un SVG"
        "fluid-sm": ["clamp(0.8rem, 0.76rem + 0.2vw, 0.9rem)", { lineHeight: "1.5" }],
        "fluid-base": ["clamp(0.9rem, 0.84rem + 0.3vw, 1rem)", { lineHeight: "1.6" }],
        "fluid-lg": ["clamp(1.05rem, 0.95rem + 0.5vw, 1.25rem)", { lineHeight: "1.5" }],
        "fluid-xl": ["clamp(1.25rem, 1.05rem + 1vw, 1.6rem)", { lineHeight: "1.35" }],
        "fluid-2xl": ["clamp(1.6rem, 1.2rem + 2vw, 2.4rem)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "fluid-3xl": ["clamp(2rem, 1.4rem + 3vw, 3.25rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        xl2: "1.25rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.25), 0 12px 40px -12px rgba(99,102,241,0.45)",
        "glow-pink": "0 0 0 1px rgba(236,72,153,0.25), 0 12px 40px -12px rgba(236,72,153,0.45)",
        soft: "0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 2.2s linear infinite",
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.4,0,0.2,1) both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
