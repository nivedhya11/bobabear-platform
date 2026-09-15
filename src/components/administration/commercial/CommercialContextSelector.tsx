"use client";

import type { AdministrationResource } from "@/lib/administration/api";
import {
  enterpriseFieldClass,
  enterprisePanelClass,
} from "@/components/enterprise/enterprise-tokens";
import { cn } from "@/lib/utils";
import type { CommercialContext } from "./commercial-types";

export type CommercialProductOption = Readonly<{
  id: string;
  label: string;
  code: string;
}>;

export type CommercialVariantOption = Readonly<{
  id: string;
  label: string;
  code: string;
}>;

export type CommercialContextSelectorProps = Readonly<{
  context: CommercialContext;
  brands: readonly AdministrationResource[];
  outlets: readonly AdministrationResource[];
  products: readonly CommercialProductOption[];
  variants: readonly CommercialVariantOption[];
  productsLoading?: boolean;
  variantsLoading?: boolean;
  onBrandChange: (brand: AdministrationResource | null) => void;
  onProductChange: (productId: string | null) => void;
  onVariantChange: (variantId: string | null) => void;
  onOutletChange: (outlet: AdministrationResource | null) => void;
}>;

export function CommercialContextSelector(props: CommercialContextSelectorProps) {
  return (
    <section
      className={cn(enterprisePanelClass, "space-y-4 px-4 py-4")}
      data-testid="commercial-context-selector"
      aria-label="Commercial context"
    >
      <h2 className="text-sm font-semibold text-[var(--enterprise-text-primary,#FAF3E2)]">
        Working context
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--enterprise-text-secondary,#EBD9A6)]">Brand</span>
          <select
            className={cn(enterpriseFieldClass, "w-full")}
            value={props.context.brandId}
            aria-label="Brand"
            onChange={(e) => {
              const id = e.target.value;
              const brand = props.brands.find((b) => b.id === id) ?? null;
              props.onBrandChange(brand);
            }}
          >
            <option value="">Select brand…</option>
            {props.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--enterprise-text-secondary,#EBD9A6)]">Product</span>
          <select
            className={cn(enterpriseFieldClass, "w-full")}
            value={props.context.productId ?? ""}
            aria-label="Product"
            disabled={!props.context.brandId || props.productsLoading}
            onChange={(e) => props.onProductChange(e.target.value || null)}
          >
            <option value="">
              {props.productsLoading ? "Loading products…" : "Select product…"}
            </option>
            {props.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--enterprise-text-secondary,#EBD9A6)]">Variant</span>
          <select
            className={cn(enterpriseFieldClass, "w-full")}
            value={props.context.variantId ?? ""}
            aria-label="Variant"
            disabled={!props.context.productId || props.variantsLoading}
            onChange={(e) => props.onVariantChange(e.target.value || null)}
          >
            <option value="">
              {props.variantsLoading ? "Loading variants…" : "Select variant…"}
            </option>
            {props.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} ({v.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--enterprise-text-secondary,#EBD9A6)]">Outlet</span>
          <select
            className={cn(enterpriseFieldClass, "w-full")}
            value={props.context.outletId ?? ""}
            aria-label="Outlet"
            disabled={!props.context.brandId}
            onChange={(e) => {
              const id = e.target.value;
              const outlet = props.outlets.find((o) => o.id === id) ?? null;
              props.onOutletChange(outlet);
            }}
          >
            <option value="">All / none</option>
            {props.outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-[var(--enterprise-muted,#C4D4A8)]">
        Selected brand: <strong>{props.context.brandName || "—"}</strong>
        {" · "}
        {props.context.productLabel ?? "No product"}
        {" · "}
        {props.context.variantLabel ?? "No variant"}
        {" · "}
        {props.context.outletLabel ?? "No outlet"}
      </p>
    </section>
  );
}
