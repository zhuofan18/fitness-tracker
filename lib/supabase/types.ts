export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "bulk" | "cut" | "maintain";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type SplitStyle =
  | "auto"
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "bro_split";
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type CycleWave = "heavy" | "moderate" | "peak" | "deload";

export const EQUIPMENT_OPTIONS = [
  "barbell",
  "dumbbells",
  "cables",
  "machines",
  "bands",
  "kettlebells",
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export interface FoodItem {
  name: string;
  estimated_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface PlannedMealItem {
  name: string;
  quantity_description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface PlannedMeal {
  name: string; // e.g. "Breakfast", "Lunch", "Dinner", "Snack"
  items: PlannedMealItem[];
}

export interface ProgramExercise {
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | "bodyweight" | "custom";
  sets: number;
  rep_range: string; // e.g. "6-8"
  emphasis: boolean; // true if this targets a user-specified weak point
  note?: string; // e.g. unilateral-training guidance for a side imbalance
  custom?: boolean; // true if filled from the user's own exercise list
}

export type Side = "left" | "right";

export interface SideImbalance {
  muscle_group: MuscleGroup;
  weaker_side: Side;
}

export interface ProgramDay {
  day_index: number; // 1-7
  focus: string; // e.g. "Push", "Upper", "Full Body", "Legs (Emphasis)"
  exercises: ProgramExercise[];
}

export interface MesocycleWeek {
  week: number; // 1-4
  wave: CycleWave;
  intensity_note: string;
}

// GenericRelationship shape supabase-js expects on every table entry.
interface Relationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          sex: Sex;
          birth_date: string;
          height_cm: number;
          activity_level: ActivityLevel;
          goal: Goal;
          goal_description: string | null;
          target_weight_kg: number | null;
          experience_level: ExperienceLevel;
          weak_points: MuscleGroup[];
          equipment: Equipment[];
          supplements: string[];
          available_foods: string[];
          imbalances: SideImbalance[];
          days_per_week: number;
          split_style: SplitStyle;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sex: Sex;
          birth_date: string;
          height_cm: number;
          activity_level: ActivityLevel;
          goal: Goal;
          goal_description?: string | null;
          target_weight_kg?: number | null;
          experience_level: ExperienceLevel;
          weak_points?: MuscleGroup[];
          equipment?: Equipment[];
          supplements?: string[];
          available_foods?: string[];
          imbalances?: SideImbalance[];
          days_per_week?: number;
          split_style?: SplitStyle;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      body_weight_logs: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          logged_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["body_weight_logs"]["Insert"]
        >;
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["water_logs"]["Insert"]>;
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          photo_path: string | null;
          logged_at: string;
          items: FoodItem[];
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_path?: string | null;
          logged_at?: string;
          items: FoodItem[];
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["food_logs"]["Insert"]>;
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          generated_at: string;
          calorie_target: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          estimated_weekly_rate_kg: number;
          meal_plan: PlannedMeal[];
        };
        Insert: {
          id?: string;
          user_id: string;
          generated_at?: string;
          calorie_target: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          estimated_weekly_rate_kg?: number;
          meal_plan?: PlannedMeal[];
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [];
      };
      lift_goals: {
        Row: {
          id: string;
          user_id: string;
          exercise_name: string;
          starting_weight_kg: number | null;
          target_weight_kg: number;
          achieved: boolean;
          achieved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_name: string;
          starting_weight_kg?: number | null;
          target_weight_kg: number;
          achieved?: boolean;
          achieved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lift_goals"]["Insert"]>;
        Relationships: [];
      };
      custom_exercises: {
        Row: {
          id: string;
          user_id: string;
          muscle_group: MuscleGroup;
          exercise_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          muscle_group: MuscleGroup;
          exercise_name: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["custom_exercises"]["Insert"]
        >;
        Relationships: [];
      };
      training_programs: {
        Row: {
          id: string;
          user_id: string;
          generated_at: string;
          days_per_week: number;
          split_style: SplitStyle;
          weekly_schedule: ProgramDay[];
          mesocycle: MesocycleWeek[];
        };
        Insert: {
          id?: string;
          user_id: string;
          generated_at?: string;
          days_per_week: number;
          split_style: SplitStyle;
          weekly_schedule: ProgramDay[];
          mesocycle: MesocycleWeek[];
        };
        Update: Partial<
          Database["public"]["Tables"]["training_programs"]["Insert"]
        >;
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          performed_at: string;
          day_label: string | null;
          cycle_week: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          performed_at?: string;
          day_label?: string | null;
          cycle_week?: number;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["workout_logs"]["Insert"]
        >;
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_log_id: string;
          user_id: string;
          exercise_name: string;
          set_number: number;
          reps: number;
          weight_kg: number;
          is_pr: boolean;
        };
        Insert: {
          id?: string;
          workout_log_id: string;
          user_id: string;
          exercise_name: string;
          set_number: number;
          reps: number;
          weight_kg: number;
          is_pr?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["workout_sets"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_log_id_fkey";
            columns: ["workout_log_id"];
            isOneToOne: false;
            referencedRelation: "workout_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_photos: {
        Row: {
          id: string;
          user_id: string;
          photo_path: string;
          taken_at: string;
          weight_kg: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_path: string;
          taken_at?: string;
          weight_kg?: number | null;
          notes?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["progress_photos"]["Insert"]
        >;
        Relationships: [];
      };
      saved_foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          photo_path: string | null;
          serving_description: string | null;
          calories_per_serving: number;
          protein_g_per_serving: number;
          carbs_g_per_serving: number;
          fat_g_per_serving: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          photo_path?: string | null;
          serving_description?: string | null;
          calories_per_serving?: number;
          protein_g_per_serving?: number;
          carbs_g_per_serving?: number;
          fat_g_per_serving?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["saved_foods"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Referenced above so the Relationship interface isn't flagged unused if a
// table's Relationships array is ever widened beyond an empty tuple.
export type { Relationship };
