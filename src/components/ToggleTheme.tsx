import { Moon, Sun } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/helpers/theme_helpers";

export default function ToggleTheme() {
  const [isDark, setIsDark] = useState(false);

  // Fetch the initial theme mode when the component mounts
  useEffect(() => {
    const fetchTheme = async () => {
      if (window.themeMode && typeof window.themeMode.current === "function") {
        try {
          const current = await window.themeMode.current();
          setIsDark(current === "dark");
        } catch (error) {
          console.error("Error fetching theme mode:", error);
          setIsDark(false);
        }
      } else {
        console.warn("window.themeMode.current is undefined");
        setIsDark(false);
      }
    };
    fetchTheme();
  }, []);

  const handleToggle = async () => {
    await toggleTheme();
    if (window.themeMode && typeof window.themeMode.current === "function") {
      try {
        const newIsDark = await window.themeMode.current();
        setIsDark(newIsDark === "dark");
      } catch (error) {
        console.error("Error fetching new theme mode:", error);
      }
    } else {
      console.warn("window.themeMode.current is undefined");
    }
  };

  return (
    <Button onClick={handleToggle} size="icon">
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
