"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import {
  enterpriseFocusRingClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminSession,
  listAdminBrands,
  listAdminOutlets,
  type AdministrationResource,
} from "@/lib/administration/api";
import { listCatalogProducts, getCatalogProductGraph } from "@/lib/administration/commercial-catalog";
import { describeAdminFailure } from "@/lib/administration/commercial-errors";
import { classifyPortalSessionResult } from "@/lib/workforce-hub/session-result";
import { cn } from "@/lib/utils";

import { AssortmentEditor } from "./AssortmentEditor";
import { CatalogEditor } from "./CatalogEditor";
import { CommercialActivityPanel } from "./CommercialActivityPanel";
import { CommercialContextSelector } from "./CommercialContextSelector";
import { CommercialInspectionPanel } from "./CommercialInspectionPanel";
import { CustomerVerificationPanel } from "./CustomerVerificationPanel";
import { DeliveryTariffEditor } from "./DeliveryTariffEditor";
import { MenuEditor } from "./MenuEditor";
import { PricingEditor } from "./PricingEditor";
import { PromotionsEditor } from "./PromotionsEditor";
import { SellabilityDiagnosisPanel } from "./SellabilityDiagnosisPanel";
import {
  hasAnyCommercialRead,
  resolveCommercialCapabilities,
  type CommercialCapabilities,
  type CommercialContext,
  type CommercialSectionId,
} from "./commercial-types";
import { useCommercialViewport } from "./useCommercialViewport";

type ReadyState = Readonly<{
  capabilities: CommercialCapabilities;
  brands: AdministrationResource[];
}>;

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{ kind: "ready" } & ReadyState>;

const SECTIONS: readonly Readonly<{
  id: CommercialSectionId;
  label: string;
  visible: (c: CommercialCapabilities) => boolean;
}>[] = [
  { id: "offering", label: "Offering", visible: (c) => c.catalogRead },
  { id: "menu", label: "Menu", visible: (c) => c.menuRead },
  { id: "assortment", label: "Assortment", visible: (c) => c.assortmentRead },
  { id: "pricing", label: "Pricing", visible: (c) => c.pricingRead },
  {
    id: "promotions",
    label: "Promotions & coupons",
    visible: (c) => c.promotionsRead || c.couponsRead,
  },
  { id: "delivery", label: "Delivery tariff", visible: (c) => c.pricingRead },
  {
    id: "review",
    label: "Review & publish/effect",
    visible: (c) => hasAnyCommercialRead(c),
  },
  {
    id: "verify",
    label: "Verify & diagnose",
    visible: (c) => hasAnyCommercialRead(c),
  },
  { id: "activity", label: "Activity", visible: (c) => hasAnyCommercialRead(c) },
];

const AUTHORITY_CALLOUTS = [
  "Catalog identity",
  "Menu presentation",
  "Brand assortment",
  "Operational availability",
  "Pricing",
  "Promotion",
  "Delivery price",
  "Serviceability",
  "Tax-charges",
] as const;

function readQueryParams(): Partial<
  Readonly<{ brandId: string; productId: string; variantId: string; outletId: string }>
> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    ...(params.get("brandId") ? { brandId: params.get("brandId")! } : {}),
    ...(params.get("productId") ? { productId: params.get("productId")! } : {}),
    ...(params.get("variantId") ? { variantId: params.get("variantId")! } : {}),
    ...(params.get("outletId") ? { outletId: params.get("outletId")! } : {}),
  };
}

function writeQueryParams(context: CommercialContext) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const setOrDelete = (key: string, value: string | null) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  };
  setOrDelete("brandId", context.brandId || null);
  setOrDelete("productId", context.productId);
  setOrDelete("variantId", context.variantId);
  setOrDelete("outletId", context.outletId);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function CommercialWorkspaceClient() {
  const { authoringAllowed } = useCommercialViewport();
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [section, setSection] = useState<CommercialSectionId>("offering");
  const [statusMessage, setStatusMessage] = useState("");
  /** Blocks URL writes until initial deep-link query params have been read/applied. */
  const [urlSyncReady, setUrlSyncReady] = useState(false);
  const [outlets, setOutlets] = useState<AdministrationResource[]>([]);
  const [products, setProducts] = useState<
    readonly Readonly<{ id: string; label: string; code: string }>[]
  >([]);
  const [variants, setVariants] = useState<
    readonly Readonly<{ id: string; label: string; code: string }>[]
  >([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [context, setContext] = useState<CommercialContext>({
    brandId: "",
    brandName: "",
    productId: null,
    productLabel: null,
    variantId: null,
    variantLabel: null,
    outletId: null,
    outletLabel: null,
    menuId: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessionResult = await fetchAdminSession();
      if (cancelled) return;
      const outcome = classifyPortalSessionResult(sessionResult);
      if (outcome === "authentication_required") {
        setView({ kind: "unauthorized" });
        setUrlSyncReady(true);
        return;
      }
      if (outcome === "service_failure" || !sessionResult.ok) {
        setView({ kind: "error", message: "Administration session could not be loaded." });
        setUrlSyncReady(true);
        return;
      }
      const capabilities = resolveCommercialCapabilities(sessionResult.data.session.capabilities);
      if (!hasAnyCommercialRead(capabilities)) {
        setView({
          kind: "error",
          message: "No commercial read capabilities are granted for your authorized scope.",
        });
        setUrlSyncReady(true);
        return;
      }
      const brandsResult = await listAdminBrands();
      if (cancelled) return;
      if (!brandsResult.ok) {
        setView({ kind: "error", message: describeAdminFailure(brandsResult) });
        setUrlSyncReady(true);
        return;
      }
      const brands = (brandsResult.data.items as AdministrationResource[]) ?? [];
      setView({ kind: "ready", capabilities, brands });

      const query = readQueryParams();
      if (query.brandId) {
        const brand = brands.find((b) => b.id === query.brandId);
        if (brand) {
          setContext((prev) => ({
            ...prev,
            brandId: brand.id,
            brandName: brand.name,
            productId: query.productId ?? null,
            variantId: query.variantId ?? null,
            outletId: query.outletId ?? null,
          }));
        }
      }
      // Enable URL sync only after the initial query has been read (and applied when authorized).
      setUrlSyncReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!urlSyncReady) return;
    writeQueryParams(context);
  }, [context, urlSyncReady]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!context.brandId || view.kind !== "ready") {
        setOutlets([]);
        return;
      }
      const result = await listAdminOutlets();
      if (cancelled) return;
      if (!result.ok) {
        setOutlets([]);
        return;
      }
      const brandOutlets = result.data.items.filter(
        (o) => !o.brandId || o.brandId === context.brandId,
      );
      setOutlets(brandOutlets);
      if (context.outletId) {
        const outlet = brandOutlets.find((o) => o.id === context.outletId);
        if (outlet) {
          setContext((prev) =>
            prev.outletLabel === outlet.name
              ? prev
              : { ...prev, outletLabel: outlet.name },
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context.brandId, context.outletId, view.kind]);

  const refreshProducts = useCallback(async () => {
    if (!context.brandId || view.kind !== "ready" || !view.capabilities.catalogRead) {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    const result = await listCatalogProducts(context.brandId);
    setProductsLoading(false);
    if (!result.ok) {
      setProducts([]);
      return;
    }
    const options = result.data.products.map((p) => ({
      id: p.id,
      label: p.draft.name,
      code: p.code,
    }));
    setProducts(options);
    if (context.productId) {
      const match = options.find((p) => p.id === context.productId);
      if (match) {
        setContext((prev) =>
          prev.productLabel === match.label ? prev : { ...prev, productLabel: match.label },
        );
      }
    }
  }, [context.brandId, context.productId, view]);

  useEffect(() => {
    // Data-fetch effect: initial loading state is set inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external Admin HTTP sync
    void refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        !context.brandId ||
        !context.productId ||
        view.kind !== "ready" ||
        !view.capabilities.catalogRead
      ) {
        setVariants([]);
        return;
      }
      setVariantsLoading(true);
      const result = await getCatalogProductGraph(context.brandId, context.productId);
      if (cancelled) return;
      setVariantsLoading(false);
      if (!result.ok) {
        setVariants([]);
        return;
      }
      const options = result.data.graph.variants.map((v) => ({
        id: v.id,
        label: v.draft.name,
        code: v.code,
      }));
      setVariants(options);
      if (context.variantId) {
        const match = options.find((v) => v.id === context.variantId);
        if (match) {
          setContext((prev) =>
            prev.variantLabel === match.label ? prev : { ...prev, variantLabel: match.label },
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context.brandId, context.productId, context.variantId, view]);

  const visibleSections = useMemo(() => {
    if (view.kind !== "ready") return [];
    return SECTIONS.filter((s) => s.visible(view.capabilities));
  }, [view]);

  const activeSection =
    visibleSections.length === 0 || visibleSections.some((s) => s.id === section)
      ? section
      : visibleSections[0]!.id;

  if (view.kind === "loading") {
    return <LoadingState label="Loading commercial workspace…" />;
  }
  if (view.kind === "unauthorized") {
    return (
      <div className="space-y-3">
        <Alert tone="warning" title="Sign-in required">
          Workforce sign-in is required for commercial administration.
        </Alert>
        <Button asChild>
          <a href="/workforce/login/">Workforce sign in</a>
        </Button>
      </div>
    );
  }
  if (view.kind === "error") {
    return <ErrorState message={view.message} />;
  }

  const { capabilities, brands } = view;

  function onStatus(message: string) {
    setStatusMessage(message);
  }

  return (
    <div data-testid="commercial-workspace" className="space-y-6">
      <div className={cn(enterprisePanelClass, "space-y-2 px-4 py-3")}>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--enterprise-muted,#C4D4A8)]">
          Authority boundaries (remain distinct)
        </p>
        <ul className="flex flex-wrap gap-2 text-xs text-[var(--enterprise-text-secondary,#EBD9A6)]">
          {AUTHORITY_CALLOUTS.map((label) => (
            <li
              key={label}
              className="rounded-md border border-[var(--enterprise-border,#3D6026)] px-2 py-1"
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      <CommercialContextSelector
        context={context}
        brands={brands}
        outlets={outlets}
        products={products}
        variants={variants}
        productsLoading={productsLoading}
        variantsLoading={variantsLoading}
        onBrandChange={(brand) => {
          setContext({
            brandId: brand?.id ?? "",
            brandName: brand?.name ?? "",
            productId: null,
            productLabel: null,
            variantId: null,
            variantLabel: null,
            outletId: null,
            outletLabel: null,
            menuId: null,
          });
          setProducts([]);
          setVariants([]);
        }}
        onProductChange={(productId) => {
          const product = products.find((p) => p.id === productId) ?? null;
          setContext((prev) => ({
            ...prev,
            productId,
            productLabel: product?.label ?? null,
            variantId: null,
            variantLabel: null,
          }));
          setVariants([]);
        }}
        onVariantChange={(variantId) => {
          const variant = variants.find((v) => v.id === variantId) ?? null;
          setContext((prev) => ({
            ...prev,
            variantId,
            variantLabel: variant?.label ?? null,
          }));
        }}
        onOutletChange={(outlet) => {
          setContext((prev) => ({
            ...prev,
            outletId: outlet?.id ?? null,
            outletLabel: outlet?.name ?? null,
          }));
        }}
      />

      <nav aria-label="Commercial sections" className="flex flex-wrap gap-2">
        {visibleSections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              enterpriseFocusRingClass,
              "rounded-md border px-3 py-2 text-sm font-semibold",
              activeSection === item.id
                ? "border-[var(--enterprise-focus,#A8D832)] bg-[var(--bg-surface,#2E4720)]"
                : "border-[var(--enterprise-border,#3D6026)] hover:bg-[var(--bg-surface,#2E4720)]",
            )}
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div
        role="status"
        aria-live="polite"
        className="min-h-6 text-sm text-[var(--enterprise-text-secondary,#EBD9A6)]"
      >
        {statusMessage}
      </div>

      {activeSection === "offering" ? (
        <CatalogEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
          onProductsChanged={() => void refreshProducts()}
          onSelectProduct={(productId, label) =>
            setContext((prev) => ({
              ...prev,
              productId,
              productLabel: label,
              ...(prev.productId === productId
                ? {}
                : { variantId: null, variantLabel: null }),
            }))
          }
          onSelectVariant={(variantId, label) =>
            setContext((prev) => ({ ...prev, variantId, variantLabel: label }))
          }
        />
      ) : null}

      {activeSection === "menu" ? (
        <MenuEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
          onSelectMenu={(menuId) => setContext((prev) => ({ ...prev, menuId }))}
        />
      ) : null}

      {activeSection === "assortment" ? (
        <AssortmentEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
        />
      ) : null}

      {activeSection === "pricing" ? (
        <PricingEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
        />
      ) : null}

      {activeSection === "promotions" ? (
        <PromotionsEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
        />
      ) : null}

      {activeSection === "delivery" ? (
        <DeliveryTariffEditor
          context={context}
          capabilities={capabilities}
          authoringAllowed={authoringAllowed}
          onStatus={onStatus}
        />
      ) : null}

      {activeSection === "review" ? (
        <div className="space-y-4">
          <Alert tone="info" title="Review composed commercial state">
            Use this section to inspect draft vs effective projections before publish/effect
            actions in the domain editors.
          </Alert>
          <CommercialInspectionPanel context={context} />
        </div>
      ) : null}

      {activeSection === "verify" ? (
        <div className="space-y-8">
          <SellabilityDiagnosisPanel context={context} onStatus={onStatus} />
          <CustomerVerificationPanel context={context} onStatus={onStatus} />
        </div>
      ) : null}

      {activeSection === "activity" ? <CommercialActivityPanel context={context} /> : null}
    </div>
  );
}
