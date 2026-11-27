import { describe, expect, it, vi } from "vitest";

import { getSupabaseClient } from "@/lib/supabase";
import {
  ensureSupabaseSession,
  fetchApprovedKnowledgeBase,
  syncGymLog,
  syncRunLog,
  syncWeightEntry,
} from "@/lib/supabase-sync";
import type { GymLog, RunLog, WeightEntry } from "@/types/fitness";

describe("Supabase Cloud Sync Layer", () => {
  it("initializes browser client safely with publishable key and handles sync calls cleanly", async () => {
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const fromSpy = vi.spyOn(client!, "from").mockImplementation(
      () =>
        ({
          upsert: upsertSpy,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }) as unknown as ReturnType<NonNullable<typeof client>["from"]>,
    );

    const sampleRun: RunLog = {
      id: "run-test-1",
      runKind: "casual_run",
      title: "Test Park Run",
      dateISO: "2026-11-27",
      distanceKm: 5.0,
      durationSec: 1800,
      avgPaceMinPerKm: 6.0,
      splits: [],
      routePoints: [],
      entrySource: "gps",
      createdAt: "2026-11-27T10:00:00Z",
    };

    const sampleGym: GymLog = {
      id: "gym-test-1",
      title: "Full Body Foundation",
      dateISO: "2026-11-27",
      durationMinutes: 40,
      exercises: [
        {
          exerciseId: "ex-goblet-squat",
          exerciseName: "Goblet Squat",
          setsCompleted: 3,
          repsPerSet: "10",
          weightKg: 20,
        },
      ],
      notes: "Clean reps",
      createdAt: "2026-11-27T11:00:00Z",
    };

    const sampleWeight: WeightEntry = {
      id: "w-test-1",
      dateISO: "2026-11-27",
      weightKg: 73.5,
    };

    await syncRunLog("user-uuid-123", sampleRun);
    await syncGymLog("user-uuid-123", sampleGym);
    await syncWeightEntry("user-uuid-123", sampleWeight);

    expect(fromSpy).toHaveBeenCalledWith("sa_run_logs");
    expect(fromSpy).toHaveBeenCalledWith("sa_gym_logs");
    expect(fromSpy).toHaveBeenCalledWith("sa_weight_entries");
    expect(upsertSpy).toHaveBeenCalledTimes(3);

    const kb = await fetchApprovedKnowledgeBase();
    expect(kb).toBeNull(); // Empty mocked data falls back safely

    fromSpy.mockRestore();
  });

  it("handles disabled anonymous sign-in gracefully without throwing", async () => {
    const client = getSupabaseClient()!;
    const getSessionSpy = vi
      .spyOn(client.auth, "getSession")
      .mockResolvedValue({ data: { session: null }, error: null });
    const anonSpy = vi.spyOn(client.auth, "signInAnonymously").mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Anonymous sign-ins are disabled" } as never,
    });

    const res = await ensureSupabaseSession();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("auth_required");
    }

    getSessionSpy.mockRestore();
    anonSpy.mockRestore();
  });
});
