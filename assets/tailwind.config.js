/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

import plugin from "tailwindcss/plugin";

import theme from "./js/src/theme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./js/**/*.{js,ts,jsx,tsx}"],
  theme,
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "text-shadow": (value) => ({
            textShadow: value,
          }),
        },
        { values: theme("textShadow") }
      );
    }),
    // require("@tailwindcss/forms"),
  ],
  variants: {},
};
