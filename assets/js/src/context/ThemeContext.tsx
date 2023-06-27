import { createContext } from "react";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../../tailwind.config";

export const theme = resolveConfig(tailwindConfig).theme;
const ThemeContext = createContext(theme);

export default ThemeContext;
