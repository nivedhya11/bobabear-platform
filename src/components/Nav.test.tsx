import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CUSTOMER_AUTH_PUBLIC_PATHS } from "@/shared/customer-auth/contracts";

import { Nav } from "./Nav";
import { publishCartCount } from "./ordering/cart-count-sync";
import { writeDeliveryPinContext } from "./ordering/delivery-pin-context";

const usePathname = vi.fn<() => string>();
const getActiveCart = vi.fn<(...args: unknown[]) => unknown>();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return { ...actual, getActiveCart: (...args: unknown[]) => getActiveCart(...args) };
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function desktopNav() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

describe("Nav — IMP-028A Food Direct chrome", () => {
  const assign = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  beforeEach(() => {
    usePathname.mockReturnValue("/");
    getActiveCart.mockReset();
    getActiveCart.mockResolvedValue({ ok: true, status: 200, data: { cart: null } });
    assign.mockReset();
    vi.stubGlobal("location", { ...window.location, assign });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut)) {
          return jsonResponse({ authenticated: false });
        }
        return jsonResponse({ authenticated: false });
      }),
    );
  });

  it("keeps pending chrome anonymous-safe (Sign In, not My BOBA)", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<Nav />);
    expect(within(desktopNav()).getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    expect(within(desktopNav()).queryByRole("button", { name: "My BOBA" })).not.toBeInTheDocument();
    expect(within(desktopNav()).queryByRole("link", { name: "My Orders" })).not.toBeInTheDocument();
  });

  it("shows anonymous chrome: Menu, Drops, Sign In, Cart", async () => {
    render(<Nav />);
    const nav = desktopNav();
    await waitFor(() => {
      expect(within(nav).getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    });
    expect(within(nav).getByRole("link", { name: "Menu" })).toHaveAttribute("href", "/order/");
    expect(within(nav).getByRole("link", { name: "Drops" })).toHaveAttribute("href", "/#drops");
    expect(within(nav).getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login/");
    expect(within(nav).getByRole("link", { name: "Cart (0)" })).toHaveAttribute("href", "/order/cart/");
    expect(within(nav).queryByRole("button", { name: "My BOBA" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Merch" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Artists" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Order" })).not.toBeInTheDocument();
  });

  it("shows authenticated chrome My BOBA instead of Sign In", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ authenticated: true, user: { id: "opaque-user" } })),
    );
    render(<Nav />);
    const nav = desktopNav();
    await waitFor(() => {
      expect(within(nav).getByRole("button", { name: "My BOBA" })).toBeInTheDocument();
    });
    expect(within(nav).queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hi /i)).not.toBeInTheDocument();
    expect(screen.queryByText("opaque-user")).not.toBeInTheDocument();
  });

  it("exposes Profile, Addresses, My Orders and Sign Out through the My BOBA disclosure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ authenticated: true, user: { id: "opaque-user" } })),
    );
    render(<Nav />);
    const trigger = await screen.findByRole("button", { name: "My BOBA" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "My BOBA" });
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/account/profile/",
    );
    expect(within(menu).getByRole("menuitem", { name: "Addresses" })).toHaveAttribute(
      "href",
      "/account/addresses/",
    );
    expect(within(menu).getByRole("menuitem", { name: "My Orders" })).toHaveAttribute(
      "href",
      "/order/orders/",
    );
    expect(within(menu).getByRole("menuitem", { name: "Sign Out" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: /rewards/i })).not.toBeInTheDocument();
  });

  it("closes the My BOBA disclosure on Escape", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ authenticated: true, user: { id: "opaque-user" } })),
    );
    render(<Nav />);
    const trigger = await screen.findByRole("button", { name: "My BOBA" });
    await user.click(trigger);
    expect(screen.getByRole("menu", { name: "My BOBA" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "My BOBA" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("returns to anonymous chrome after Sign Out and navigates to /order/", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
        expect(assign).not.toHaveBeenCalled();
        return jsonResponse({ authenticated: false });
      }
      if (fetchMock.mock.calls.some(([called]) => String(called).includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut))) {
        return jsonResponse({ authenticated: false });
      }
      return jsonResponse({ authenticated: true, user: { id: "opaque-user" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Nav />);
    await user.click(await screen.findByRole("button", { name: "My BOBA" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign Out" }));
    await waitFor(() => {
      expect(within(desktopNav()).getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    });
    expect(within(desktopNav()).queryByRole("button", { name: "My BOBA" })).not.toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith("/order/");
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) &&
          (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(true);
  });

  it("does not navigate when chrome Sign Out fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) && init?.method === "POST") {
          return new Response("nope", { status: 500 });
        }
        return jsonResponse({ authenticated: true, user: { id: "opaque-user" } });
      }),
    );
    render(<Nav />);
    await user.click(await screen.findByRole("button", { name: "My BOBA" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign Out" }));
    await waitFor(() => {
      expect(
        vi.mocked(fetch).mock.calls.some(
          ([input, init]) =>
            String(input).includes(CUSTOMER_AUTH_PUBLIC_PATHS.signOut) &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });
    expect(within(desktopNav()).getByRole("button", { name: "My BOBA" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("uses a route-safe Drops destination from commerce routes", async () => {
    usePathname.mockReturnValue("/order/cart/");
    render(<Nav />);
    await waitFor(() => {
      expect(within(desktopNav()).getByRole("link", { name: "Drops" })).toHaveAttribute(
        "href",
        "/#drops",
      );
    });
  });

  it("shows delivery context in ordering chrome when a PIN is stored", async () => {
    usePathname.mockReturnValue("/order/");
    render(<Nav />);

    expect(screen.getByTestId("deliver-to-header-orientation")).toHaveTextContent("Delivering to");
    expect(screen.getByTestId("deliver-to-header-orientation")).toHaveTextContent("Dehradun");
    expect(screen.getByTestId("deliver-to-header-orientation")).not.toHaveTextContent("248001");

    writeDeliveryPinContext("248001");

    await waitFor(() => {
      expect(screen.getByTestId("deliver-to-header-orientation")).toHaveTextContent("248001");
    });
  });

  it("includes Cart in the mobile drawer and omits dead Offers/Merch/Artists destinations", async () => {
    const user = userEvent.setup();
    render(<Nav />);
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    const nav = within(drawer).getByRole("navigation", { name: "Mobile navigation" });
    expect(within(nav).getByRole("link", { name: "Menu" })).toHaveAttribute("href", "/order/");
    expect(within(nav).getByRole("link", { name: "Drops" })).toHaveAttribute("href", "/#drops");
    expect(within(nav).getByRole("link", { name: "Cart (0)" })).toHaveAttribute("href", "/order/cart/");
    expect(within(nav).getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login/");
    expect(within(nav).queryByRole("link", { name: "Offers" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Merch" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Artists" })).not.toBeInTheDocument();
  });

  it("loads the active cart count and synchronizes successful mutations without reload", async () => {
    getActiveCart.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        cart: {
          id: "cart-1", brandId: "56ff7724-d511-5ef4-b5d5-d629cbfb2388", ownerMode: "guest",
          revision: "1", manualCouponCode: null, expiresAt: null,
          createdAt: "2026-08-22T00:00:00.000Z", updatedAt: "2026-08-22T00:00:00.000Z",
          lines: [{ id: "line-1", variantId: "variant-1", quantity: 3, modifiers: [], bundleSelections: [] }],
        },
      },
    });
    const user = userEvent.setup();
    render(<Nav />);
    await waitFor(() => expect(within(desktopNav()).getByRole("link", { name: "Cart (3)" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(within(screen.getByRole("dialog", { name: "Navigation menu" })).getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();
    publishCartCount(0);
    await waitFor(() => expect(within(desktopNav()).getByRole("link", { name: "Cart (0)" })).toBeInTheDocument());
  });
});
