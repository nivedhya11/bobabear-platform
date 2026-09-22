/**
 * Shared JSON-safe workforce-auth façade contracts (IMP-010).
 *
 * Safe for both the static browser client and the dedicated workforce-auth
 * Node service. Never includes secrets, passwords, TOTP secrets, backup
 * codes in session/auth responses (except the one-time MFA enroll payload),
 * session tokens, emails, or user names.
 */

export const WORKFORCE_AUTH_PUBLIC_PATHS = Object.freeze({
  signIn: "/api/workforce-auth/sign-in",
  changePassword: "/api/workforce-auth/change-password",
  mfaEnroll: "/api/workforce-auth/mfa/enroll",
  mfaVerifyEnrollment: "/api/workforce-auth/mfa/verify-enrollment",
  mfaVerify: "/api/workforce-auth/mfa/verify",
  mfaVerifyBackupCode: "/api/workforce-auth/mfa/verify-backup-code",
  stepUp: "/api/workforce-auth/step-up",
  session: "/api/workforce-auth/session",
  signOut: "/api/workforce-auth/sign-out",
} as const);

export type WorkforceAuthNextStep =
  | "change_password"
  | "mfa_enrollment"
  | "mfa"
  | "sign_in";

export type WorkforceAuthSignInRequest = Readonly<{
  email: string;
  password: string;
  /** Cloudflare Turnstile token when challengeRequired was signaled. */
  turnstileToken?: string;
}>;

export type WorkforceAuthSignInSuccess = Readonly<{
  authenticated: false;
  next: Exclude<WorkforceAuthNextStep, "sign_in">;
}>;

export type WorkforceAuthSignInFailure = Readonly<{
  authenticated: false;
  code:
    | "AUTHENTICATION_FAILED"
    | "RATE_LIMITED"
    | "CHALLENGE_REQUIRED"
    | "INVALID_REQUEST";
  retryAfterSeconds?: number;
  challengeRequired?: boolean;
}>;

export type WorkforceAuthSignInResponse =
  | WorkforceAuthSignInSuccess
  | WorkforceAuthSignInFailure;

export type WorkforceAuthChangePasswordRequest = Readonly<{
  currentPassword: string;
  newPassword: string;
  /** IMP-038 step-up proof id (CLASS_CREDENTIAL_SECURITY). */
  stepUpProofId?: string;
}>;

export type WorkforceAuthChangePasswordSuccess =
  | Readonly<{
      authenticated: true;
    }>
  | Readonly<{
      authenticated: false;
      next: "mfa_enrollment" | "sign_in";
    }>;

export type WorkforceAuthChangePasswordFailure = Readonly<{
  authenticated: false;
  code:
    | "AUTHENTICATION_FAILED"
    | "PASSWORD_POLICY_VIOLATION"
    | "RATE_LIMITED"
    | "INVALID_REQUEST"
    | "FORBIDDEN"
    | "STEP_UP_REQUIRED"
    | "STEP_UP_INVALID";
  retryAfterSeconds?: number;
}>;

export type WorkforceAuthChangePasswordResponse =
  | WorkforceAuthChangePasswordSuccess
  | WorkforceAuthChangePasswordFailure;

export type WorkforceAuthMfaEnrollRequest = Readonly<{
  password: string;
  /** IMP-038 step-up proof id (CLASS_CREDENTIAL_SECURITY). */
  stepUpProofId?: string;
}>;

export type WorkforceAuthMfaEnrollSuccess = Readonly<{
  totpUri: string;
  backupCodes: readonly string[];
}>;

export type WorkforceAuthMfaEnrollFailure = Readonly<{
  authenticated: false;
  code:
    | "AUTHENTICATION_FAILED"
    | "FORBIDDEN"
    | "RATE_LIMITED"
    | "INVALID_REQUEST"
    | "STEP_UP_REQUIRED"
    | "STEP_UP_INVALID";
  retryAfterSeconds?: number;
}>;

export type WorkforceAuthMfaEnrollResponse =
  | WorkforceAuthMfaEnrollSuccess
  | WorkforceAuthMfaEnrollFailure;

export type WorkforceAuthMfaVerifyEnrollmentRequest = Readonly<{
  code: string;
  /** IMP-038 step-up proof id (CLASS_CREDENTIAL_SECURITY). */
  stepUpProofId?: string;
}>;

export type WorkforceAuthMfaVerifyEnrollmentSuccess = Readonly<{
  authenticated: false;
  next: "sign_in";
}>;

export type WorkforceAuthMfaVerifyEnrollmentFailure = Readonly<{
  authenticated: false;
  code:
    | "MFA_INVALID_CODE"
    | "MFA_LOCKED"
    | "FORBIDDEN"
    | "RATE_LIMITED"
    | "INVALID_REQUEST"
    | "STEP_UP_REQUIRED"
    | "STEP_UP_INVALID";
  retryAfterSeconds?: number;
}>;

export type WorkforceAuthMfaVerifyEnrollmentResponse =
  | WorkforceAuthMfaVerifyEnrollmentSuccess
  | WorkforceAuthMfaVerifyEnrollmentFailure;

export type WorkforceAuthMfaVerifyRequest = Readonly<{
  code: string;
}>;

export type WorkforceAuthMfaVerifySuccess =
  | Readonly<{
      authenticated: true;
    }>
  | Readonly<{
      authenticated: false;
      next: "change_password";
    }>;

export type WorkforceAuthMfaVerifyFailure = Readonly<{
  authenticated: false;
  code:
    | "MFA_INVALID_CODE"
    | "MFA_LOCKED"
    | "AUTHENTICATION_FAILED"
    | "RATE_LIMITED"
    | "INVALID_REQUEST";
  retryAfterSeconds?: number;
}>;

export type WorkforceAuthMfaVerifyResponse =
  | WorkforceAuthMfaVerifySuccess
  | WorkforceAuthMfaVerifyFailure;

export type WorkforceAuthMfaVerifyBackupCodeRequest = Readonly<{
  code: string;
}>;

export type WorkforceAuthMfaVerifyBackupCodeResponse = WorkforceAuthMfaVerifyResponse;

export type WorkforceAuthSessionUnauthenticated = Readonly<{
  authenticated: false;
  next?: Exclude<WorkforceAuthNextStep, "sign_in">;
}>;

export type WorkforceAuthSessionAuthenticated = Readonly<{
  authenticated: true;
  user: Readonly<{
    id: string;
  }>;
}>;

export type WorkforceAuthSessionResponse =
  | WorkforceAuthSessionUnauthenticated
  | WorkforceAuthSessionAuthenticated;

export type WorkforceAuthSignOutResponse = Readonly<{
  authenticated: false;
}>;

/** IMP-038 step-up action classes (capability §11.2). */
export const WORKFORCE_STEP_UP_ACTION_CLASSES = [
  "CLASS_ACCESS_MUTATION",
  "CLASS_CREDENTIAL_SECURITY",
  "CLASS_PRIVACY_DESTRUCTIVE",
  "CLASS_FINANCIAL_REVERSAL",
] as const;

export type WorkforceStepUpActionClass =
  (typeof WORKFORCE_STEP_UP_ACTION_CLASSES)[number];

/** Request header carrying a granted proof id for admin/ops mutations. */
export const WORKFORCE_STEP_UP_PROOF_HEADER = "x-boba-step-up-proof" as const;

export type WorkforceAuthStepUpRequest = Readonly<{
  actionClass: WorkforceStepUpActionClass;
  /** TOTP code for recent MFA re-auth. */
  code?: string;
  /** Optional password re-auth (combined with TOTP when both supplied). */
  password?: string;
}>;

export type WorkforceAuthStepUpSuccess = Readonly<{
  ok: true;
  proofId: string;
  expiresAt: string;
  actionClass: WorkforceStepUpActionClass;
}>;

export type WorkforceAuthStepUpFailure = Readonly<{
  ok: false;
  code:
    | "AUTHENTICATION_FAILED"
    | "MFA_INVALID_CODE"
    | "MFA_LOCKED"
    | "FORBIDDEN"
    | "RATE_LIMITED"
    | "INVALID_REQUEST"
    | "STEP_UP_DENIED";
  retryAfterSeconds?: number;
}>;

export type WorkforceAuthStepUpResponse =
  | WorkforceAuthStepUpSuccess
  | WorkforceAuthStepUpFailure;

