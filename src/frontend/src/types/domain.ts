export type LiftType = "Squat" | "Bench" | "OHP" | "Deadlift";

export type SetType =
  | "Warmup"
  | "Main"
  | "AMRAP"
  | "Joker"
  | "FSL"
  | "BBB"
  | "Accessory";

export type MovementPattern =
  | "Push"
  | "Pull"
  | "Hinge"
  | "SingleLeg"
  | "Core"
  | "Other";

export type ExerciseCategory = "Main" | "Accessory";

export type RecordType = "EstimatedOneRM" | "RepRecord";

export type InsightType =
  | "WeeklyRecap"
  | "PrNote"
  | "ProgramRecommendation"
  | "DeloadAlert";

export type InsightStatus = "Pending" | "Completed" | "Failed";
