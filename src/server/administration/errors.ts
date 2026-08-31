/** Administration domain/transport error (IMP-035). */
export type AdministrationErrorCode =
  | "WORKFORCE_AUTH_REQUIRED"
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_NOT_FOUND"
  | "ADMIN_REQUEST_INVALID"
  | "ADMIN_CONFLICT"
  | "ADMIN_FORBIDDEN";

export class AdministrationError extends Error {
  readonly code: AdministrationErrorCode;
  readonly field?: string;

  constructor(code: AdministrationErrorCode, message: string, options?: { field?: string }) {
    super(message);
    this.name = "AdministrationError";
    this.code = code;
    if (options?.field !== undefined) this.field = options.field;
  }
}
