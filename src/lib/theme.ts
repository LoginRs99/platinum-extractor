import { writable } from "svelte/store";

export type Theme = "dark" | "light" | "system";

function getInitialTheme(): "dark" | "light" {
    const saved = localStorage.getItem("platinum_theme");
    if (saved === "light" || saved === "dark") {
        return saved;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
    }
    return "dark";
}

export const currentTheme = writable<"dark" | "light">(getInitialTheme());

export function toggleTheme() {
    currentTheme.update((prev) => {
        const next = prev === "dark" ? "light" : "dark";
        localStorage.setItem("platinum_theme", next);
        applyTheme(next);
        return next;
    });
}

export function applyTheme(theme: "dark" | "light") {
    if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
        if (theme === "light") {
            document.documentElement.classList.add("light-theme");
            document.documentElement.classList.remove("dark-theme");
        } else {
            document.documentElement.classList.add("dark-theme");
            document.documentElement.classList.remove("light-theme");
        }
    }
}
