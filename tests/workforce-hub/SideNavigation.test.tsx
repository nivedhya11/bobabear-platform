import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { SideNavigation } from "../../src/components/enterprise/SideNavigation";
import { TopBar } from "../../src/components/enterprise/TopBar";

function Harness() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <div {...(open ? { inert: true } : {})}>
        <TopBar
          productLabel="Test"
          showMenuButton
          navigationExpanded={open}
          navigationId="test-drawer"
          menuButtonRef={menuButtonRef}
          onOpenNavigation={() => setOpen(true)}
        />
        <SideNavigation
          items={[{ href: "/workforce/", label: "Applications" }]}
          mobileOpen={false}
          onMobileClose={() => setOpen(false)}
          ariaLabel="Test navigation"
          drawerId="test-drawer-desktop"
          variant="desktop"
        />
        <button type="button">Background action</button>
      </div>
      <SideNavigation
        items={[{ href: "/workforce/", label: "Applications" }]}
        mobileOpen={open}
        onMobileClose={() => {
          setOpen(false);
          queueMicrotask(() => menuButtonRef.current?.focus());
        }}
        ariaLabel="Test navigation"
        drawerId="test-drawer"
        variant="mobile"
      />
    </div>
  );
}

describe("mobile side navigation", () => {
  it("wires aria-expanded/aria-controls and unique desktop/mobile navs", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "test-drawer");
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Test navigation" })).toBeInTheDocument();
    const navs = screen.getAllByRole("navigation", { name: "Test navigation" });
    expect(new Set(navs.map((nav) => nav.id)).size).toBe(navs.length);
  });

  it("closes on Escape, backdrop, and selecting a destination", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByLabelText("Close navigation backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dest = screen.getAllByRole("link", { name: "Applications" }).find((link) =>
      link.closest('[role="dialog"]'),
    );
    expect(dest).toBeTruthy();
    await user.click(dest!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
