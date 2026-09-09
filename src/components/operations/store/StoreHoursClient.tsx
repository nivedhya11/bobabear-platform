"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  dayOfWeekLabel,
  formatMinuteAsTime,
  getStoreOperatingProfile,
  getStoreOperatingSchedule,
  parseTimeToMinute,
  setStoreOperatingProfile,
  setStoreOperatingSchedule,
  validateScheduleIntervals,
  type StoreOperatingInterval,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type DraftInterval = Readonly<{
  key: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}>;

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      timezone: string;
      intervals: readonly DraftInterval[];
    }>;

function toDraft(intervals: readonly StoreOperatingInterval[]): DraftInterval[] {
  return intervals.map((interval, index) => ({
    key: interval.id ?? `row-${index}-${interval.dayOfWeek}-${interval.startMinute}`,
    dayOfWeek: interval.dayOfWeek,
    startTime: formatMinuteAsTime(interval.startMinute),
    endTime:
      interval.endMinute === 1440 ? "24:00" : formatMinuteAsTime(interval.endMinute),
  }));
}

function draftsToPayload(drafts: readonly DraftInterval[]): {
  ok: true;
  intervals: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }>;
} | { ok: false; message: string } {
  const intervals: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }> = [];
  for (const draft of drafts) {
    const startMinute = parseTimeToMinute(draft.startTime);
    const endMinute =
      draft.endTime.trim() === "24:00" ? 1440 : parseTimeToMinute(draft.endTime);
    if (startMinute === null || endMinute === null) {
      return {
        ok: false,
        message: "Use times like 09:00 or 24:00 for closing.",
      };
    }
    intervals.push({
      dayOfWeek: draft.dayOfWeek,
      startMinute,
      endMinute,
    });
  }
  const validation = validateScheduleIntervals(intervals);
  if (validation) return { ok: false, message: validation };
  return { ok: true, intervals };
}

export function StoreHoursClient() {
  const { outletId, capabilities, announce, staleOutletId } = useStoreOutlet();
  const canManage = capabilities?.["outlet.operating_schedule.manage"] === true;
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [drafts, setDrafts] = useState<DraftInterval[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!outletId || staleOutletId) return;
    let cancelled = false;
    void (async () => {
      setView({ kind: "loading" });
      const [profileResult, scheduleResult] = await Promise.all([
        getStoreOperatingProfile(outletId),
        getStoreOperatingSchedule(outletId),
      ]);
      if (cancelled) return;
      if (
        (!profileResult.ok &&
          (profileResult.status === 401 || profileResult.code === "WORKFORCE_AUTH_REQUIRED")) ||
        (!scheduleResult.ok &&
          (scheduleResult.status === 401 || scheduleResult.code === "WORKFORCE_AUTH_REQUIRED"))
      ) {
        setView({ kind: "unauthorized" });
        return;
      }
      if (
        (!profileResult.ok &&
          (profileResult.status === 403 || profileResult.code === "STORE_UNAUTHORIZED")) ||
        (!scheduleResult.ok &&
          (scheduleResult.status === 403 || scheduleResult.code === "STORE_UNAUTHORIZED"))
      ) {
        setView({ kind: "forbidden" });
        return;
      }
      if (!profileResult.ok || !scheduleResult.ok) {
        setView({ kind: "error", message: "Operating hours could not be loaded." });
        return;
      }
      const tz = profileResult.data.profile?.timezone ?? "Asia/Kolkata";
      const nextDrafts = toDraft(scheduleResult.data.intervals);
      setTimezone(tz);
      setDrafts(nextDrafts);
      setValidationError(null);
      setView({ kind: "ready", timezone: tz, intervals: nextDrafts });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, staleOutletId, reloadToken]);

  async function onSave() {
    if (!outletId || !canManage) return;
    const payload = draftsToPayload(drafts);
    if (!payload.ok) {
      setValidationError(payload.message);
      announce(payload.message);
      return;
    }
    setPending(true);
    setValidationError(null);
    announce("Saving hours…");
    const profileResult = await setStoreOperatingProfile(outletId, { timezone });
    if (!profileResult.ok) {
      setPending(false);
      const message = "Timezone could not be saved. Your edits are still on the form.";
      setValidationError(message);
      announce(message);
      return;
    }
    const scheduleResult = await setStoreOperatingSchedule(outletId, payload.intervals);
    setPending(false);
    if (!scheduleResult.ok) {
      const message =
        scheduleResult.code === "STORE_REQUEST_INVALID"
          ? "The schedule was rejected. Check times and try again — your edits are still on the form."
          : "Schedule could not be saved. Your edits are still on the form.";
      setValidationError(message);
      announce(message);
      return;
    }
    announce("Hours saved.");
    setReloadToken((n) => n + 1);
  }

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (view.kind === "loading") {
    return <p aria-live="polite" data-testid="store-hours-loading">Loading hours…</p>;
  }
  if (view.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-hours-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (view.kind === "forbidden") {
    return (
      <p role="alert" data-testid="store-hours-forbidden">
        You do not have permission to view operating hours for this outlet.
      </p>
    );
  }
  if (view.kind === "error") {
    return (
      <div role="alert" data-testid="store-hours-error" className="space-y-3">
        <p>{view.message}</p>
        <Button type="button" onClick={() => setReloadToken((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="store-hours">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-hours-timezone" className="text-sm text-[var(--text-secondary)]">
          Timezone (IANA)
        </label>
        <input
          id="store-hours-timezone"
          data-testid="store-hours-timezone"
          value={timezone}
          disabled={!canManage || pending}
          onChange={(event) => setTimezone(event.target.value)}
          className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-3 text-sm text-[var(--enterprise-text-primary,#FAF3E2)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--enterprise-focus,#A8D832)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--enterprise-bg-page,#1A2210)]"
        />
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        Days without intervals are closed. Overnight spans are not supported.
      </p>

      <ul className="space-y-3">
        {drafts.map((draft, index) => (
          <li key={draft.key} className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Day</span>
              <select
                aria-label={`Day for interval ${index + 1}`}
                disabled={!canManage || pending}
                value={draft.dayOfWeek}
                onChange={(event) => {
                  const dayOfWeek = Number(event.target.value);
                  setDrafts((rows) =>
                    rows.map((row, i) => (i === index ? { ...row, dayOfWeek } : row)),
                  );
                }}
                className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-2 text-sm text-[var(--enterprise-text-primary,#FAF3E2)]"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <option key={day} value={day}>
                    {dayOfWeekLabel(day)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Opens</span>
              <input
                aria-label={`Opens for interval ${index + 1}`}
                data-testid={`store-hours-start-${index}`}
                value={draft.startTime}
                disabled={!canManage || pending}
                onChange={(event) => {
                  const startTime = event.target.value;
                  setDrafts((rows) =>
                    rows.map((row, i) => (i === index ? { ...row, startTime } : row)),
                  );
                }}
                className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-2 text-sm text-[var(--enterprise-text-primary,#FAF3E2)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Closes</span>
              <input
                aria-label={`Closes for interval ${index + 1}`}
                data-testid={`store-hours-end-${index}`}
                value={draft.endTime}
                disabled={!canManage || pending}
                onChange={(event) => {
                  const endTime = event.target.value;
                  setDrafts((rows) =>
                    rows.map((row, i) => (i === index ? { ...row, endTime } : row)),
                  );
                }}
                className="min-h-11 rounded-md border border-[var(--enterprise-border,#3D6026)] bg-[var(--bg-surface,#2E4720)] px-2 text-sm text-[var(--enterprise-text-primary,#FAF3E2)]"
              />
            </label>
            {canManage ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setDrafts((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              setDrafts((rows) => [
                ...rows,
                {
                  key: `new-${Date.now()}`,
                  dayOfWeek: 1,
                  startTime: "09:00",
                  endTime: "21:00",
                },
              ])
            }
          >
            Add interval
          </Button>
          <Button
            type="button"
            data-testid="store-hours-save"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void onSave()}
          >
            Save hours
          </Button>
        </div>
      ) : null}

      {validationError ? (
        <p role="alert" data-testid="store-hours-validation" className="text-sm">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
