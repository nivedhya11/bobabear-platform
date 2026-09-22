"use client";

import { useCallback, useRef, useState } from "react";

import { StepUpMfaDialog } from "@/components/workforce/StepUpMfaDialog";
import { withStepUpProof } from "@/lib/workforce-auth/step-up";
import type { WorkforceStepUpActionClass } from "@/shared/workforce-auth/contracts";

type PromptState = Readonly<{
  resolve: (code: string | null) => void;
}>;

/**
 * Prompt for TOTP and retry a privileged mutation with a granted step-up proof.
 */
export function useStepUpMutation() {
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const promptRef = useRef<PromptState | null>(null);
  promptRef.current = prompt;

  const closePrompt = useCallback((code: string | null) => {
    const current = promptRef.current;
    setPrompt(null);
    current?.resolve(code);
  }, []);

  const runWithStepUp = useCallback(
    async <T extends { ok: boolean; code?: string }>(
      actionClass: WorkforceStepUpActionClass,
      execute: (proofId: string | undefined) => Promise<T>,
    ): Promise<T | { ok: false; code: string }> => {
      return withStepUpProof(actionClass, execute, () =>
        new Promise<string | null>((resolve) => {
          setPrompt({ resolve });
        }),
      );
    },
    [],
  );

  const dialog = (
    <StepUpMfaDialog
      open={prompt !== null}
      onCancel={() => closePrompt(null)}
      onConfirm={(code) => closePrompt(code)}
    />
  );

  return { runWithStepUp, dialog };
}
