import { Button } from "@/components/ui/Button";

import { Alert } from "./Alert";

export function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to view this page.",
  backHref = "/workforce/",
}: Readonly<{
  title?: string;
  message?: string;
  backHref?: string;
}>) {
  return (
    <div className="space-y-4" data-testid="enterprise-access-denied">
      <Alert tone="warning" title={title}>
        {message}
      </Alert>
      <Button asChild variant="secondary">
        <a href={backHref}>Back to workforce</a>
      </Button>
    </div>
  );
}
