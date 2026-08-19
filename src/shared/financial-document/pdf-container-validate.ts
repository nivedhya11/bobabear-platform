/**
 * PDF container validation for manual signed-artifact intake (D-367 Slice 2).
 *
 * Validates container shape only — not cryptographic signature verification.
 */
import { SignatureFoundationError } from "./signature-errors";

/** Conservative MVP upload limit for operator-attested signed PDF intake. */
export const DEFAULT_SIGNED_PDF_MAX_BYTES = 10 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

function hasPdfEndMarker(bytes: Uint8Array): boolean {
  const tailWindow = Math.min(bytes.byteLength, 4096);
  const tail = bytes.subarray(bytes.byteLength - tailWindow);
  const text = Buffer.from(tail).toString("latin1");
  return /%%EOF/.test(text);
}

/**
 * Reject empty, oversized, non-PDF, or clearly malformed PDF containers.
 */
export function validateSignedPdfContainer(
  bytes: Uint8Array,
  maxBytes: number = DEFAULT_SIGNED_PDF_MAX_BYTES,
): void {
  if (bytes.byteLength === 0) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_CONTAINER_INVALID",
      "Signed PDF payload is empty.",
    );
  }
  if (bytes.byteLength > maxBytes) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_OVERSIZED",
      `Signed PDF exceeds maximum allowed size (${maxBytes} bytes).`,
    );
  }
  if (bytes.byteLength < PDF_MAGIC.length) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_CONTAINER_INVALID",
      "Signed PDF payload is too short to be a valid PDF container.",
    );
  }
  const signature = String.fromCharCode(
    bytes[0]!,
    bytes[1]!,
    bytes[2]!,
    bytes[3]!,
    bytes[4]!,
  );
  if (signature !== PDF_MAGIC) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_CONTAINER_INVALID",
      "Signed PDF payload is not a PDF container.",
    );
  }
  if (!hasPdfEndMarker(bytes)) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_CONTAINER_INVALID",
      "Signed PDF container appears malformed (missing EOF marker).",
    );
  }
}
