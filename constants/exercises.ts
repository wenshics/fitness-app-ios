export type Difficulty = "beginner" | "intermediate" | "advanced";
export type MuscleGroup = "full-body" | "legs" | "core" | "chest" | "arms" | "back" | "glutes" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  difficulty: Difficulty;
  muscleGroups: MuscleGroup[];
  defaultDuration: number; // seconds
  youtubeVideoId: string;
  description: string;
  instructions: string[];
  thumbnail: string;
}

export const EXERCISES: Exercise[] = [
  // === BEGINNER (6) ===
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    difficulty: "beginner",
    muscleGroups: ["full-body", "cardio"],
    defaultDuration: 30,
    youtubeVideoId: "XR0xeuK5zBU",
    description: "A classic full-body cardio exercise that raises your heart rate and warms up your muscles.",
    instructions: [
      "Stand upright with your legs together and arms at your sides.",
      "Jump and spread your legs shoulder-width apart while raising your arms overhead.",
      "Jump again to return to the starting position.",
      "Repeat at a steady pace.",
    ],
    thumbnail: "https://img.youtube.com/vi/XR0xeuK5zBU/hqdefault.jpg",
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    difficulty: "beginner",
    muscleGroups: ["legs"],
    defaultDuration: 30,
    youtubeVideoId: "cWTZ8Am1Ee0",
    description: "An isometric exercise that builds endurance in your quadriceps and glutes.",
    instructions: [
      "Stand with your back flat against a wall.",
      "Slide down until your thighs are parallel to the floor.",
      "Keep your knees directly above your ankles.",
      "Hold the position for the set duration.",
    ],
    thumbnail: "https://img.youtube.com/vi/cWTZ8Am1Ee0/hqdefault.jpg",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    difficulty: "beginner",
    muscleGroups: ["glutes", "legs"],
    defaultDuration: 30,
    youtubeVideoId: "OUgsJ8-Vi0E",
    description: "Targets your glutes and hamstrings while strengthening your lower back.",
    instructions: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Push through your heels to lift your hips toward the ceiling.",
      "Squeeze your glutes at the top.",
      "Lower back down slowly and repeat.",
    ],
    thumbnail: "https://img.youtube.com/vi/OUgsJ8-Vi0E/hqdefault.jpg",
  },
  {
    id: "high-knees",
    name: "High Knees",
    difficulty: "beginner",
    muscleGroups: ["cardio", "legs"],
    defaultDuration: 30,
    youtubeVideoId: "oDdkytliOqE",
    description: "A high-intensity cardio exercise that strengthens your legs and core.",
    instructions: [
      "Stand with your feet hip-width apart.",
      "Drive one knee up toward your chest.",
      "Quickly switch to the other knee.",
      "Pump your arms as you alternate knees at a running pace.",
    ],
    thumbnail: "https://img.youtube.com/vi/oDdkytliOqE/hqdefault.jpg",
  },
  {
    id: "bicycle-crunches",
    name: "Bicycle Crunches",
    difficulty: "beginner",
    muscleGroups: ["core"],
    defaultDuration: 30,
    youtubeVideoId: "cbKIDZ_XyjY",
    description: "An effective core exercise that targets your obliques and rectus abdominis.",
    instructions: [
      "Lie on your back with hands behind your head.",
      "Lift your shoulders off the ground and bring one knee toward your chest.",
      "Rotate your torso to touch the opposite elbow to the knee.",
      "Alternate sides in a pedaling motion.",
    ],
    thumbnail: "https://img.youtube.com/vi/cbKIDZ_XyjY/hqdefault.jpg",
  },
  {
    id: "superman",
    name: "Superman",
    difficulty: "beginner",
    muscleGroups: ["back", "core"],
    defaultDuration: 30,
    youtubeVideoId: "J9zXkxUAfUA",
    description: "Strengthens your lower back, glutes, and shoulders.",
    instructions: [
      "Lie face down with arms extended in front of you.",
      "Simultaneously lift your arms, chest, and legs off the floor.",
      "Hold for 2-3 seconds at the top.",
      "Lower back down and repeat.",
    ],
    thumbnail: "https://img.youtube.com/vi/J9zXkxUAfUA/hqdefault.jpg",
  },

  // === INTERMEDIATE (5) ===
  {
    id: "push-ups",
    name: "Push-Ups",
    difficulty: "intermediate",
    muscleGroups: ["chest", "arms", "core"],
    defaultDuration: 30,
    youtubeVideoId: "I9fsqKE5XHo",
    description: "The classic upper body exercise that builds chest, shoulder, and tricep strength.",
    instructions: [
      "Start in a high plank position with hands slightly wider than shoulder-width.",
      "Keep your body in a straight line from head to heels.",
      "Lower your chest toward the floor by bending your elbows.",
      "Push back up to the starting position.",
    ],
    thumbnail: "https://img.youtube.com/vi/I9fsqKE5XHo/hqdefault.jpg",
  },
  {
    id: "squats",
    name: "Squats",
    difficulty: "intermediate",
    muscleGroups: ["legs", "glutes"],
    defaultDuration: 45,
    youtubeVideoId: "LyidZ42Iy9Q",
    description: "A fundamental lower body exercise that targets your quads, hamstrings, and glutes.",
    instructions: [
      "Stand with feet shoulder-width apart.",
      "Push your hips back and bend your knees as if sitting in a chair.",
      "Lower until your thighs are parallel to the floor.",
      "Drive through your heels to stand back up.",
    ],
    thumbnail: "https://img.youtube.com/vi/LyidZ42Iy9Q/hqdefault.jpg",
  },
  {
    id: "plank",
    name: "Plank",
    difficulty: "intermediate",
    muscleGroups: ["core", "full-body"],
    defaultDuration: 45,
    youtubeVideoId: "6LqqeBtFn9M",
    description: "An isometric core exercise that strengthens your entire midsection.",
    instructions: [
      "Start in a forearm plank position with elbows under shoulders.",
      "Keep your body in a straight line from head to heels.",
      "Engage your core and avoid letting your hips sag or pike.",
      "Hold the position for the set duration.",
    ],
    thumbnail: "https://img.youtube.com/vi/6LqqeBtFn9M/hqdefault.jpg",
  },
  {
    id: "lunges",
    name: "Lunges",
    difficulty: "intermediate",
    muscleGroups: ["legs", "glutes"],
    defaultDuration: 45,
    youtubeVideoId: "wrwwXE_x-pQ",
    description: "A unilateral leg exercise that improves balance and lower body strength.",
    instructions: [
      "Stand tall with feet hip-width apart.",
      "Step forward with one leg and lower your hips.",
      "Both knees should bend to about 90 degrees.",
      "Push back to the starting position and alternate legs.",
    ],
    thumbnail: "https://img.youtube.com/vi/wrwwXE_x-pQ/hqdefault.jpg",
  },
  {
    id: "tricep-dips",
    name: "Tricep Dips",
    difficulty: "intermediate",
    muscleGroups: ["arms", "chest"],
    defaultDuration: 30,
    youtubeVideoId: "0326dy_-CzM",
    description: "Targets the triceps using a bench or chair for support.",
    instructions: [
      "Sit on the edge of a sturdy chair or bench.",
      "Place your hands beside your hips, fingers gripping the edge.",
      "Slide off the edge and lower your body by bending your elbows.",
      "Push back up until your arms are straight.",
    ],
    thumbnail: "https://img.youtube.com/vi/0326dy_-CzM/hqdefault.jpg",
  },

  // === ADVANCED (5) ===
  {
    id: "burpees",
    name: "Burpees",
    difficulty: "advanced",
    muscleGroups: ["full-body", "cardio"],
    defaultDuration: 45,
    youtubeVideoId: "auBLPXO8Fww",
    description: "A high-intensity full-body exercise that combines a squat, push-up, and jump.",
    instructions: [
      "Stand with feet shoulder-width apart.",
      "Drop into a squat and place your hands on the floor.",
      "Jump your feet back into a plank and perform a push-up.",
      "Jump your feet forward and explode upward into a jump.",
    ],
    thumbnail: "https://img.youtube.com/vi/auBLPXO8Fww/hqdefault.jpg",
  },
  {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    difficulty: "advanced",
    muscleGroups: ["full-body", "cardio", "core"],
    defaultDuration: 45,
    youtubeVideoId: "ixxk9Qfn61o",
    description: "A dynamic exercise that builds cardiovascular endurance and core strength.",
    instructions: [
      "Start in a high plank position.",
      "Drive one knee toward your chest.",
      "Quickly switch legs, bringing the other knee forward.",
      "Continue alternating at a fast pace.",
    ],
    thumbnail: "https://img.youtube.com/vi/ixxk9Qfn61o/hqdefault.jpg",
  },
  {
    id: "diamond-push-ups",
    name: "Diamond Push-Ups",
    difficulty: "advanced",
    muscleGroups: ["chest", "arms"],
    defaultDuration: 30,
    youtubeVideoId: "J0DnG1_S92I",
    description: "A push-up variation that places greater emphasis on the triceps.",
    instructions: [
      "Start in a push-up position with hands close together forming a diamond shape.",
      "Keep your body in a straight line.",
      "Lower your chest toward your hands.",
      "Push back up to the starting position.",
    ],
    thumbnail: "https://img.youtube.com/vi/J0DnG1_S92I/hqdefault.jpg",
  },
  {
    id: "jump-squats",
    name: "Jump Squats",
    difficulty: "advanced",
    muscleGroups: ["legs", "cardio"],
    defaultDuration: 45,
    youtubeVideoId: "72BSZupb-1I",
    description: "An explosive plyometric exercise that builds lower body power.",
    instructions: [
      "Stand with feet shoulder-width apart.",
      "Lower into a squat position.",
      "Explode upward into a jump, extending your body fully.",
      "Land softly and immediately lower into the next squat.",
    ],
    thumbnail: "https://img.youtube.com/vi/72BSZupb-1I/hqdefault.jpg",
  },
  {
    id: "pistol-squats",
    name: "Pistol Squats",
    difficulty: "advanced",
    muscleGroups: ["legs"],
    defaultDuration: 30,
    youtubeVideoId: "vq5-vdgJc0I",
    description: "A challenging single-leg squat that requires strength, balance, and flexibility.",
    instructions: [
      "Stand on one leg with the other extended in front of you.",
      "Slowly lower your body on the standing leg.",
      "Go as low as you can while keeping balance.",
      "Push through your heel to stand back up.",
    ],
    thumbnail: "https://img.youtube.com/vi/vq5-vdgJc0I/hqdefault.jpg",
  },
];

export const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; text: string }> = {
  beginner: { bg: "#34C759", text: "#FFFFFF" },
  intermediate: { bg: "#FF9500", text: "#FFFFFF" },
  advanced: { bg: "#FF3B30", text: "#FFFFFF" },
};

export const DEFAULT_REST_TIME = 15; // seconds
export const DEFAULT_BEGINNER_PLAN = [
  "jumping-jacks",
  "wall-sit",
  "glute-bridge",
  "high-knees",
  "bicycle-crunches",
  "superman",
];
