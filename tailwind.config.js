/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        accent: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
          soft: "#eef2ff"
        },
        good: "#059669",
        warn: "#d97706"
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)"
      }
    }
  },
  plugins: []
};
