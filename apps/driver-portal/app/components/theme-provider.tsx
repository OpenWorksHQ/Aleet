"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
    theme: Theme;
    setTheme: (t: Theme) => void;
}>({ theme: "dark", setTheme: () => { } });

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark");

    // Read from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("theme") as Theme | null;
        const resolved: Theme = stored === "light" || stored === "dark" ? stored : "light";
        setThemeState(resolved);
        applyTheme(resolved);
    }, []);

    function setTheme(t: Theme) {
        setThemeState(t);
        localStorage.setItem("theme", t);
        applyTheme(t);
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

function applyTheme(t: Theme) {
    if (t === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}
