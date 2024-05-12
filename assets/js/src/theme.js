import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";
import { amber } from "@radix-ui/colors";

const theme = {
  ...defaultTheme,
  data: {
    active: 'ui~="active"',
  },
  extend: {
    colors: {
      primary: "#df4b26",
      danger: "#d41818",
      success: colors.green["700"],
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
