import { createContext } from "react";
export const theme = getComputedStyle(document.documentElement);
const ThemeContext = createContext(theme);

export default ThemeContext;
