import { Button } from "@/components/ui/Button";

import { Alert } from "./Alert";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: Readonly<{
  title?: string;
  message: string;
  onRetry?: () => void;
}>) {
  return (
    <div className="space-y-4" data-testid="enterprise-error-state">
      <Alert tone="danger" title={title}>
        {message}
      </Alert>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
