// src/context/ThemeContext.jsx
// Purpose: Simple light/dark mode toggle, applied by adding a class to <body>.
// CSS variables in theme.css read that class to swap the entire color palette.

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("wb-theme") || "light");

  useEffect(() => {
    document.body.className = theme === "dark" ? "theme-dark" : "theme-light";
    localStorage.setItem("wb-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
