import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";
import { amber } from "@radix-ui/colors";

const theme = {
  ...defaultTheme,
  data: {
    active: 'ui~="active"',
  },
  extend: {
    animation: {
      border: "background ease infinite",
    },
    keyframes: {
      background: {
        "0%, 100%": { backgroundPosition: "0% 50%" },
        "50%": { backgroundPosition: "100% 50%" },
      },
    },
    colors: {
      primary: "#ff9a4b",
      danger: "#d41818",
      success: "#49a847", //colors.green["700"],
      warning: amber["amber9"],
    },
    textShadow: {
      sm: "0 1px 2px var(--tw-shadow-color)",
      DEFAULT: "0 2px 4px var(--tw-shadow-color)",
      lg: "0 8px 16px var(--tw-shadow-color)",
    },
  },
};

export default theme;
