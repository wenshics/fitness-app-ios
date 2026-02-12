import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import { DEFAULT_REST_TIME, EXERCISES, type Category, type Difficulty } from "@/constants/exercises";

// ===== DAILY PLAN GENERATOR =====
function generateDailyPlan(date: string, difficulty?: Difficulty): string[] {
  // Use date as seed for deterministic but daily-changing plans
  const seed = date.split("-").reduce((acc, n) => acc * 31 + parseInt(n, 10), 0);
  const rng = (i: number) => ((seed * 9301 + 49297 + i * 1327) % 233280) / 233280;

  const targetCount = 8; // 8 exercises per daily plan
  const plan: string[] = [];

  // Ensure variety: pick from different categories
  const categories: Category[] = ["bodyweight", "stretch", "fat-burning", "gym"];
  const exercisesByCategory: Record<string, typeof EXERCISES> = {};
  for (const cat of categories) {
    exercisesByCategory[cat] = EXERCISES.filter((e) => e.category === cat);
  }

  // Pick 3 bodyweight, 2 stretch, 2 fat-burning, 1 gym
  const distribution: { cat: Category; count: number }[] = [
    { cat: "bodyweight", count: 3 },
    { cat: "stretch", count: 2 },
    { cat: "fat-burning", count: 2 },
    { cat: "gym", count: 1 },
  ];

  let rngIdx = 0;
  for (const { cat, count } of distribution) {
    const pool = exercisesByCategory[cat] || [];
    // Shuffle pool using seeded random
    const shuffled = [...pool].sort(() => rng(rngIdx++) - 0.5);
    // Filter by difficulty if specified
    const filtered = difficulty
      ? shuffled.filter((e) => e.difficulty === difficulty)
      : shuffled;
    const source = filtered.length >= count ? filtered : shuffled;
    for (let i = 0; i < Math.min(count, source.length); i++) {
      if (!plan.includes(source[i].id)) {
        plan.push(source[i].id);
      }
    }
  }

  // Fill remaining slots if needed
  while (plan.length < targetCount) {
    const remaining = EXERCISES.filter((e) => !plan.includes(e.id));
    if (remaining.length === 0) break;
    const pick = remaining[Math.floor(rng(rngIdx++) * remaining.length)];
    plan.push(pick.id);
  }

  return plan;
}

// Truly random plan for manual refresh (not seeded)
function generateRandomPlan(): string[] {
  const targetCount = 8;
  const plan: string[] = [];
  const categories: Category[] = ["bodyweight", "stretch", "fat-burning", "gym"];
  const exercisesByCategory: Record<string, typeof EXERCISES> = {};
  for (const cat of categories) {
    exercisesByCategory[cat] = EXERCISES.filter((e) => e.category === cat);
  }

  // Randomize the distribution slightly each time
  const distributions = [
    [{ cat: "bodyweight" as Category, count: 3 }, { cat: "stretch" as Category, count: 2 }, { cat: "fat-burning" as Category, count: 2 }, { cat: "gym" as Category, count: 1 }],
    [{ cat: "bodyweight" as Category, count: 2 }, { cat: "stretch" as Category, count: 2 }, { cat: "fat-burning" as Category, count: 2 }, { cat: "gym" as Category, count: 2 }],
    [{ cat: "bodyweight" as Category, count: 2 }, { cat: "stretch" as Category, count: 3 }, { cat: "fat-burning" as Category, count: 1 }, { cat: "gym" as Category, count: 2 }],
    [{ cat: "bodyweight" as Category, count: 2 }, { cat: "stretch" as Category, count: 1 }, { cat: "fat-burning" as Category, count: 3 }, { cat: "gym" as Category, count: 2 }],
    [{ cat: "bodyweight" as Category, count: 3 }, { cat: "stretch" as Category, count: 1 }, { cat: "fat-burning" as Category, count: 3 }, { cat: "gym" as Category, count: 1 }],
  ];
  const distribution = distributions[Math.floor(Math.random() * distributions.length)];

  for (const { cat, count } of distribution) {
    const pool = exercisesByCategory[cat] || [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      if (!plan.includes(shuffled[i].id)) {
        plan.push(shuffled[i].id);
      }
    }
  }

  // Fill remaining slots
  while (plan.length < targetCount) {
    const remaining = EXERCISES.filter((e) => !plan.includes(e.id));
    if (remaining.length === 0) break;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    plan.push(pick.id);
  }

  return plan;
}

// ===== AWARDS SYSTEM =====
export interface Award {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (state: WorkoutState) => boolean;
}

export const AWARDS: Award[] = [
  {
    id: "first-workout",
    name: "First Step",
    description: "Complete your first workout",
    icon: "star.fill",
    requirement: (s) => s.history.length >= 1,
  },
  {
    id: "streak-3",
    name: "On Fire",
    description: "Achieve a 3-day workout streak",
    icon: "flame.fill",
    requirement: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Achieve a 7-day workout streak",
    icon: "bolt.fill",
    requirement: (s) => s.streak >= 7,
  },
  {
    id: "streak-14",
    name: "Unstoppable",
    description: "Achieve a 14-day workout streak",
    icon: "trophy.fill",
    requirement: (s) => s.streak >= 14,
  },
  {
    id: "streak-30",
    name: "Iron Will",
    description: "Achieve a 30-day workout streak",
    icon: "crown.fill",
    requirement: (s) => s.streak >= 30,
  },
  {
    id: "workouts-5",
    name: "Getting Started",
    description: "Complete 5 total workouts",
    icon: "figure.run",
    requirement: (s) => s.history.length >= 5,
  },
  {
    id: "workouts-25",
    name: "Dedicated",
    description: "Complete 25 total workouts",
    icon: "figure.strengthtraining.traditional",
    requirement: (s) => s.history.length >= 25,
  },
  {
    id: "workouts-50",
    name: "Half Century",
    description: "Complete 50 total workouts",
    icon: "medal.fill",
    requirement: (s) => s.history.length >= 50,
  },
  {
    id: "workouts-100",
    name: "Centurion",
    description: "Complete 100 total workouts",
    icon: "star.circle.fill",
    requirement: (s) => s.history.length >= 100,
  },
  {
    id: "calories-1000",
    name: "Calorie Crusher",
    description: "Burn 1,000 total estimated calories",
    icon: "flame.circle.fill",
    requirement: (s) => {
      const totalCal = s.history.reduce((sum, h) => {
        const cal = h.exerciseIds.reduce((c, eid) => {
          const ex = EXERCISES.find((e) => e.id === eid);
          return c + (ex ? ex.caloriesPerMinute * (ex.defaultDuration / 60) : 0);
        }, 0);
        return sum + cal;
      }, 0);
      return totalCal >= 1000;
    },
  },
  {
    id: "all-categories",
    name: "Well Rounded",
    description: "Complete exercises from all 4 categories",
    icon: "circle.grid.2x2.fill",
    requirement: (s) => {
      const cats = new Set<string>();
      s.history.forEach((h) =>
        h.exerciseIds.forEach((eid) => {
          const ex = EXERCISES.find((e) => e.id === eid);
          if (ex) cats.add(ex.category);
        }),
      );
      return cats.size >= 4;
    },
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Complete 3 morning workouts (before noon)",
    icon: "sunrise.fill",
    requirement: (s) => {
      const morningCount = s.history.filter((h) => {
        const hour = new Date(h.completedAt).getHours();
        return hour < 12;
      }).length;
      return morningCount >= 3;
    },
  },
];

// ===== TYPES =====
export interface WorkoutHistory {
  date: string; // YYYY-MM-DD
  exerciseIds: string[];
  totalDuration: number; // seconds
  completedAt: string; // ISO string
}

export interface WorkoutSettings {
  restTime: number;
  defaultDuration: number;
}

interface WorkoutState {
  plan: string[]; // exercise IDs (custom plan)
  dailyPlan: string[]; // auto-generated daily plan
  dailyPlanDate: string; // date of the daily plan
  dailyPlanEdited: boolean; // whether user manually edited today's plan
  history: WorkoutHistory[];
  settings: WorkoutSettings;
  todayCompleted: string[]; // exercise IDs completed today
  streak: number;
  unlockedAwards: string[]; // award IDs
  loaded: boolean;
}

type WorkoutAction =
  | { type: "LOAD_STATE"; payload: Partial<WorkoutState> }
  | { type: "SET_PLAN"; payload: string[] }
  | { type: "ADD_TO_PLAN"; payload: string }
  | { type: "REMOVE_FROM_PLAN"; payload: string }
  | { type: "REORDER_PLAN"; payload: string[] }
  | { type: "SET_DAILY_PLAN"; payload: { plan: string[]; date: string } }
  | { type: "EDIT_DAILY_PLAN"; payload: string[] }
  | { type: "REFRESH_DAILY_PLAN" }
  | { type: "COMPLETE_WORKOUT"; payload: { exerciseIds: string[]; totalDuration: number } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<WorkoutSettings> }
  | { type: "UNLOCK_AWARD"; payload: string }
  | { type: "RESET_TODAY" };

const STORAGE_KEYS = {
  PLAN: "fitlife_plan",
  DAILY_PLAN: "fitlife_daily_plan",
  DAILY_PLAN_DATE: "fitlife_daily_plan_date",
  DAILY_PLAN_EDITED: "fitlife_daily_plan_edited",
  HISTORY: "fitlife_history",
  SETTINGS: "fitlife_settings",
  TODAY_COMPLETED: "fitlife_today_completed",
  TODAY_DATE: "fitlife_today_date",
  STREAK: "fitlife_streak",
  UNLOCKED_AWARDS: "fitlife_unlocked_awards",
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateStreak(history: WorkoutHistory[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date();
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasWorkout = sorted.some((h) => h.date === dateStr);
    if (hasWorkout) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const today = getToday();
const initialDailyPlan = generateDailyPlan(today);

const initialState: WorkoutState = {
  plan: [],
  dailyPlan: initialDailyPlan,
  dailyPlanDate: today,
  dailyPlanEdited: false,
  history: [],
  settings: { restTime: DEFAULT_REST_TIME, defaultDuration: 30 },
  todayCompleted: [],
  streak: 0,
  unlockedAwards: [],
  loaded: false,
};

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "LOAD_STATE":
      return { ...state, ...action.payload, loaded: true };
    case "SET_PLAN":
      return { ...state, plan: action.payload };
    case "ADD_TO_PLAN":
      if (state.dailyPlan.includes(action.payload)) return state;
      return { ...state, dailyPlan: [...state.dailyPlan, action.payload], dailyPlanEdited: true };
    case "REMOVE_FROM_PLAN":
      return { ...state, dailyPlan: state.dailyPlan.filter((id) => id !== action.payload), dailyPlanEdited: true };
    case "REORDER_PLAN":
      return { ...state, dailyPlan: action.payload, dailyPlanEdited: true };
    case "SET_DAILY_PLAN":
      return { ...state, dailyPlan: action.payload.plan, dailyPlanDate: action.payload.date, dailyPlanEdited: false };
    case "EDIT_DAILY_PLAN":
      return { ...state, dailyPlan: action.payload, dailyPlanEdited: true };
    case "REFRESH_DAILY_PLAN": {
      const todayStr = getToday();
      // Use truly random plan (not seeded) for manual refresh
      const newPlan = generateRandomPlan();
      return { ...state, dailyPlan: newPlan, dailyPlanDate: todayStr, dailyPlanEdited: false };
    }
    case "COMPLETE_WORKOUT": {
      const todayStr = getToday();
      const newHistory: WorkoutHistory = {
        date: todayStr,
        exerciseIds: action.payload.exerciseIds,
        totalDuration: action.payload.totalDuration,
        completedAt: new Date().toISOString(),
      };
      const updatedHistory = [...state.history, newHistory];
      const newTodayCompleted = [
        ...new Set([...state.todayCompleted, ...action.payload.exerciseIds]),
      ];
      const newStreak = calculateStreak(updatedHistory);
      // Check for new awards
      const tempState = { ...state, history: updatedHistory, streak: newStreak, todayCompleted: newTodayCompleted };
      const newAwards = [...state.unlockedAwards];
      for (const award of AWARDS) {
        if (!newAwards.includes(award.id) && award.requirement(tempState)) {
          newAwards.push(award.id);
        }
      }
      return {
        ...state,
        history: updatedHistory,
        todayCompleted: newTodayCompleted,
        streak: newStreak,
        unlockedAwards: newAwards,
      };
    }
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "UNLOCK_AWARD":
      if (state.unlockedAwards.includes(action.payload)) return state;
      return { ...state, unlockedAwards: [...state.unlockedAwards, action.payload] };
    case "RESET_TODAY":
      return { ...state, todayCompleted: [] };
    default:
      return state;
  }
}

interface WorkoutContextType {
  state: WorkoutState;
  setPlan: (plan: string[]) => void;
  addToPlan: (exerciseId: string) => void;
  removeFromPlan: (exerciseId: string) => void;
  reorderPlan: (plan: string[]) => void;
  editDailyPlan: (plan: string[]) => void;
  refreshDailyPlan: () => void;
  completeWorkout: (exerciseIds: string[], totalDuration: number) => void;
  updateSettings: (settings: Partial<WorkoutSettings>) => void;
  getDailyPlanExercises: () => typeof EXERCISES;
  getTotalPlanDuration: () => number;
  getUnlockedAwards: () => Award[];
  getLockedAwards: () => Award[];
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const [
          planStr, dailyPlanStr, dailyPlanDateStr, dailyPlanEditedStr,
          historyStr, settingsStr, todayCompletedStr, todayDateStr, streakStr,
          unlockedAwardsStr,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PLAN),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_PLAN),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_PLAN_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_PLAN_EDITED),
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.TODAY_COMPLETED),
          AsyncStorage.getItem(STORAGE_KEYS.TODAY_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.STREAK),
          AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_AWARDS),
        ]);

        const todayStr = getToday();
        const savedDate = todayDateStr || "";

        const payload: Partial<WorkoutState> = {};
        if (planStr) payload.plan = JSON.parse(planStr);
        if (historyStr) payload.history = JSON.parse(historyStr);
        if (settingsStr) payload.settings = JSON.parse(settingsStr);
        if (streakStr) payload.streak = parseInt(streakStr, 10);
        if (unlockedAwardsStr) payload.unlockedAwards = JSON.parse(unlockedAwardsStr);

        // Handle daily plan - auto-generate if it's a new day
        if (dailyPlanDateStr === todayStr && dailyPlanStr) {
          payload.dailyPlan = JSON.parse(dailyPlanStr);
          payload.dailyPlanDate = todayStr;
          payload.dailyPlanEdited = dailyPlanEditedStr === "true";
        } else {
          // New day - generate fresh plan
          payload.dailyPlan = generateDailyPlan(todayStr);
          payload.dailyPlanDate = todayStr;
          payload.dailyPlanEdited = false;
        }

        // Reset today's completed if it's a new day
        if (savedDate === todayStr && todayCompletedStr) {
          payload.todayCompleted = JSON.parse(todayCompletedStr);
        } else {
          payload.todayCompleted = [];
          await AsyncStorage.setItem(STORAGE_KEYS.TODAY_DATE, todayStr);
        }

        dispatch({ type: "LOAD_STATE", payload });
      } catch (error) {
        console.error("[WorkoutStore] Failed to load state:", error);
        dispatch({ type: "LOAD_STATE", payload: {} });
      }
    };
    loadState();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (!state.loaded) return;
    const persist = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(state.plan)),
          AsyncStorage.setItem(STORAGE_KEYS.DAILY_PLAN, JSON.stringify(state.dailyPlan)),
          AsyncStorage.setItem(STORAGE_KEYS.DAILY_PLAN_DATE, state.dailyPlanDate),
          AsyncStorage.setItem(STORAGE_KEYS.DAILY_PLAN_EDITED, state.dailyPlanEdited.toString()),
          AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history)),
          AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings)),
          AsyncStorage.setItem(STORAGE_KEYS.TODAY_COMPLETED, JSON.stringify(state.todayCompleted)),
          AsyncStorage.setItem(STORAGE_KEYS.TODAY_DATE, getToday()),
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, state.streak.toString()),
          AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_AWARDS, JSON.stringify(state.unlockedAwards)),
        ]);
      } catch (error) {
        console.error("[WorkoutStore] Failed to persist state:", error);
      }
    };
    persist();
  }, [state]);

  const setPlan = useCallback((plan: string[]) => dispatch({ type: "SET_PLAN", payload: plan }), []);
  const addToPlan = useCallback((id: string) => dispatch({ type: "ADD_TO_PLAN", payload: id }), []);
  const removeFromPlan = useCallback((id: string) => dispatch({ type: "REMOVE_FROM_PLAN", payload: id }), []);
  const reorderPlan = useCallback((plan: string[]) => dispatch({ type: "REORDER_PLAN", payload: plan }), []);
  const editDailyPlan = useCallback((plan: string[]) => dispatch({ type: "EDIT_DAILY_PLAN", payload: plan }), []);
  const refreshDailyPlan = useCallback(() => dispatch({ type: "REFRESH_DAILY_PLAN" }), []);
  const completeWorkout = useCallback(
    (exerciseIds: string[], totalDuration: number) =>
      dispatch({ type: "COMPLETE_WORKOUT", payload: { exerciseIds, totalDuration } }),
    [],
  );
  const updateSettings = useCallback(
    (settings: Partial<WorkoutSettings>) => dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
    [],
  );

  const getDailyPlanExercises = useCallback(() => {
    return state.dailyPlan
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter(Boolean) as typeof EXERCISES;
  }, [state.dailyPlan]);

  const getTotalPlanDuration = useCallback(() => {
    const exercises = getDailyPlanExercises();
    const exerciseTime = exercises.reduce((sum, e) => sum + e.defaultDuration, 0);
    const restTime = Math.max(0, exercises.length - 1) * state.settings.restTime;
    return exerciseTime + restTime;
  }, [getDailyPlanExercises, state.settings.restTime]);

  const getUnlockedAwards = useCallback(() => {
    return AWARDS.filter((a) => state.unlockedAwards.includes(a.id));
  }, [state.unlockedAwards]);

  const getLockedAwards = useCallback(() => {
    return AWARDS.filter((a) => !state.unlockedAwards.includes(a.id));
  }, [state.unlockedAwards]);

  const value: WorkoutContextType = {
    state,
    setPlan,
    addToPlan,
    removeFromPlan,
    reorderPlan,
    editDailyPlan,
    refreshDailyPlan,
    completeWorkout,
    updateSettings,
    getDailyPlanExercises,
    getTotalPlanDuration,
    getUnlockedAwards,
    getLockedAwards,
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
