import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0d0d0d",
        panel: "#161616",
        "panel-hover": "#1c1c1c",
        "panel-2": "#242424",
        border: "#2a2a2a",
        text: "#e8e8e8",
        "text-muted": "#8a8a8a",
        "text-faint": "#5c5c5c",
        accent: "#e07856",
        success: "#3ecf5e",
        danger: "#e5484d",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        base: ["13.5px", "1.5"],
        h1: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        sm: ["12.5px", "1.4"],
        xs: ["11px", "1.4"],
      },
      borderRadius: {
        card: "8px",
        control: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
