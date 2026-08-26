import type { ActivityLevel, Goal, Sex } from "@/lib/supabase/types";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

// Mifflin-St Jeor
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  if (goal === "bulk") return tdee * 1.125;
  if (goal === "cut") return tdee * 0.825;
  return tdee;
}

export function calculateMacros(
  calorieTarget: number,
  weightKg: number,
  goal: Goal,
) {
  const proteinPerKg = goal === "cut" ? 2.2 : goal === "bulk" ? 1.8 : 2.0;
  const proteinG = weightKg * proteinPerKg;
  const proteinCalories = proteinG * 4;

  const fatCalories = calorieTarget * 0.25;
  const fatG = fatCalories / 9;

  const carbCalories = Math.max(calorieTarget - proteinCalories - fatCalories, 0);
  const carbsG = carbCalories / 4;

  return {
    protein_g: Math.round(proteinG),
    fat_g: Math.round(fatG),
    carbs_g: Math.round(carbsG),
  };
}

export interface GeneratedNutritionPlan {
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_weekly_rate_kg: number;
}

// ~7700 kcal per kg of body mass gained/lost (standard rough estimate).
const KCAL_PER_KG = 7700;

export function generateNutritionPlan(input: {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}): GeneratedNutritionPlan {
  const age = ageFromBirthDate(input.birthDate);
  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const calorieTarget = calculateCalorieTarget(tdee, input.goal);
  const macros = calculateMacros(calorieTarget, input.weightKg, input.goal);
  const estimatedWeeklyRateKg = ((calorieTarget - tdee) * 7) / KCAL_PER_KG;

  return {
    calorie_target: Math.round(calorieTarget),
    ...macros,
    estimated_weekly_rate_kg: Math.round(estimatedWeeklyRateKg * 100) / 100,
  };
}
