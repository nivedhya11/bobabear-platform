"use client";

import { useEffect, useState } from "react";

export const COMMERCIAL_AUTHORING_MQ = "(min-width: 768px)";

/**
 * Tablet+desktop authoring gate. Mobile remains inspection/verification only.
 * Affordance only — server remains authority for mutations.
 */
export function useCommercialViewport(): Readonly<{
  authoringAllowed: boolean;
  viewportReady: boolean;
}> {
  const [authoringAllowed, setAuthoringAllowed] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(COMMERCIAL_AUTHORING_MQ);
    const sync = () => {
      setAuthoringAllowed(mq.matches);
      setViewportReady(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return { authoringAllowed, viewportReady };
}
