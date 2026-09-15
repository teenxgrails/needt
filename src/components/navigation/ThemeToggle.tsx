"use client";

import { IconType } from "react-icons";
import {
  HiDesktopComputer,
  HiMoon,
  HiOutlineMoon,
  HiOutlineSun,
  HiSun,
} from "react-icons/hi";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { THEME_MODES, THEME_MODE_LABELS } from "@/lib/theme";

import { ThemeMode } from "@/types/settings";

const THEME_ICONS: Record<ThemeMode, IconType> = {
  paper: HiOutlineSun,
  warm: HiSun,
  dim: HiOutlineMoon,
  dark: HiMoon,
  system: HiDesktopComputer,
};

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-9 px-0">
          <HiSun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <HiMoon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_MODES.map((mode) => {
          const Icon = THEME_ICONS[mode];
          return (
            <DropdownMenuItem key={mode} onClick={() => setTheme(mode)}>
              <Icon className="mr-2 h-4 w-4" />
              <span>{THEME_MODE_LABELS[mode]}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
