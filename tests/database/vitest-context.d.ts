import "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    bobaBearTestAdminConnectionString: string;
    bobaBearTestAdminHost: string;
    bobaBearTestAdminPort: number;
  }
}
