import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "light",
      layout: {
        radius: {
          small: "4px",
          medium: "8px",
          large: "12px",
        },
      },
      themes: {
        light: {
          layout: {
            radius: {
              small: "4px",
              medium: "8px",
              large: "12px",
            },
          },
          colors: {
            primary: {
              DEFAULT: "#4f46e5",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          layout: {
            radius: {
              small: "4px",
              medium: "8px",
              large: "12px",
            },
          },
          colors: {
            primary: {
              DEFAULT: "#4f46e5",
              foreground: "#ffffff",
            },
          },
        },
      },
    }),
  ],
} satisfies Config;