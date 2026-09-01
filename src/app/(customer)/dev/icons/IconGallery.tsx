"use client";

/**
 * IconGallery — interactive showcase for the Boba Bear icon library.
 *
 * Controls: live search, size, stroke weight, and accent colour. Every icon
 * is rendered through the same token stack as the rest of the site, so the
 * gallery doubles as a contrast check across dark / light mode. Click a tile
 * to copy its import name.
 */

import { useMemo, useState } from "react";
import { iconRegistry, type IconComponent } from "@/components/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

// ── Control option sets ─────────────────────────────────────────────────────
const SIZES = [16, 20, 24, 32, 48] as const;
const STROKES = [1.25, 1.5, 1.75, 2] as const;

const ACCENTS = [
  { key: "primary", label: "Default", className: "text-primary" },
  { key: "firefly", label: "Firefly", className: "text-firefly-400" },
  { key: "saffron", label: "Saffron", className: "text-saffron-400" },
  { key: "secondary", label: "Muted", className: "text-tertiary" },
] as const;

type AccentKey = (typeof ACCENTS)[number]["key"];

// ── Total count (for the header) ────────────────────────────────────────────
const TOTAL = iconRegistry.reduce(
  (sum, group) => sum + Object.keys(group.icons).length,
  0,
);

// ── Control button ──────────────────────────────────────────────────────────
function Segment({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 h-8 rounded-md font-body font-semibold text-body-sm cursor-pointer",
        "transition-colors duration-[150ms] ease-out focus-ring",
        active
          ? "bg-interactive-primary [color:#1F2C08]"
          : "text-secondary hover:bg-[var(--interactive-ghost-hover)]",
      )}
    >
      {children}
    </button>
  );
}

// ── Single icon tile ──────────────────────────────────────────────────────────
function IconTile({
  name,
  Icon,
  size,
  strokeWidth,
  accentClass,
}: {
  name: string;
  Icon: IconComponent;
  size: number;
  strokeWidth: number;
  accentClass: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(name).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };

  return (
    <button
      onClick={copy}
      title={`Click to copy "${name}"`}
      className={cn(
        "group flex flex-col items-center justify-center gap-3",
        "aspect-square p-3 cursor-pointer",
        "rounded-lg border border-border bg-surface",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        "transition-[transform,box-shadow,border-color] duration-[250ms] ease-out",
        "focus-ring",
      )}
    >
      <span className={cn("flex items-center justify-center", accentClass)}>
        <Icon size={size} strokeWidth={strokeWidth} />
      </span>
      <span className="font-mono text-[10px] text-tertiary truncate max-w-full">
        {copied ? "Copied" : name}
      </span>
    </button>
  );
}

// ── Gallery ─────────────────────────────────────────────────────────────────
export function IconGallery() {
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<number>(24);
  const [strokeWidth, setStrokeWidth] = useState<number>(1.75);
  const [accent, setAccent] = useState<AccentKey>("primary");

  const accentClass =
    ACCENTS.find((a) => a.key === accent)?.className ?? "text-primary";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return iconRegistry
      .map((group) => ({
        ...group,
        entries: Object.entries(group.icons).filter(([name]) =>
          name.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [query]);

  const matchCount = groups.reduce((s, g) => s + g.entries.length, 0);

  return (
    <main className="min-h-screen bg-page text-primary">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12 py-16 flex flex-col gap-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-body font-semibold text-label-md text-label uppercase tracking-[0.08em]">
              Internal · Not Indexed
            </p>
            <ThemeToggle />
          </div>
          <h1 className="font-display text-h1 text-primary">Icon Library</h1>
          <p className="font-body text-body-lg text-secondary max-w-2xl">
            {TOTAL} icons across {iconRegistry.length} categories — monoline,{" "}
            <code className="font-mono text-code-sm text-tertiary">currentColor</code>,
            built on the 24px grid. Each inherits the active text token, so it
            tracks dark / light mode. Click any tile to copy its import name.
          </p>
        </header>

        {/* ── Controls ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 py-4 bg-page/[0.86] backdrop-blur-[14px] border-b border-border-subtle flex flex-col gap-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className={cn(
              "w-full h-10 px-4 rounded-md bg-surface",
              "border border-border focus:border-border-focus",
              "font-body text-body-md text-primary placeholder:text-tertiary",
              "outline-none focus-ring",
            )}
          />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <Control label="Size">
              {SIZES.map((s) => (
                <Segment key={s} active={size === s} onClick={() => setSize(s)}>
                  {s}
                </Segment>
              ))}
            </Control>
            <Control label="Stroke">
              {STROKES.map((w) => (
                <Segment
                  key={w}
                  active={strokeWidth === w}
                  onClick={() => setStrokeWidth(w)}
                >
                  {w}
                </Segment>
              ))}
            </Control>
            <Control label="Accent">
              {ACCENTS.map((a) => (
                <Segment
                  key={a.key}
                  active={accent === a.key}
                  onClick={() => setAccent(a.key)}
                >
                  {a.label}
                </Segment>
              ))}
            </Control>
          </div>
        </div>

        {/* ── Groups ──────────────────────────────────────────────────── */}
        {matchCount === 0 ? (
          <p className="font-body text-body-md text-tertiary py-12 text-center">
            No icons match “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-4">
              <div className="flex items-baseline gap-4 border-b border-border pb-3">
                <h2 className="font-heading text-h3 text-primary">
                  {group.label}
                </h2>
                <p className="font-body text-body-sm text-tertiary hidden md:block">
                  {group.hint}
                </p>
                <span className="font-mono text-code-sm text-tertiary ml-auto">
                  {group.entries.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {group.entries.map(([name, Icon]) => (
                  <IconTile
                    key={name}
                    name={name}
                    Icon={Icon}
                    size={size}
                    strokeWidth={strokeWidth}
                    accentClass={accentClass}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

// ── Labelled control group ────────────────────────────────────────────────────
function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-body font-semibold text-label-sm text-label uppercase tracking-[0.1em]">
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
