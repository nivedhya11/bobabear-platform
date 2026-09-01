/**
 * /dev — Component showcase (internal only)
 *
 * Renders every variant + size of every UI primitive so they can be
 * eyeballed in the browser.  Not indexed — noindex metadata below.
 */

import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardImage } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Component Showcase — Boba Bear Dev",
  robots: { index: false, follow: false },
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline gap-4 border-b border-border pb-3">
        <h2 className="font-heading text-h3 text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Label row ─────────────────────────────────────────────────────────────────
function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-body-xs text-tertiary uppercase tracking-[0.1em]">
      {children}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DevPage() {
  return (
    <main className="min-h-screen bg-page text-primary">
      <div className="mx-auto max-w-[1280px] px-6 md:px-8 lg:px-12 py-16 flex flex-col gap-16">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-body font-semibold text-label-md text-label uppercase tracking-[0.08em]">
              Internal · Not Indexed
            </p>
            <ThemeToggle />
          </div>
          <h1 className="font-display text-h1 text-primary">
            Component Showcase
          </h1>
          <p className="font-body text-body-lg text-secondary max-w-xl">
            Every variant and size of every primitive, rendered on the live
            token stack. Toggle light mode with the button above.
          </p>
        </header>

        {/* ── Buttons ────────────────────────────────────────────────────── */}
        <Section title="Button">

          <div className="flex flex-col gap-4">
            <RowLabel>Variants — all at size md</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Sizes — primary variant</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small — sm</Button>
              <Button size="md">Medium — md</Button>
              <Button size="lg">Large — lg</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Sizes — secondary variant</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm">Small</Button>
              <Button variant="secondary" size="md">Medium</Button>
              <Button variant="secondary" size="lg">Large</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Sizes — outline + ghost</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm">Outline sm</Button>
              <Button variant="outline" size="md">Outline md</Button>
              <Button variant="outline" size="lg">Outline lg</Button>
              <Button variant="ghost" size="sm">Ghost sm</Button>
              <Button variant="ghost" size="md">Ghost md</Button>
              <Button variant="ghost" size="lg">Ghost lg</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Disabled state</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Primary</Button>
              <Button variant="secondary" disabled>Secondary</Button>
              <Button variant="outline" disabled>Outline</Button>
              <Button variant="ghost" disabled>Ghost</Button>
              <Button variant="destructive" disabled>Destructive</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>asChild — anchor styled as button</RowLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="primary">
                <a href="/dev/">{/* ← anchor renders as primary button */}
                  Access the Drop
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dev/">View Current Drop</a>
              </Button>
            </div>
          </div>

        </Section>

        {/* ── Chips ──────────────────────────────────────────────────────── */}
        <Section title="Chip">

          <div className="flex flex-col gap-4">
            <RowLabel>Default · Active · Sizes</RowLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm">Default sm</Chip>
              <Chip size="md">Default md</Chip>
              <Chip size="sm" active>Active sm</Chip>
              <Chip size="md" active>Active md</Chip>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Aurora variant — merch / drop stage colours</RowLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Chip aurora="rose">Rose</Chip>
              <Chip aurora="peach">Peach</Chip>
              <Chip aurora="butter">Butter</Chip>
              <Chip aurora="mint">Mint</Chip>
              <Chip aurora="sky">Sky</Chip>
              <Chip aurora="lavender">Lavender</Chip>
            </div>
          </div>

        </Section>

        {/* ── Badges ─────────────────────────────────────────────────────── */}
        <Section title="Badge">

          <div className="flex flex-col gap-4">
            <RowLabel>All status variants</RowLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Published</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="error">Rejected</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>In context — label + badge</RowLabel>
            <div className="flex flex-col gap-3">
              {(
                [
                  ["Published", "success"],
                  ["Pending review", "warning"],
                  ["Drop rejected", "error"],
                  ["System notice", "info"],
                  ["Archived", "neutral"],
                ] as const
              ).map(([label, v]) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="font-body text-body-sm text-secondary w-36">
                    {label}
                  </span>
                  <Badge variant={v}>{v}</Badge>
                </div>
              ))}
            </div>
          </div>

        </Section>

        {/* ── Cards ──────────────────────────────────────────────────────── */}
        <Section title="Card">

          <div className="flex flex-col gap-4">
            <RowLabel>Default — hover to see lift + shadow + border</RowLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Text-only card */}
              <Card>
                <CardBody>
                  <p className="font-body font-semibold text-body-md text-primary mb-1">
                    Text card
                  </p>
                  <p className="font-body text-body-sm text-secondary">
                    bg-surface · 1 px border-default · radius-lg. Hover lifts
                    2 px, shadow-md, border-strong — 250 ms ease-out.
                  </p>
                </CardBody>
              </Card>

              {/* Card with image area */}
              <Card>
                <CardImage>
                  {/* Aurora gradient stand-in for photography */}
                  <div className="w-full h-full bg-gradient-to-br from-aurora-rose/70 to-aurora-lavender/70 flex items-center justify-center">
                    <span className="font-body text-body-xs text-primary/60 uppercase tracking-widest">
                      Image area
                    </span>
                  </div>
                </CardImage>
                <CardBody>
                  <Chip aurora="peach" size="sm" className="mb-2">New Drop</Chip>
                  <p className="font-body font-semibold text-body-md text-primary mb-1">
                    Card with image
                  </p>
                  <p className="font-body text-body-sm text-secondary">
                    200 px mobile · 240 px tablet+
                  </p>
                </CardBody>
              </Card>

              {/* Card with CTA */}
              <Card>
                <CardBody className="flex flex-col gap-4">
                  <div>
                    <Badge variant="success" className="mb-2">Available</Badge>
                    <p className="font-body font-semibold text-body-md text-primary mt-2">
                      Card with CTA
                    </p>
                    <p className="font-body text-body-sm text-secondary mt-1">
                      One primary CTA per card section, per §9 rules.
                    </p>
                  </div>
                  <Button variant="primary" size="sm" className="self-start">
                    Access the Drop
                  </Button>
                </CardBody>
              </Card>

            </div>
          </div>

        </Section>

        {/* ── Typography quick check ─────────────────────────────────────── */}
        <Section title="Typography">
          <div className="flex flex-col gap-4">
            <RowLabel>Type scale — each family in its role</RowLabel>
            <p className="font-display text-display-lg text-interactive-primary">
              Luckiest Guy — display only
            </p>
            <p className="font-heading text-h1 text-primary">
              Bubblegum Sans — all headings
            </p>
            <p className="font-heading text-h2 text-secondary">
              Section title in heading/h2
            </p>
            <p className="font-heading text-h3 text-tertiary">
              Subsection in heading/h3
            </p>
            <p className="font-body text-body-lg text-primary">
              Nunito body/lg — 16–18 px fluid. For the unbothered.
            </p>
            <p className="font-body text-body-md text-secondary">
              Nunito body/md — 15–16 px fluid. Supporting copy.
            </p>
            <p className="font-body text-body-sm text-tertiary">
              Nunito body/sm — 14 px. Captions, timestamps.
            </p>
            <p className="font-body font-semibold text-label-md text-label uppercase tracking-[0.08em]">
              Label/md · Nunito 600 · uppercase · 8 % tracking
            </p>
            <p className="font-mono text-code-md text-tertiary">
              JetBrains Mono — product SKUs · API refs · inline code
            </p>
          </div>
        </Section>

        {/* ── Colour swatches ────────────────────────────────────────────── */}
        <Section title="Semantic colour tokens">
          <div className="flex flex-col gap-4">
            <RowLabel>Background tokens</RowLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(
                [
                  ["bg-page",           "bg/page"],
                  ["bg-section",        "bg/section"],
                  ["bg-surface",        "bg/surface"],
                  ["bg-surface-raised", "bg/surface-raised"],
                  ["bg-surface-sunken", "bg/surface-sunken"],
                ] as const
              ).map(([cls, label]) => (
                <div key={cls} className="flex flex-col gap-1.5">
                  <div className={`h-12 rounded-md border border-border ${cls}`} />
                  <p className="font-mono text-code-sm text-tertiary">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <RowLabel>Interactive tokens</RowLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(
                [
                  ["bg-interactive-primary",        "interactive/primary"],
                  ["bg-interactive-primary-hover",  "primary-hover"],
                  ["bg-interactive-primary-pressed","primary-pressed"],
                  ["bg-interactive-secondary",      "interactive/secondary"],
                  ["bg-interactive-secondary-hover","secondary-hover"],
                  ["bg-destructive",                "destructive"],
                ] as const
              ).map(([cls, label]) => (
                <div key={cls} className="flex flex-col gap-1.5">
                  <div className={`h-12 rounded-md ${cls}`} />
                  <p className="font-mono text-code-sm text-tertiary">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </main>
  );
}
