import type { ExperienceLevel, GoalType, GymTemplate } from "@/types/fitness";

export const GYM_TEMPLATES: GymTemplate[] = [
  {
    id: "gym-full-body-foundation",
    name: "Full Body Foundation",
    splitLabel: "Full Body (2–3 days/wk)",
    goal: "all",
    level: "beginner",
    requiresGym: true,
    estimatedMinutes: 40,
    exercises: [
      {
        id: "ex-goblet-squat",
        name: "Goblet Squat",
        muscleGroup: "Quads & Glutes",
        sets: 3,
        reps: "10–12",
        restSeconds: 75,
        equipment: "gym",
        description: "Hold a dumbbell vertically at chest height and squat to parallel.",
        formTips: [
          "Keep chest tall and ribs stacked",
          "Drive knees slightly out over toes",
          "Control descent for 2 seconds",
        ],
      },
      {
        id: "ex-db-bench",
        name: "Dumbbell Chest Press",
        muscleGroup: "Chest & Triceps",
        sets: 3,
        reps: "10–12",
        restSeconds: 75,
        equipment: "gym",
        description: "Press dumbbells up from mid-chest while keeping shoulder blades tucked.",
        formTips: [
          "Plant feet firmly on the floor",
          "Keep wrists stacked over elbows",
          "Lower with control to chest line",
        ],
      },
      {
        id: "ex-cable-row",
        name: "Seated Cable Row",
        muscleGroup: "Upper Back & Lats",
        sets: 3,
        reps: "10–12",
        restSeconds: 75,
        equipment: "gym",
        description: "Pull handle toward lower ribs while squeezing shoulder blades together.",
        formTips: [
          "Avoid swinging your torso backward",
          "Lead pull with elbows, not hands",
          "Pause 1 second at peak squeeze",
        ],
      },
      {
        id: "ex-rdl-db",
        name: "Dumbbell Romanian Deadlift",
        muscleGroup: "Hamstrings & Posterior",
        sets: 3,
        reps: "8–10",
        restSeconds: 90,
        equipment: "gym",
        description: "Hinge hips backward with soft knees until you feel a hamstring stretch.",
        formTips: [
          "Keep dumbbells close to thighs",
          "Maintain a neutral spine throughout",
          "Squeeze glutes to stand tall",
        ],
      },
      {
        id: "ex-plank",
        name: "Forearm Plank",
        muscleGroup: "Core",
        sets: 3,
        reps: "35–45s",
        restSeconds: 45,
        equipment: "bodyweight",
        description: "Hold a straight line from shoulders to heels while bracing your core.",
        formTips: [
          "Do not let hips sag",
          "Breathe steadily through the nose",
          "Press forearms firmly into mat",
        ],
      },
    ],
  },
  {
    id: "gym-upper-hypertrophy",
    name: "Upper Body Strength & Posture",
    splitLabel: "Upper / Lower Split",
    goal: "gain_muscle",
    level: "intermediate",
    requiresGym: true,
    estimatedMinutes: 50,
    exercises: [
      {
        id: "ex-incline-db",
        name: "Incline Dumbbell Press",
        muscleGroup: "Upper Chest & Shoulders",
        sets: 4,
        reps: "8–10",
        restSeconds: 90,
        equipment: "gym",
        description: "Press from a 30-degree incline bench for balanced upper-body pressing.",
        formTips: [
          "Keep shoulder blades anchored to bench",
          "Track elbows at a 45-degree angle",
          "Avoid locking out forcefully",
        ],
      },
      {
        id: "ex-lat-pulldown",
        name: "Lat Pulldown",
        muscleGroup: "Lats & Biceps",
        sets: 4,
        reps: "8–10",
        restSeconds: 90,
        equipment: "gym",
        description: "Pull bar to upper collarbone with controlled eccentric return.",
        formTips: [
          "Depress shoulders before bending elbows",
          "Keep torso nearly upright",
          "Control bar all the way up",
        ],
      },
      {
        id: "ex-ohp",
        name: "Seated Dumbbell Shoulder Press",
        muscleGroup: "Deltoids",
        sets: 3,
        reps: "10",
        restSeconds: 75,
        equipment: "gym",
        description: "Press dumbbells overhead in line with your ears without arching lower back.",
        formTips: ["Brace abs tightly", "Lower until elbows sit just below shoulders"],
      },
      {
        id: "ex-face-pull",
        name: "Cable Face Pull",
        muscleGroup: "Rear Delts & Rotator Cuff",
        sets: 3,
        reps: "12–15",
        restSeconds: 60,
        equipment: "gym",
        description: "Pull rope attachment toward eye level while externally rotating hands.",
        formTips: [
          "Keep thumbs pointing backward at finish",
          "Use moderate weight for clean posture",
        ],
      },
    ],
  },
  {
    id: "gym-runners-durability",
    name: "Runner's Strength & Durability",
    splitLabel: "Runner Support (2 days/wk)",
    goal: "improve_running",
    level: "all",
    requiresGym: true,
    estimatedMinutes: 35,
    exercises: [
      {
        id: "ex-split-squat",
        name: "Rear-Foot Elevated Split Squat",
        muscleGroup: "Single-Leg Power",
        sets: 3,
        reps: "8 / side",
        restSeconds: 75,
        equipment: "gym",
        description: "Single-leg squat variation to build running stability and stride power.",
        formTips: [
          "Keep front heel planted",
          "Lean torso slightly forward",
          "Track knee straight ahead",
        ],
      },
      {
        id: "ex-calf-raise",
        name: "Weighted Standing Calf Raise",
        muscleGroup: "Calves & Achilles",
        sets: 3,
        reps: "12–15",
        restSeconds: 60,
        equipment: "gym",
        description:
          "Rise smoothly onto the balls of your feet and lower slowly for tendon strength.",
        formTips: ["Pause 1s at top and bottom", "Avoid bouncing through the Achilles"],
      },
      {
        id: "ex-hip-thrust",
        name: "Barbell or Dumbbell Hip Thrust",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "10–12",
        restSeconds: 75,
        equipment: "gym",
        description: "Drive hips upward with upper back on bench to reinforce hip extension.",
        formTips: ["Tuck chin slightly", "Keep shins vertical at top lockout"],
      },
      {
        id: "ex-dead-bug",
        name: "Slow Dead Bug",
        muscleGroup: "Deep Core",
        sets: 3,
        reps: "10 / side",
        restSeconds: 45,
        equipment: "bodyweight",
        description: "Extend opposite arm and leg while pressing lower back gently to the floor.",
        formTips: ["Exhale slowly as limbs extend", "Stop extension before lower back arches"],
      },
    ],
  },
  {
    id: "home-bodyweight-strength",
    name: "Home Bodyweight Strength",
    splitLabel: "No-Gym Full Body",
    goal: "all",
    level: "all",
    requiresGym: false,
    estimatedMinutes: 30,
    exercises: [
      {
        id: "ex-tempo-squat",
        name: "3-Second Tempo Bodyweight Squat",
        muscleGroup: "Quads & Glutes",
        sets: 3,
        reps: "12–15",
        restSeconds: 60,
        equipment: "bodyweight",
        description: "Lower slowly for 3 seconds, pause briefly at depth, and stand explosively.",
        formTips: ["Distribute weight evenly across whole foot", "Keep knees aligned over toes"],
      },
      {
        id: "ex-pushup",
        name: "Incline or Floor Push-Up",
        muscleGroup: "Chest, Shoulders & Core",
        sets: 3,
        reps: "8–12",
        restSeconds: 60,
        equipment: "bodyweight",
        description:
          "Keep body rigid like a plank and lower chest smoothly toward floor or sturdy bench.",
        formTips: [
          "Elbows angled ~45° from ribs",
          "Elevate hands on a bench if needed for clean reps",
        ],
      },
      {
        id: "ex-glute-bridge",
        name: "Single-Leg Glute Bridge",
        muscleGroup: "Glutes & Hamstrings",
        sets: 3,
        reps: "10 / side",
        restSeconds: 60,
        equipment: "bodyweight",
        description: "Lift hips using one planted heel while keeping pelvis level.",
        formTips: ["Avoid twisting hips", "Drive through heel, not lower back"],
      },
      {
        id: "ex-bird-dog",
        name: "Controlled Bird-Dog Hold",
        muscleGroup: "Posterior Core & Back",
        sets: 3,
        reps: "8 / side",
        restSeconds: 45,
        equipment: "bodyweight",
        description: "Reach opposite arm and leg straight out from all fours with a 2-second hold.",
        formTips: ["Keep hips square to the floor", "Move slowly without shifting weight"],
      },
    ],
  },
];

export function selectGymTemplate(
  goal: GoalType,
  level: ExperienceLevel,
  gymAccess: boolean,
): GymTemplate {
  if (!gymAccess) {
    return GYM_TEMPLATES.find((t) => !t.requiresGym)!;
  }
  const exact = GYM_TEMPLATES.find(
    (t) => t.requiresGym && t.goal === goal && (t.level === level || t.level === "all"),
  );
  if (exact) return exact;

  if (goal === "improve_running") {
    return GYM_TEMPLATES.find((t) => t.id === "gym-runners-durability")!;
  }
  if (goal === "gain_muscle" && level !== "beginner") {
    return GYM_TEMPLATES.find((t) => t.id === "gym-upper-hypertrophy")!;
  }
  return GYM_TEMPLATES.find((t) => t.id === "gym-full-body-foundation")!;
}

export function getExerciseById(exerciseId: string) {
  for (const template of GYM_TEMPLATES) {
    const found = template.exercises.find((e) => e.id === exerciseId);
    if (found) return found;
  }
  return undefined;
}
