import defaultTheme from "tailwindcss/defaultTheme";
import colors from "tailwindcss/colors";

const theme = {
  ...defaultTheme,
  extend: {
    colors: {
      primary: "#df4b26",
      danger: "#d41818",
      success: colors.green["700"],
    },
    textShadow: {
      sm: "0 1px 2px var(--tw-shadow-color)",
      DEFAULT: "0 2px 4px var(--tw-shadow-color)",
      lg: "0 8px 16px var(--tw-shadow-color)",
    },
  },
};

export default theme;
