export const endpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  users: {
    me: "/users/me",
  },
  exercises: "/exercises",
  trainingMaxes: "/training-maxes",
  programs: "/programs",
  workouts: "/workouts",
  personalRecords: "/personal-records",
  insights: "/insights",
  dashboard: "/dashboard",
} as const;
