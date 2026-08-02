"use client";

import * as React from "react";

import {
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  CircleMinus,
  Clock3,
  Copy,
  Ellipsis,
  Flag,
  Inbox,
  Info,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Sun,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NeedtPicker } from "@/components/ui/needt-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { StyleDatePickerPreview } from "@/components/ui/style-date-picker-preview";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { APP_NAME } from "@/lib/app-config";
import { ResolvedThemeMode, getThemeClassNames } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ThemeDraft = {
  name: string;
  mode: ResolvedThemeMode;
  canvas: string;
  control: string;
  controlHover: string;
  hover: string;
  borderSubtle: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  accent: string;
  radius: number;
};

const PRESETS: Record<string, ThemeDraft> = {
  light: {
    name: "Needt light",
    mode: "light",
    canvas: "#f6f7fb",
    control: "#eef1f8",
    controlHover: "#e4e8f1",
    hover: "#e9edf7",
    borderSubtle: "#d9dde7",
    border: "#cbd2df",
    text: "#11131c",
    textSecondary: "#5d6478",
    muted: "#737a80",
    accent: "#6366f1",
    radius: 6,
  },
  graphite: {
    name: "Needt graphite",
    mode: "graphite",
    canvas: "#1a1d1e",
    control: "#262627",
    controlHover: "#2b2f31",
    hover: "#2b2f31",
    borderSubtle: "#2a2a2c",
    border: "#323234",
    text: "#ececee",
    textSecondary: "#9aa0a6",
    muted: "#6e6e75",
    accent: "#6366f1",
    radius: 6,
  },
  dark: {
    name: "Needt dark",
    mode: "dark",
    canvas: "#0e0e10",
    control: "#1b1b1e",
    controlHover: "#232327",
    hover: "#202024",
    borderSubtle: "#242428",
    border: "#303036",
    text: "#ececee",
    textSecondary: "#9aa0a6",
    muted: "#6e6e75",
    accent: "#6366f1",
    radius: 6,
  },
};

const SECTIONS = [
  ["foundation", "Foundation"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["navigation", "Navigation"],
  ["overlays", "Overlays"],
  ["feedback", "Feedback"],
  ["data", "Data display"],
  ["patterns", "Product patterns"],
] as const;

const THEME_VARIABLES = [
  "--surface-canvas",
  "--surface-panel",
  "--surface-raised",
  "--surface-control",
  "--surface-control-hover",
  "--surface-input",
  "--surface-hover",
  "--border-subtle",
  "--border-control",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--color-accent",
  "--button-primary-bg",
  "--button-primary-bg-hover",
  "--button-primary-border",
  "--switch-on-bg",
  "--control-radius",
  "--radius",
] as const;

const DRAFT_STORAGE_KEY = "needt:style-lab:draft";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const THEME_CLASS_NAMES = [
  "light",
  "dark",
  "theme-gray",
  "theme-graphite",
  "theme-dark",
];

function parseThemeDraft(value: string): ThemeDraft | null {
  try {
    const draft = JSON.parse(value) as Partial<ThemeDraft>;
    const colors = [
      draft.canvas,
      draft.control,
      draft.controlHover,
      draft.hover,
      draft.borderSubtle,
      draft.border,
      draft.text,
      draft.textSecondary,
      draft.muted,
      draft.accent,
    ];
    if (
      typeof draft.name !== "string" ||
      draft.name.trim().length === 0 ||
      draft.name.length > 80 ||
      !["light", "graphite", "dark"].includes(draft.mode ?? "") ||
      !colors.every(
        (color): color is string =>
          typeof color === "string" && HEX_COLOR.test(color)
      ) ||
      typeof draft.radius !== "number" ||
      !Number.isFinite(draft.radius) ||
      draft.radius < 2 ||
      draft.radius > 18
    ) {
      return null;
    }
    return draft as ThemeDraft;
  } catch {
    return null;
  }
}

export function DesignSystemLab() {
  const [preset, setPreset] = React.useState("dark");
  const [draft, setDraft] = React.useState<ThemeDraft>(PRESETS.dark);
  const [copyState, setCopyState] = React.useState("Copy theme CSS");
  const [editorStatus, setEditorStatus] = React.useState("");
  const originalRootRef = React.useRef<{
    className: string;
    dataTheme: string | null;
    variables: Map<string, string>;
  } | null>(null);

  React.useEffect(() => {
    // The lab lives outside the (app) shell that normally sets this flag, so
    // enable Needt motion here to preview real overlay/menu animations.
    const root = document.documentElement;
    const previousMotion = root.dataset.needtMotion;
    root.dataset.needtMotion = "on";
    return () => {
      if (previousMotion) root.dataset.needtMotion = previousMotion;
      else delete root.dataset.needtMotion;
    };
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    originalRootRef.current = {
      className: root.className,
      dataTheme: root.getAttribute("data-theme"),
      variables: new Map(
        THEME_VARIABLES.map((variable) => [
          variable,
          root.style.getPropertyValue(variable),
        ])
      ),
    };

    return () => {
      const original = originalRootRef.current;
      if (!original) return;
      root.className = original.className;
      if (original.dataTheme)
        root.setAttribute("data-theme", original.dataTheme);
      else root.removeAttribute("data-theme");
      original.variables.forEach((value, variable) => {
        if (value) root.style.setProperty(variable, value);
        else root.style.removeProperty(variable);
      });
    };
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...THEME_CLASS_NAMES);
    root.classList.add(...getThemeClassNames(draft.mode));
    root.setAttribute("data-theme", draft.mode);

    const values: Record<(typeof THEME_VARIABLES)[number], string> = {
      "--surface-canvas": draft.canvas,
      "--surface-panel": draft.canvas,
      "--surface-raised": draft.canvas,
      "--surface-control": draft.control,
      "--surface-control-hover": draft.controlHover,
      "--surface-input": draft.canvas,
      "--surface-hover": draft.hover,
      "--border-subtle": draft.borderSubtle,
      "--border-control": draft.border,
      "--text-primary": draft.text,
      "--text-secondary": draft.textSecondary,
      "--text-muted": draft.muted,
      "--color-accent": draft.accent,
      "--button-primary-bg": draft.accent,
      "--button-primary-bg-hover": draft.accent,
      "--button-primary-border": draft.accent,
      "--switch-on-bg": draft.accent,
      "--control-radius": `${draft.radius}px`,
      "--radius": `${draft.radius}px`,
    };

    THEME_VARIABLES.forEach((variable) => {
      root.style.setProperty(variable, values[variable]);
    });
  }, [draft]);

  const choosePreset = (value: string) => {
    const next = PRESETS[value];
    if (!next) return;
    setPreset(value);
    setDraft(next);
  };

  const updateDraft = <Key extends keyof ThemeDraft>(
    key: Key,
    value: ThemeDraft[Key]
  ) => {
    setPreset("custom");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setEditorStatus("Draft saved locally");
    } catch {
      setEditorStatus("Could not save this draft");
    }
  };

  const loadDraft = () => {
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      const parsed = stored ? parseThemeDraft(stored) : null;
      if (!parsed) {
        setEditorStatus(stored ? "Saved draft is invalid" : "No saved draft");
        return;
      }
      setPreset("custom");
      setDraft(parsed);
      setEditorStatus("Draft loaded");
    } catch {
      setEditorStatus("Could not load this draft");
    }
  };

  const copyThemeCss = async () => {
    try {
      await navigator.clipboard.writeText(toThemeCss(draft));
      setCopyState("Copied");
      setEditorStatus("Theme CSS copied");
      window.setTimeout(() => setCopyState("Copy theme CSS"), 1800);
    } catch {
      setCopyState("Copy failed");
      setEditorStatus("Could not copy theme CSS");
    }
  };

  return (
    <TooltipProvider>
      <main className="needt-page-depth min-h-screen text-[var(--text-primary)]">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[216px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[var(--border-subtle)] px-5 py-8 lg:block">
            <div className="sticky top-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                {APP_NAME} UI
              </p>
              <nav
                aria-label="Design system sections"
                className="mt-5 space-y-1"
              >
                {SECTIONS.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="block rounded-md px-2 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <p className="mt-7 text-[11px] leading-5 text-[var(--text-muted)]">
                Direct route only. This lab is not part of product navigation.
              </p>
            </div>
          </aside>

          <div className="min-w-0 px-5 py-9 sm:px-8 lg:px-12 lg:py-12">
            <div className="pointer-events-none sticky top-3 z-40 mb-5 flex justify-end">
              <div
                aria-label="Quick theme switcher"
                className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border-control)] bg-[var(--surface-canvas)] p-1 shadow-lg"
                role="group"
              >
                <QuickThemeButton
                  active={preset === "light"}
                  icon={Sun}
                  label="Light"
                  onClick={() => choosePreset("light")}
                />
                <QuickThemeButton
                  active={preset === "graphite"}
                  icon={Palette}
                  label="Graphite"
                  onClick={() => choosePreset("graphite")}
                />
                <QuickThemeButton
                  active={preset === "dark"}
                  icon={Moon}
                  label="Dark"
                  onClick={() => choosePreset("dark")}
                />
              </div>
            </div>
            <header className="border-b border-[var(--border-subtle)] pb-9">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Live component inventory
              </p>
              <h1 className="mt-3 text-[20px] font-bold leading-[24px] tracking-[-0.01em]">
                Calm, dense, and deliberate.
              </h1>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Real shared components, their states, and the semantic tokens
                that theme them. Edit the sandbox once; product screens inherit
                the same contract without a second component tree.
              </p>
            </header>

            <section id="foundation" className="scroll-mt-8 py-10">
              <SectionTitle
                eyebrow="Foundation"
                title="Theme sandbox"
                description="Changes apply to this route, including portalled dialogs and menus. Save a local draft or copy a semantic-token block; product settings are not modified."
              />
              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <PreviewPanel
                  title="Live tokens"
                  description="Primitive values feed semantic roles."
                  reference="Theme / semantic-tokens"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["Canvas", "canvas", draft.canvas],
                      ["Control", "control", draft.control],
                      ["Control hover", "control-hover", draft.controlHover],
                      ["Surface hover", "hover", draft.hover],
                      ["Divider", "border-subtle", draft.borderSubtle],
                      ["Control border", "border", draft.border],
                      ["Text", "text", draft.text],
                      ["Accent", "accent", draft.accent],
                    ].map(([label, token, value]) => (
                      <div
                        key={token}
                        className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)]"
                      >
                        <div className="h-16" style={{ background: value }} />
                        <div className="bg-[var(--surface-canvas)] px-3 py-2">
                          <p className="text-[12px] font-medium">{label}</p>
                          <code className="text-[10px] text-[var(--text-muted)]">
                            {value}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="text-[20px] font-bold leading-[24px]">
                      Today&apos;s plan
                    </div>
                    <div className="text-[20px] font-semibold">
                      Section heading
                    </div>
                    <div className="text-[14px] font-medium">
                      Task or setting label
                    </div>
                    <p className="max-w-xl text-[13px] leading-5 text-[var(--text-secondary)]">
                      Secondary copy explains the next decision without
                      competing with the primary label.
                    </p>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Eyebrow label
                    </div>
                  </div>
                </PreviewPanel>

                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    <h3 className="text-[14px] font-semibold">Theme editor</h3>
                  </div>
                  <div className="mt-4 space-y-4">
                    <Field label="Preset">
                      <Select value={preset} onValueChange={choosePreset}>
                        <SelectTrigger aria-label="Theme preset">
                          <SelectValue placeholder="Custom draft" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Needt light</SelectItem>
                          <SelectItem value="graphite">
                            Needt graphite
                          </SelectItem>
                          <SelectItem value="dark">Needt dark</SelectItem>
                          {preset === "custom" ? (
                            <SelectItem value="custom" disabled>
                              Custom draft
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <ColorField
                        label="Canvas"
                        value={draft.canvas}
                        onChange={(value) => updateDraft("canvas", value)}
                      />
                      <ColorField
                        label="Control"
                        value={draft.control}
                        onChange={(value) => updateDraft("control", value)}
                      />
                      <ColorField
                        label="Control hover"
                        value={draft.controlHover}
                        onChange={(value) => updateDraft("controlHover", value)}
                      />
                      <ColorField
                        label="Surface hover"
                        value={draft.hover}
                        onChange={(value) => updateDraft("hover", value)}
                      />
                      <ColorField
                        label="Divider"
                        value={draft.borderSubtle}
                        onChange={(value) => updateDraft("borderSubtle", value)}
                      />
                      <ColorField
                        label="Control border"
                        value={draft.border}
                        onChange={(value) => updateDraft("border", value)}
                      />
                      <ColorField
                        label="Text"
                        value={draft.text}
                        onChange={(value) => updateDraft("text", value)}
                      />
                      <ColorField
                        label="Secondary"
                        value={draft.textSecondary}
                        onChange={(value) =>
                          updateDraft("textSecondary", value)
                        }
                      />
                      <ColorField
                        label="Muted"
                        value={draft.muted}
                        onChange={(value) => updateDraft("muted", value)}
                      />
                      <ColorField
                        label="Accent"
                        value={draft.accent}
                        onChange={(value) => updateDraft("accent", value)}
                      />
                    </div>
                    <Field label={`Radius · ${draft.radius}px`}>
                      <Slider
                        value={[draft.radius]}
                        min={2}
                        max={18}
                        step={1}
                        onValueChange={([value]) =>
                          updateDraft("radius", value)
                        }
                        aria-label="Component radius"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={saveDraft}>
                        <Save /> Save draft
                      </Button>
                      <Button size="sm" variant="outline" onClick={loadDraft}>
                        <RotateCcw /> Load draft
                      </Button>
                    </div>
                    <Button className="w-full" size="sm" onClick={copyThemeCss}>
                      <Copy /> {copyState}
                    </Button>
                    <p
                      aria-live="polite"
                      className="min-h-4 text-[11px] text-[var(--text-muted)]"
                    >
                      {editorStatus}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <CatalogSection
              id="buttons"
              eyebrow="Actions"
              title="Buttons"
              description="Actual variants, sizes, icon affordances, loading, disabled, and destructive states."
            >
              <PreviewPanel title="Variants" reference="Button / variants">
                <div className="flex flex-wrap items-center gap-2">
                  <Button>
                    <Plus /> Primary
                  </Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Text link</Button>
                  <Button variant="destructive">
                    <Trash2 /> Delete
                  </Button>
                  <Button disabled>Unavailable</Button>
                  <Button aria-busy="true">
                    <LoadingSpinner size="sm" /> Saving
                  </Button>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="More actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>More actions</TooltipContent>
                  </Tooltip>
                </div>
              </PreviewPanel>
            </CatalogSection>

            <CatalogSection
              id="forms"
              eyebrow="Input"
              title="Forms and selection"
              description="Every field is a shared component with the same geometry, focus, disabled, and validation language."
            >
              <div className="grid gap-5 xl:grid-cols-2">
                <PreviewPanel
                  title="Text and date fields"
                  reference="Form / text-date"
                >
                  <div className="space-y-4">
                    <Field label="Task title">
                      <Input defaultValue="Plan the launch" />
                    </Field>
                    <Field label="Search">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                        <Input
                          className="pl-9"
                          placeholder="Search or command"
                        />
                      </div>
                    </Field>
                    <Field label="Description">
                      <Textarea placeholder="Add useful context…" />
                    </Field>
                    <Field label="Start date">
                      <StyleDatePickerPreview />
                    </Field>
                  </div>
                </PreviewPanel>
                <PreviewPanel
                  title="Choice controls"
                  reference="Form / choice-controls"
                >
                  <div className="space-y-4">
                    <Field label="Calendar view">
                      <NeedtPicker
                        mode="plain"
                        ariaLabel="Calendar view"
                        defaultValue="week"
                        options={[
                          { value: "day", label: "Day" },
                          { value: "week", label: "Week" },
                          { value: "month", label: "Month" },
                        ]}
                      />
                    </Field>
                    <Field label="Priority">
                      <NeedtPicker
                        mode="searchable"
                        ariaLabel="Priority"
                        value="high"
                        searchPlaceholder="Search"
                        options={[
                          {
                            value: "high",
                            label: "High",
                            icon: (
                              <Flag className="text-[var(--color-danger)]" />
                            ),
                          },
                          {
                            value: "medium",
                            label: "Medium",
                            icon: (
                              <Flag className="text-[var(--color-warning)]" />
                            ),
                          },
                          {
                            value: "low",
                            label: "Low",
                            icon: <Flag className="text-[var(--text-muted)]" />,
                          },
                          { value: "none", label: "No priority" },
                        ]}
                      />
                    </Field>
                    <Field label="Project · searchable">
                      <SearchPickerPreview />
                    </Field>
                    <Field label="Duration · type to add">
                      <CreatablePickerPreview />
                    </Field>
                    <ChoiceRow label="Shade non-working hours">
                      <Switch
                        defaultChecked
                        aria-label="Shade non-working hours"
                      />
                    </ChoiceRow>
                    <ChoiceRow label="Email notifications">
                      <Switch aria-label="Email notifications" />
                    </ChoiceRow>
                    <label className="flex min-h-11 items-center gap-3 border-b border-[var(--border-subtle)] text-[13px]">
                      <Checkbox defaultChecked />
                      <span>Include completed tasks</span>
                    </label>
                    <Field label="Default duration · 30 min">
                      <Slider defaultValue={[30]} min={5} max={120} step={5} />
                    </Field>
                  </div>
                </PreviewPanel>
              </div>
            </CatalogSection>

            <CatalogSection
              id="navigation"
              eyebrow="Wayfinding"
              title="Tabs, menus, and compact navigation"
              description="Keyboard-accessible Radix primitives with Needt tokens and a consistent active state."
            >
              <PreviewPanel
                title="Navigation controls"
                reference="Navigation / tabs-menu"
              >
                <Tabs defaultValue="list">
                  <TabsList>
                    <TabsTrigger value="list">List</TabsTrigger>
                    <TabsTrigger value="board">Board</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="list"
                    className="pt-3 text-[13px] text-[var(--text-secondary)]"
                  >
                    Task list is active.
                  </TabsContent>
                  <TabsContent
                    value="board"
                    className="pt-3 text-[13px] text-[var(--text-secondary)]"
                  >
                    Board is active.
                  </TabsContent>
                  <TabsContent
                    value="timeline"
                    className="pt-3 text-[13px] text-[var(--text-secondary)]"
                  >
                    Timeline is active.
                  </TabsContent>
                </Tabs>
                <div className="mt-5 flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Actions <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Task actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        Edit<DropdownMenuShortcut>↵</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Duplicate<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        Archive unavailable
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Notifications"
                  >
                    <Bell />
                  </Button>
                </div>
              </PreviewPanel>
            </CatalogSection>

            <CatalogSection
              id="overlays"
              eyebrow="Layering"
              title="Popover, dialog, and bottom sheet"
              description="All overlays use the shared scrim, border, motion, and focus-management contract—never blur or glow."
            >
              <PreviewPanel
                title="Open each real overlay"
                reference="Overlay / popover-dialog-sheet"
              >
                <div className="flex flex-wrap gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Calendar options</Button>
                    </PopoverTrigger>
                    <PopoverContent align="start">
                      <p className="text-[15px] font-semibold">Calendar</p>
                      <div className="mt-3 space-y-3">
                        <ChoiceRow label="24-hour time">
                          <Switch aria-label="24-hour time" />
                        </ChoiceRow>
                        <ChoiceRow label="Shade non-working hours">
                          <Switch
                            defaultChecked
                            aria-label="Shade non-working hours in popover"
                          />
                        </ChoiceRow>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit task</DialogTitle>
                        <DialogDescription>
                          Shared desktop dialog and mobile sheet behavior.
                        </DialogDescription>
                      </DialogHeader>
                      <Input
                        defaultValue="Plan the launch"
                        aria-label="Dialog task title"
                      />
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <BottomSheet>
                    <BottomSheetTrigger asChild>
                      <Button variant="outline">Open bottom sheet</Button>
                    </BottomSheetTrigger>
                    <BottomSheetContent>
                      <BottomSheetTitle>Quick actions</BottomSheetTitle>
                      <BottomSheetDescription>
                        Touch-friendly actions with safe-area padding.
                      </BottomSheetDescription>
                      <div className="mt-5 grid gap-2">
                        <Button>Create task</Button>
                        <BottomSheetClose asChild>
                          <Button variant="outline">Close</Button>
                        </BottomSheetClose>
                      </div>
                    </BottomSheetContent>
                  </BottomSheet>
                </div>
              </PreviewPanel>
            </CatalogSection>

            <CatalogSection
              id="feedback"
              eyebrow="System states"
              title="Feedback, status, and loading"
              description="Status is communicated with text and icon—not color alone—and every async surface has a visible state."
            >
              <div className="grid gap-5 xl:grid-cols-2">
                <PreviewPanel
                  title="Statuses and badges"
                  reference="Feedback / status-badge"
                >
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      label="Connected"
                      color="var(--color-success)"
                      icon={Check}
                    />
                    <StatusPill
                      label="Needs attention"
                      color="var(--color-warning)"
                      icon={CircleAlert}
                    />
                    <StatusPill
                      label="Unavailable"
                      color="var(--text-muted)"
                      icon={CircleMinus}
                    />
                    <StatusPill
                      label="Error"
                      color="var(--color-danger)"
                      icon={TriangleAlert}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                </PreviewPanel>
                <PreviewPanel
                  title="Notices and loading"
                  reference="Feedback / notice-loading"
                >
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Sync is ready</AlertTitle>
                    <AlertDescription>
                      Your local calendar is up to date.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="destructive" className="mt-3">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>Could not save</AlertTitle>
                    <AlertDescription>
                      Keep the user&apos;s input and offer a retry.
                    </AlertDescription>
                  </Alert>
                  <div className="mt-5 flex items-center gap-4">
                    <LoadingSpinner size="sm" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </PreviewPanel>
              </div>
            </CatalogSection>

            <CatalogSection
              id="data"
              eyebrow="Display"
              title="Cards, rows, and tables"
              description="Use borders and spacing for hierarchy; avoid stacking unrelated raised cards across the interface."
            >
              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="rounded-lg border border-[var(--border-subtle)]">
                  <CardHeader>
                    <CardTitle className="text-[16px]">
                      Daily capacity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-[13px] text-[var(--text-secondary)]">
                    4h 30m scheduled · 1h 15m available
                  </CardContent>
                </Card>
                <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Plan the launch</TableCell>
                        <TableCell>In progress</TableCell>
                        <TableCell className="text-right">45m</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Review calendar</TableCell>
                        <TableCell>Todo</TableCell>
                        <TableCell className="text-right">20m</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CatalogSection>

            <CatalogSection
              id="patterns"
              eyebrow="Composition"
              title="Product patterns"
              description="These are shared visual recipes for the feature screens, composed from the primitives above."
            >
              <PreviewPanel
                title="Calendar task and event"
                description="Hover to see the color wash; click either card to inspect the selected state. Tasks are solid, external events are dashed."
                reference="Calendar / task-event"
              >
                <CalendarItemPreview />
              </PreviewPanel>
              <div className="grid gap-5 xl:grid-cols-3">
                <Pattern title="Settings row" icon={Settings2}>
                  <ChoiceRow label="Auto-schedule tasks">
                    <Switch defaultChecked aria-label="Auto-schedule tasks" />
                  </ChoiceRow>
                  <ChoiceRow label="Calendar account">
                    <span className="text-[12px] text-[var(--color-success)]">
                      Connected
                    </span>
                  </ChoiceRow>
                </Pattern>
                <Pattern title="Task row" icon={Clock3}>
                  <div className="group flex min-h-11 items-center gap-3 border-b border-[var(--border-subtle)]">
                    <button
                      className="h-4 w-4 rounded-full border border-[var(--text-muted)]"
                      aria-label="Complete task"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      Plan the launch
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      45m
                    </span>
                    <Button
                      className="opacity-0 group-hover:opacity-100"
                      variant="ghost"
                      size="icon"
                      aria-label="Task actions"
                    >
                      <Ellipsis />
                    </Button>
                  </div>
                </Pattern>
                <Pattern title="Inbox row" icon={Inbox}>
                  <div className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)]">
                    <div className="h-8 w-8 rounded-full bg-[var(--surface-control)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        Weekly planning
                      </p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">
                        A calm compact preview…
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      9:41
                    </span>
                  </div>
                </Pattern>
              </div>
            </CatalogSection>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

function CatalogSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 border-t border-[var(--border-subtle)] py-10"
    >
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[20px] font-bold leading-[24px]">{title}</h2>
      <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function PreviewPanel({
  title,
  description,
  reference,
  children,
}: {
  title: string;
  description?: string;
  reference?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-5"
      data-component-reference={reference}
    >
      <div className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          {reference ? (
            <code className="rounded bg-[var(--surface-control)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
              {reference}
            </code>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-[var(--text-secondary)]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SearchPickerPreview() {
  const [project, setProject] = React.useState("none");
  return (
    <NeedtPicker
      mode="searchable"
      ariaLabel="Project"
      value={project}
      onValueChange={setProject}
      searchPlaceholder="Choose project…"
      options={[
        {
          value: "none",
          label: "No project",
          icon: <Inbox className="text-[var(--text-muted)]" />,
        },
        {
          value: "learn-motion",
          label: "Learn Motion",
          icon: <Inbox className="text-[var(--color-accent)]" />,
        },
      ]}
    />
  );
}

function CreatablePickerPreview() {
  const [duration, setDuration] = React.useState("30 min");
  return (
    <NeedtPicker
      mode="creatable"
      ariaLabel="Duration"
      value={duration}
      onValueChange={setDuration}
      searchPlaceholder="Choose or type a duration…"
      createLabel={(input) => `Use "${input}"`}
      options={[
        { value: "reminder", label: "Reminder" },
        { value: "15 min", label: "15 min" },
        { value: "30 min", label: "30 min" },
        { value: "45 min", label: "45 min" },
        { value: "1 hour", label: "1 hour" },
        { value: "2 hours", label: "2 hours" },
        { value: "4 hours", label: "4 hours" },
      ]}
    />
  );
}

function CalendarItemPreview() {
  const [selected, setSelected] = React.useState<"task" | "event" | null>(
    "task"
  );

  const item = ({
    kind,
    title,
    time,
    accent,
    height,
  }: {
    kind: "task" | "event";
    title: string;
    time: string;
    accent: string;
    height: string;
  }) => (
    <button
      type="button"
      aria-pressed={selected === kind}
      onClick={() => setSelected((current) => (current === kind ? null : kind))}
      className={cn(
        "group relative w-full max-w-[300px] overflow-hidden rounded-[4px] border border-[var(--calendar-task-border)] bg-[var(--calendar-task-bg)] text-left text-[var(--text-primary)] transition-[border-color] duration-150",
        kind === "event" && "border-dashed",
        selected === kind &&
          "z-[2] border-[var(--text-secondary)] ring-1 ring-inset ring-[var(--text-secondary)]",
        height
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px -left-px -top-px z-[1] w-1 rounded-l-[4px]"
        style={{ backgroundColor: accent }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-[0.15]"
        style={{ backgroundColor: accent }}
      />
      <span className="relative z-[2] grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-[3px] overflow-hidden py-px pl-[5px] pr-1 text-[12px] leading-4">
        {kind === "task" ? (
          <span className="mt-[2px] grid h-3 w-3 place-items-center rounded-full border border-[var(--text-secondary)]">
            <Check className="h-2.5 w-2.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
          </span>
        ) : (
          <span
            className="mt-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        <span className="min-w-0 overflow-hidden">
          <span className="block truncate text-[12px] font-normal leading-4">
            {title}
          </span>
          <span className="block truncate text-[12px] font-normal leading-4 tabular-nums text-[var(--text-secondary)]">
            {time}
          </span>
        </span>
      </span>
    </button>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Task · 30 min
        </p>
        {item({
          kind: "task",
          title: "Plan the launch",
          time: "1:00 PM – 1:30 PM",
          accent: "var(--color-warning)",
          height: "h-[29px]",
        })}
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Calendar event · 60 min
        </p>
        {item({
          kind: "event",
          title: "Weekly planning",
          time: "2:00 PM – 3:00 PM",
          accent: "var(--primitive-blue-500)",
          height: "h-[59px]",
        })}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2 rounded-[var(--control-radius)] border border-[var(--input-border)] bg-[var(--input-bg)] p-1.5">
        <Input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-7 cursor-pointer border-0 p-0"
          aria-label={`${label} color`}
        />
        <code className="text-[10px] text-[var(--text-muted)]">{value}</code>
      </div>
    </Field>
  );
}

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--border-subtle)] text-[13px]">
      <span>{label}</span>
      {children}
    </div>
  );
}

function QuickThemeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-[background-color,color,transform] [transition-duration:var(--motion-duration-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:scale-[0.98] aria-pressed:bg-[var(--surface-control)] aria-pressed:text-[var(--text-primary)] motion-reduce:transition-none motion-reduce:active:scale-100 max-sm:[&_span]:sr-only"
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function StatusPill({
  label,
  color,
  icon: Icon,
}: {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className="inline-flex h-7 items-center gap-2 rounded-full bg-[var(--surface-control)] px-3 text-[12px]"
      style={{ color }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function Pattern({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function toThemeCss(theme: ThemeDraft) {
  const slug = theme.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `[data-app-theme="${slug}"] {\n  --surface-canvas: ${theme.canvas};\n  --surface-panel: var(--surface-canvas);\n  --surface-raised: var(--surface-canvas);\n  --surface-control: ${theme.control};\n  --surface-control-hover: ${theme.controlHover};\n  --surface-input: var(--surface-canvas);\n  --surface-hover: ${theme.hover};\n  --border-subtle: ${theme.borderSubtle};\n  --border-control: ${theme.border};\n  --text-primary: ${theme.text};\n  --text-secondary: ${theme.textSecondary};\n  --text-muted: ${theme.muted};\n  --color-accent: ${theme.accent};\n  --control-radius: ${theme.radius}px;\n}`;
}
