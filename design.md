# FitLife - Daily Exercise Companion — Design Document

## App Overview
A fitness app that helps users exercise every day with a curated library of 16 exercises across beginner, intermediate, and advanced levels. Each exercise includes a YouTube demo video, a built-in timer, and users can customize their own workout plans.

## Color Palette
| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| primary | #FF6B35 | #FF8C5A | Energetic orange — fitness brand color |
| background | #FFFFFF | #121212 | Screen backgrounds |
| surface | #F7F7F8 | #1E1E1E | Cards, elevated surfaces |
| foreground | #1A1A2E | #F0F0F0 | Primary text |
| muted | #8E8E93 | #A0A0A5 | Secondary text |
| border | #E5E5EA | #2C2C2E | Dividers |
| success | #34C759 | #30D158 | Completed states |
| warning | #FF9500 | #FFB340 | Caution states |
| error | #FF3B30 | #FF453A | Error states |

## Screen List

### 1. Login Screen (Unauthenticated)
- Full-screen welcome with app branding
- "Get Started" button triggers Manus OAuth
- Brief tagline: "Your daily exercise companion"

### 2. Home Screen (Tab 1 — "Today")
- Greeting with user name
- Today's workout plan card (if set)
- Quick-start button for today's workout
- Daily streak counter
- Progress ring showing exercises completed today

### 3. Exercises Screen (Tab 2 — "Exercises")
- Segmented control: Beginner / Intermediate / Advanced
- Grid/list of exercises with thumbnail, name, muscle group, duration
- Tap to open Exercise Detail

### 4. My Plan Screen (Tab 3 — "My Plan")
- User's custom workout plan
- Add/remove exercises from the plan
- Reorder exercises
- Set rest time between exercises
- "Start Workout" button

### 5. Profile Screen (Tab 4 — "Profile")
- User avatar and name
- Workout stats (total workouts, streak, total minutes)
- Settings: rest timer duration, notifications toggle
- Logout button

### 6. Exercise Detail Screen (Modal)
- YouTube demo video (WebView embed)
- Exercise name, difficulty badge, muscle groups
- Step-by-step instructions
- Timer with configurable duration
- "Add to My Plan" button

### 7. Workout Session Screen (Modal, fullscreen)
- Current exercise name and video
- Countdown timer (large, centered)
- Rest period between exercises
- Next exercise preview
- Pause / Skip / Stop controls
- Keep screen awake during workout

## Primary Content & Functionality

### Exercise Library (16 exercises)
**Beginner (6):**
1. Jumping Jacks — Full body, 30s
2. Wall Sit — Legs, 30s
3. Glute Bridge — Glutes, 30s
4. High Knees — Cardio, 30s
5. Bicycle Crunches — Core, 30s
6. Superman — Back, 30s

**Intermediate (5):**
7. Push-Ups — Chest/Arms, 30s
8. Squats — Legs, 45s
9. Plank — Core, 45s
10. Lunges — Legs, 45s
11. Tricep Dips — Arms, 30s

**Advanced (5):**
12. Burpees — Full body, 45s
13. Mountain Climbers — Full body, 45s
14. Diamond Push-Ups — Chest/Triceps, 30s
15. Jump Squats — Legs, 45s
16. Pistol Squats — Legs, 30s

### Timer System
- Configurable exercise duration (15s, 30s, 45s, 60s)
- Rest period between exercises (10s, 15s, 20s, 30s)
- Audio countdown beeps at 3, 2, 1
- Visual countdown ring animation

### Workout Plan Customization
- Browse exercise library and add to plan
- Remove exercises from plan
- Default plan provided for beginners
- Save plan to AsyncStorage (local persistence)

## Key User Flows

### Flow 1: First-Time User
1. App opens → Login screen
2. Tap "Get Started" → Manus OAuth in browser
3. Auth completes → Redirect to Home
4. Home shows welcome + suggested beginner plan
5. User can start workout immediately

### Flow 2: Daily Workout
1. Open app → Home tab shows today's plan
2. Tap "Start Workout" → Workout Session screen
3. Exercise plays with video + timer
4. Rest period → Next exercise
5. Workout complete → Summary + streak update

### Flow 3: Customize Plan
1. Go to "My Plan" tab
2. Tap "Add Exercise" → Browse exercise library
3. Select exercises → Added to plan
4. Reorder or remove as needed
5. Plan saved automatically

### Flow 4: Explore Exercise
1. Go to "Exercises" tab
2. Filter by difficulty level
3. Tap exercise → Detail modal
4. Watch demo video, read instructions
5. Try with timer or add to plan

## Data Storage
- **AsyncStorage** for all local data (no cloud sync needed beyond auth)
  - User workout plan
  - Workout history / streak
  - Settings (rest time, timer defaults)
  - Completed exercises today
