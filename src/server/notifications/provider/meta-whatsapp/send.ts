/**
 * Build Meta Cloud API template message payloads (IMP-034).
 *
 * Variable values become body text parameters in **Object insertion order**
 * (`Object.values(variables)`). Callers that need a stable order must build
 * the variable map with keys inserted in template-parameter order.
 */
import {
  META_WHATSAPP_MESSAGING_PRODUCT,
} from "./constants";

export type MetaWhatsAppTemplatePayload = Readonly<{
  messaging_product: typeof META_WHATSAPP_MESSAGING_PRODUCT;
  to: string;
  type: "template";
  template: Readonly<{
    name: string;
    language: Readonly<{ code: string }>;
    components?: ReadonlyArray<Readonly<{
      type: "body";
      parameters: ReadonlyArray<Readonly<{ type: "text"; text: string }>>;
    }>>;
  }>;
}>;

/** Strip leading `+` / spaces — Meta `to` expects E.164 digits only. */
export function normalizePhoneE164Digits(phoneE164: string): string {
  return phoneE164.replace(/[^\d]/g, "");
}

/**
 * Map BOBA locale (`en-IN`) to Meta template language code (`en_IN`).
 * Meta uses underscore-separated BCP-47-ish codes.
 */
export function localeToMetaLanguageCode(locale: string): string {
  return locale.trim().replace(/-/g, "_");
}

export function buildMetaWhatsAppTemplatePayload(input: Readonly<{
  toE164: string;
  providerTemplateRef: string;
  locale: string;
  variables: Readonly<Record<string, string>>;
}>): MetaWhatsAppTemplatePayload {
  // Insertion-order values — documented choice for body parameter sequence.
  const values = Object.values(input.variables);
  const components =
    values.length === 0
      ? undefined
      : [
          Object.freeze({
            type: "body" as const,
            parameters: Object.freeze(
              values.map((text) => Object.freeze({ type: "text" as const, text })),
            ),
          }),
        ];

  return Object.freeze({
    messaging_product: META_WHATSAPP_MESSAGING_PRODUCT,
    to: normalizePhoneE164Digits(input.toE164),
    type: "template" as const,
    template: Object.freeze({
      name: input.providerTemplateRef,
      language: Object.freeze({ code: localeToMetaLanguageCode(input.locale) }),
      ...(components ? { components: Object.freeze(components) } : {}),
    }),
  });
}
