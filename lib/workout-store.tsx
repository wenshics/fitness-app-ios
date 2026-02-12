import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useReducer } from "react";
import { DEFAULT_BEGINNER_PLAN, DEFAULT_REST_TIME, EXERCISES } from "@/constants/exercises";

// Types
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
  plan: string[]; // exercise IDs
  history: WorkoutHistory[];
  settings: WorkoutSettings;
  todayCompleted: string[]; // exercise IDs completed today
  streak: number;
  loaded: boolean;
}

type WorkoutAction =
  | { type: "LOAD_STATE"; payload: Partial<WorkoutState> }
  | { type: "SET_PLAN"; payload: string[] }
  | { type: "ADD_TO_PLAN"; payload: string }
  | { type: "REMOVE_FROM_PLAN"; payload: string }
  | { type: "REORDER_PLAN"; payload: string[] }
  | { type: "COMPLETE_WORKOUT"; payload: { exerciseIds: string[]; totalDuration: number } }
  | { type: "UPDATE_SETTINGS"; payload: Partial<WorkoutSettings> }
  | { type: "RESET_TODAY" };

const STORAGE_KEYS = {
  PLAN: "fitlife_plan",
  HISTORY: "fitlife_history",
  SETTINGS: "fitlife_settings",
  TODAY_COMPLETED: "fitlife_today_completed",
  TODAY_DATE: "fitlife_today_date",
  STREAK: "fitlife_streak",
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
      // Today doesn't count against streak if no workout yet
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const initialState: WorkoutState = {
  plan: DEFAULT_BEGINNER_PLAN,
  history: [],
  settings: { restTime: DEFAULT_REST_TIME, defaultDuration: 30 },
  todayCompleted: [],
  streak: 0,
  loaded: false,
};

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "LOAD_STATE":
      return { ...state, ...action.payload, loaded: true };
    case "SET_PLAN":
      return { ...state, plan: action.payload };
    case "ADD_TO_PLAN":
      if (state.plan.includes(action.payload)) return state;
      return { ...state, plan: [...state.plan, action.payload] };
    case "REMOVE_FROM_PLAN":
      return { ...state, plan: state.plan.filter((id) => id !== action.payload) };
    case "REORDER_PLAN":
      return { ...state, plan: action.payload };
    case "COMPLETE_WORKOUT": {
      const today = getToday();
      const newHistory: WorkoutHistory = {
        date: today,
        exerciseIds: action.payload.exerciseIds,
        totalDuration: action.payload.totalDuration,
        completedAt: new Date().toISOString(),
      };
      const updatedHistory = [...state.history, newHistory];
      const newTodayCompleted = [
        ...new Set([...state.todayCompleted, ...action.payload.exerciseIds]),
      ];
      return {
        ...state,
        history: updatedHistory,
        todayCompleted: newTodayCompleted,
        streak: calculateStreak(updatedHistory),
      };
    }
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
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
  completeWorkout: (exerciseIds: string[], totalDuration: number) => void;
  updateSettings: (settings: Partial<WorkoutSettings>) => void;
  getPlanExercises: () => typeof EXERCISES;
  getTotalPlanDuration: () => number;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const [planStr, historyStr, settingsStr, todayCompletedStr, todayDateStr, streakStr] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.PLAN),
            AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
            AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
            AsyncStorage.getItem(STORAGE_KEYS.TODAY_COMPLETED),
            AsyncStorage.getItem(STORAGE_KEYS.TODAY_DATE),
            AsyncStorage.getItem(STORAGE_KEYS.STREAK),
          ]);

        const today = getToday();
        const savedDate = todayDateStr || "";

        const payload: Partial<WorkoutState> = {};
        if (planStr) payload.plan = JSON.parse(planStr);
        if (historyStr) payload.history = JSON.parse(historyStr);
        if (settingsStr) payload.settings = JSON.parse(settingsStr);
        if (streakStr) payload.streak = parseInt(streakStr, 10);

        // Reset today's completed if it's a new day
        if (savedDate === today && todayCompletedStr) {
          payload.todayCompleted = JSON.parse(todayCompletedStr);
        } else {
          payload.todayCompleted = [];
          await AsyncStorage.setItem(STORAGE_KEYS.TODAY_DATE, today);
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
          AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history)),
          AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings)),
          AsyncStorage.setItem(STORAGE_KEYS.TODAY_COMPLETED, JSON.stringify(state.todayCompleted)),
          AsyncStorage.setItem(STORAGE_KEYS.TODAY_DATE, getToday()),
          AsyncStorage.setItem(STORAGE_KEYS.STREAK, state.streak.toString()),
        ]);
      } catch (error) {
        console.error("[WorkoutStore] Failed to persist state:", error);
      }
    };
    persist();
  }, [state.loaded, state.plan, state.history, state.settings, state.todayCompleted, state.streak]);

  const setPlan = useCallback((plan: string[]) => dispatch({ type: "SET_PLAN", payload: plan }), []);
  const addToPlan = useCallback((id: string) => dispatch({ type: "ADD_TO_PLAN", payload: id }), []);
  const removeFromPlan = useCallback((id: string) => dispatch({ type: "REMOVE_FROM_PLAN", payload: id }), []);
  const reorderPlan = useCallback((plan: string[]) => dispatch({ type: "REORDER_PLAN", payload: plan }), []);
  const completeWorkout = useCallback(
    (exerciseIds: string[], totalDuration: number) =>
      dispatch({ type: "COMPLETE_WORKOUT", payload: { exerciseIds, totalDuration } }),
    [],
  );
  const updateSettings = useCallback(
    (settings: Partial<WorkoutSettings>) => dispatch({ type: "UPDATE_SETTINGS", payload: settings }),
    [],
  );

  const getPlanExercises = useCallback(() => {
    return state.plan
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter(Boolean) as typeof EXERCISES;
  }, [state.plan]);

  const getTotalPlanDuration = useCallback(() => {
    const exercises = getPlanExercises();
    const exerciseTime = exercises.reduce((sum, e) => sum + e.defaultDuration, 0);
    const restTime = Math.max(0, exercises.length - 1) * state.settings.restTime;
    return exerciseTime + restTime;
  }, [getPlanExercises, state.settings.restTime]);

  const value: WorkoutContextType = {
    state,
    setPlan,
    addToPlan,
    removeFromPlan,
    reorderPlan,
    completeWorkout,
    updateSettings,
    getPlanExercises,
    getTotalPlanDuration,
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
