import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  HeartPulse,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  calculateBMI,
  calculateCalorieGuidance,
  HEALTHY_BMI_MIN,
  hasScreeningRisk,
  isEligibleAge,
  kgToLbs,
  lbsToKg,
} from "@/lib/fitness-engine";
import { COPY, GOAL_LABELS } from "@/lib/i18n";
import { DAY_LABELS_EN, DAY_LABELS_ID } from "@/lib/plan-builder";
import { cn } from "@/lib/utils";
import type {
  ActivityLevel,
  BiologicalSex,
  ConsentRecord,
  DayOfWeek,
  ExperienceLevel,
  GoalType,
  HealthScreening,
  Language,
  UnitSystem,
  UserGoal,
  UserProfile,
} from "@/types/fitness";

export function OnboardingWizard({
  initialProfile,
  initialGoal,
  initialConsent,
  isEditingExisting = false,
  onCancel,
  onComplete,
}: {
  initialProfile: UserProfile;
  initialGoal: UserGoal;
  initialConsent: ConsentRecord;
  isEditingExisting?: boolean;
  onCancel?: () => void;
  onComplete: (result: { profile: UserProfile; goal: UserGoal; consent: ConsentRecord }) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initialProfile.name);
  const [ageStr, setAgeStr] = useState(String(initialProfile.age));
  const [sex, setSex] = useState<BiologicalSex>(initialProfile.sex);
  const [language, setLanguage] = useState<Language>(initialProfile.language);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile.unitSystem);
  const [weightInput, setWeightInput] = useState(
    initialProfile.unitSystem === "imperial"
      ? String(Math.round(kgToLbs(initialProfile.weightKg)))
      : String(Math.round(initialProfile.weightKg)),
  );
  const [heightInput, setHeightInput] = useState(
    initialProfile.unitSystem === "imperial"
      ? String(Math.round(initialProfile.heightCm / 2.54))
      : String(Math.round(initialProfile.heightCm)),
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(initialProfile.activityLevel);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile.experienceLevel,
  );
  const [gymAccess, setGymAccess] = useState(initialProfile.gymAccess);
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(initialProfile.availableDays);
  const [goalType, setGoalType] = useState<GoalType>(initialGoal.type);
  const [targetWeightInput, setTargetWeightInput] = useState(
    initialGoal.targetWeightKg
      ? initialProfile.unitSystem === "imperial"
        ? String(Math.round(kgToLbs(initialGoal.targetWeightKg)))
        : String(Math.round(initialGoal.targetWeightKg))
      : "",
  );
  const [targetDate, setTargetDate] = useState(initialGoal.targetDate ?? "2027-02-20");
  const [runningTargetDesc, setRunningTargetDesc] = useState(
    initialGoal.runningTargetDescription ?? "Run 5K steadily",
  );
  const [fiveKMinutes, setFiveKMinutes] = useState(
    initialProfile.selfReported5kMinutes ? String(initialProfile.selfReported5kMinutes) : "28",
  );
  const [screening, setScreening] = useState<HealthScreening>(initialProfile.screening);
  const [acceptedAge18, setAcceptedAge18] = useState(initialConsent.acceptedAge18Plus);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(
    initialConsent.acceptedMedicalDisclaimer,
  );

  const copy = COPY[language];
  const dayLabels = language === "id" ? DAY_LABELS_ID : DAY_LABELS_EN;

  const parsedAge = Number(ageStr) || 0;
  const weightKg =
    unitSystem === "imperial"
      ? lbsToKg(Math.max(60, Number(weightInput) || 150))
      : Math.max(30, Number(weightInput) || 70);
  const heightCm =
    unitSystem === "imperial"
      ? Math.max(48, Number(heightInput) || 68) * 2.54
      : Math.max(120, Number(heightInput) || 170);
  const targetWeightKg = targetWeightInput
    ? unitSystem === "imperial"
      ? lbsToKg(Number(targetWeightInput) || 0)
      : Number(targetWeightInput) || undefined
    : undefined;

  const draftProfile: UserProfile = {
    ...initialProfile,
    name: name.trim() || "Athlete",
    age: parsedAge,
    sex,
    language,
    weightKg: Number(weightKg.toFixed(1)),
    heightCm: Number(heightCm.toFixed(1)),
    activityLevel,
    experienceLevel,
    gymAccess,
    availableDays: availableDays.length > 0 ? availableDays : [0, 2, 4],
    unitSystem,
    selfReported5kMinutes: Number(fiveKMinutes) > 10 ? Number(fiveKMinutes) : undefined,
    screening,
    updatedAt: new Date().toISOString(),
  };

  const draftGoal: UserGoal = {
    ...initialGoal,
    type: goalType,
    targetWeightKg:
      goalType === "lose_weight" || goalType === "gain_muscle" ? targetWeightKg : undefined,
    targetDate: goalType === "lose_weight" ? targetDate : undefined,
    runningTargetType: goalType === "improve_running" ? "pace" : undefined,
    runningTargetDescription: goalType === "improve_running" ? runningTargetDesc : undefined,
    updatedAt: new Date().toISOString(),
  };

  const previewCalories = calculateCalorieGuidance(draftProfile, draftGoal);
  const bmi = calculateBMI(draftProfile.weightKg, draftProfile.heightCm);
  const targetBmi =
    targetWeightKg !== undefined ? calculateBMI(targetWeightKg, draftProfile.heightCm) : null;
  const ageBlocked = !isEligibleAge(parsedAge);
  const screeningFlagged = hasScreeningRisk(screening);

  function toggleDay(day: DayOfWeek) {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleUnitToggle(nextUnit: UnitSystem) {
    if (nextUnit === unitSystem) return;
    if (nextUnit === "imperial") {
      setWeightInput(String(Math.round(kgToLbs(Number(weightInput) || 70))));
      setHeightInput(String(Math.round((Number(heightInput) || 170) / 2.54)));
      if (targetWeightInput) {
        setTargetWeightInput(String(Math.round(kgToLbs(Number(targetWeightInput)))));
      }
    } else {
      setWeightInput(String(Math.round(lbsToKg(Number(weightInput) || 154))));
      setHeightInput(String(Math.round((Number(heightInput) || 68) * 2.54)));
      if (targetWeightInput) {
        setTargetWeightInput(String(Math.round(lbsToKg(Number(targetWeightInput)))));
      }
    }
    setUnitSystem(nextUnit);
  }

  function submitOnboarding() {
    if (ageBlocked || !acceptedAge18 || !acceptedDisclaimer) return;
    onComplete({
      profile: draftProfile,
      goal: draftGoal,
      consent: {
        ...initialConsent,
        acceptedAge18Plus: acceptedAge18,
        acceptedMedicalDisclaimer: acceptedDisclaimer,
        acceptedHealthDataProcessing: true,
        consentedAt: new Date().toISOString(),
      },
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-3 arc-enter">
      <header className="flex items-center justify-between gap-2 pb-3">
        {isEditingExisting && onCancel ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={onCancel}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
        )}
        <div className="flex-1 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {language === "id" ? `Langkah ${step} dari 3` : `Step ${step} of 3`}
          </p>
          <h1 className="text-base font-bold">
            {isEditingExisting ? copy.editProfileTitle : copy.onboardingTitle}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLanguage((l) => (l === "en" ? "id" : "en"))}
            aria-label="Toggle language"
            className="arc-focus min-h-[36px] rounded-xl border bg-card px-2.5 text-xs font-semibold text-foreground cursor-pointer hover:bg-accent"
          >
            {language.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle(unitSystem === "metric" ? "imperial" : "metric")}
            aria-label="Toggle measurement unit"
            className="arc-focus min-h-[36px] rounded-xl border bg-primary px-2.5 text-xs font-semibold text-primary-foreground cursor-pointer"
          >
            {unitSystem === "metric" ? "kg/cm" : "lb/in"}
          </button>
        </div>
      </header>

      <div className="mb-4 flex gap-2" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              n <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 pb-6">
          <div className="arc-card p-4 space-y-3.5">
            <div>
              <Label htmlFor="ob-name" className="text-xs font-semibold">
                {language === "id" ? "Nama panggilan" : "First name"}
              </Label>
              <Input
                id="ob-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dimas"
                className="mt-1.5 h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ob-age" className="text-xs font-semibold">
                  {language === "id" ? "Usia (wajib 18+)" : "Age (18+ required)"}
                </Label>
                <Input
                  id="ob-age"
                  type="number"
                  min={10}
                  max={99}
                  value={ageStr}
                  onChange={(e) => setAgeStr(e.target.value)}
                  className="mt-1.5 h-10 tabular-nums"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  {language === "id" ? "Jenis kelamin (BMR)" : "Sex (for BMR formula)"}
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(["female", "male"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={sex === s}
                      onClick={() => setSex(s)}
                      className={cn(
                        "arc-focus min-h-[40px] rounded-xl border text-xs font-semibold capitalize cursor-pointer transition-colors",
                        sex === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {ageBlocked && (
              <div
                role="alert"
                className="badge-rose flex items-start gap-2.5 rounded-2xl p-3 text-xs"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This app is designed for adults 18 and older. Plans cannot be generated for users
                  under 18.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ob-weight" className="text-xs font-semibold">
                  {language === "id" ? "Berat badan" : "Weight"} (
                  {unitSystem === "metric" ? "kg" : "lb"})
                </Label>
                <Input
                  id="ob-weight"
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="mt-1.5 h-10 tabular-nums"
                />
              </div>
              <div>
                <Label htmlFor="ob-height" className="text-xs font-semibold">
                  {language === "id" ? "Tinggi badan" : "Height"} (
                  {unitSystem === "metric" ? "cm" : "in"})
                </Label>
                <Input
                  id="ob-height"
                  type="number"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="mt-1.5 h-10 tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-muted/70 px-3.5 py-2.5 text-xs text-muted-foreground flex justify-between items-center">
              <span>{language === "id" ? "BMI Terhitung" : "Calculated BMI"}</span>
              <strong className="text-foreground tabular-nums">{bmi} kg/m²</strong>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                {language === "id" ? "Tingkat aktivitas harian" : "Daily activity baseline"}
              </Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    ["sedentary", "Sedentary (Desk)"],
                    ["light", "Lightly Active"],
                    ["moderate", "Moderately Active"],
                    ["active", "Very Active"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={activityLevel === key}
                    onClick={() => setActivityLevel(key)}
                    className={cn(
                      "arc-focus min-h-[42px] rounded-xl border px-3 py-2 text-left text-xs font-medium cursor-pointer transition-colors",
                      activityLevel === key
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            className="w-full rounded-2xl h-12 text-sm font-semibold"
            disabled={ageBlocked}
            onClick={() => setStep(2)}
          >
            {language === "id" ? "Lanjut ke Target & Latihan" : "Continue to Training & Goal"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 pb-6">
          <div className="arc-card p-4 space-y-3.5">
            <div>
              <Label className="text-xs font-semibold">
                {language === "id" ? "Target utama" : "Primary training goal"}
              </Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["lose_weight", "gain_muscle", "maintain", "improve_running"] as const).map(
                  (g) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={goalType === g}
                      onClick={() => setGoalType(g)}
                      className={cn(
                        "arc-focus min-h-[44px] rounded-xl border p-3 text-left text-xs font-semibold cursor-pointer transition-all",
                        goalType === g
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-foreground hover:bg-accent",
                      )}
                    >
                      {GOAL_LABELS[language][g]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {(goalType === "lose_weight" || goalType === "gain_muscle") && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ob-target-w" className="text-xs font-semibold">
                      {language === "id" ? "Target berat" : "Target weight"} (
                      {unitSystem === "metric" ? "kg" : "lb"})
                    </Label>
                    <Input
                      id="ob-target-w"
                      type="number"
                      value={targetWeightInput}
                      onChange={(e) => setTargetWeightInput(e.target.value)}
                      placeholder="70"
                      className="mt-1.5 h-10 tabular-nums"
                    />
                  </div>
                  {goalType === "lose_weight" && (
                    <div>
                      <Label htmlFor="ob-target-date" className="text-xs font-semibold">
                        {language === "id" ? "Tanggal target" : "Target date"}
                      </Label>
                      <Input
                        id="ob-target-date"
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="mt-1.5 h-10 tabular-nums"
                      />
                    </div>
                  )}
                </div>
                {goalType === "lose_weight" &&
                  targetBmi !== null &&
                  targetBmi < HEALTHY_BMI_MIN && (
                    <p className="badge-amber rounded-xl px-3 py-2 text-[11px] font-medium">
                      Target weight places BMI ({targetBmi}) below {HEALTHY_BMI_MIN}. Calorie
                      guidance will automatically protect healthy BMI.
                    </p>
                  )}
              </div>
            )}

            {goalType === "improve_running" && (
              <div>
                <Label htmlFor="ob-run-target" className="text-xs font-semibold">
                  {language === "id"
                    ? "Target lari (jarak atau pace)"
                    : "Running target (distance or pace)"}
                </Label>
                <Input
                  id="ob-run-target"
                  value={runningTargetDesc}
                  onChange={(e) => setRunningTargetDesc(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">
                {language === "id" ? "Tingkat pengalaman" : "Experience level"}
              </Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={experienceLevel === lvl}
                    onClick={() => setExperienceLevel(lvl)}
                    className={cn(
                      "arc-focus min-h-[40px] rounded-xl border py-2 text-xs font-semibold capitalize cursor-pointer",
                      experienceLevel === lvl
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3.5">
              <div className="flex items-center gap-3 pr-2">
                <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold">
                    {language === "id" ? "Akses ke gym" : "Gym equipment access"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {language === "id"
                      ? "Matikan untuk latihan beban tubuh di rumah"
                      : "Switch off for home bodyweight templates"}
                  </p>
                </div>
              </div>
              <Switch checked={gymAccess} onCheckedChange={setGymAccess} aria-label="Gym access" />
            </div>

            <div>
              <Label className="text-xs font-semibold">
                {language === "id"
                  ? `Hari tersedia (${availableDays.length} dipilih)`
                  : `Training days available (${availableDays.length} selected)`}
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {language === "id"
                  ? "Sistem otomatis menyisakan minimal 1 hari istirahat."
                  : "Plan builder automatically reserves at least 1 rest day per week."}
              </p>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {dayLabels.map((lbl, idx) => {
                  const day = idx as DayOfWeek;
                  const active = availableDays.includes(day);
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={active}
                      className={cn(
                        "arc-focus min-h-[42px] rounded-xl text-xs font-semibold border cursor-pointer transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground hover:bg-accent",
                      )}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="ob-5k" className="text-xs font-semibold">
                {language === "id"
                  ? "Estimasi waktu lari 5K dalam menit (opsional)"
                  : "Recent 5K time in minutes (optional, for pace zones)"}
              </Label>
              <Input
                id="ob-5k"
                type="number"
                value={fiveKMinutes}
                onChange={(e) => setFiveKMinutes(e.target.value)}
                placeholder="28"
                className="mt-1.5 h-10 tabular-nums"
              />
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button variant="outline" className="rounded-2xl h-12 px-4" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button className="flex-1 rounded-2xl h-12 font-semibold" onClick={() => setStep(3)}>
              {language === "id" ? "Skrining Kesehatan" : "Health Screening"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 pb-6">
          <div className="arc-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold">
                {language === "id"
                  ? "Skrining Keamanan & Kesehatan"
                  : "Quick Safety & Health Screening"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Do any of these apply to you? Positive answers route to clinician guidance and disable
              aggressive targets.
            </p>

            {(
              [
                ["pregnancy", "Currently pregnant or recently postpartum"],
                ["heartCondition", "Heart, blood pressure, or chest pain condition"],
                ["jointOrInjury", "Active joint injury or doctor-restricted movement"],
                ["eatingDisorderHistory", "History of eating disorder or restrictive dieting"],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-xs cursor-pointer hover:bg-accent/40 transition-colors"
              >
                <span className="font-medium text-foreground leading-snug">{label}</span>
                <Switch
                  checked={screening[field]}
                  onCheckedChange={(checked) =>
                    setScreening((prev) => ({ ...prev, [field]: checked }))
                  }
                  aria-label={label}
                />
              </label>
            ))}

            {screeningFlagged && (
              <div
                role="status"
                className="badge-amber flex items-start gap-2.5 rounded-2xl p-3 text-xs"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Consult a healthcare professional</p>
                  <p className="mt-0.5 leading-snug">
                    Because a screening item is checked, high-intensity intervals and aggressive
                    calorie deficits are automatically restricted.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-muted/70 p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Preview Daily Calorie Range</span>
                <strong className="tabular-nums text-sm">
                  {previewCalories.rangeMin}–{previewCalories.rangeMax} kcal
                </strong>
              </div>
              {previewCalories.warnings.map((w) => (
                <p key={w} className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  • {w}
                </p>
              ))}
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-xs cursor-pointer hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={acceptedAge18}
                  onChange={(e) => setAcceptedAge18(e.target.checked)}
                  className="h-4 w-4 rounded border accent-primary shrink-0"
                />
                <span>I confirm I am 18 years or older.</span>
              </label>
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2 text-xs cursor-pointer hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={acceptedDisclaimer}
                  onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                  className="h-4 w-4 rounded border accent-primary shrink-0"
                />
                <span>
                  I understand this app provides general fitness guidance and is{" "}
                  <strong>not medical advice</strong>.
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button variant="outline" className="rounded-2xl h-12 px-4" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="flex-1 rounded-2xl h-12 font-semibold"
              disabled={!acceptedAge18 || !acceptedDisclaimer || ageBlocked}
              onClick={submitOnboarding}
            >
              <Check className="h-4 w-4" /> Generate Weekly Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
