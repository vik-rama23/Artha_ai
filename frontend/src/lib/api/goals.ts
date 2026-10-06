import { apiClient } from "@/lib/api/client";

import type {
  Goal,
  GoalContribution,
  GoalContributionCreatePayload,
  GoalCreatePayload,
  GoalUpdatePayload,
} from "@/types/goal";

export async function createGoal(
  payload: GoalCreatePayload,
): Promise<Goal> {
  return apiClient<Goal>(
    "/api/v1/goals",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateGoal(
  goalId: string,
  payload: GoalUpdatePayload,
): Promise<Goal> {
  return apiClient<Goal>(
    `/api/v1/goals/${goalId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteGoal(
  goalId: string,
): Promise<void> {
  await apiClient<void>(
    `/api/v1/goals/${goalId}`,
    {
      method: "DELETE",
    },
  );
}

export async function createGoalContribution(
  goalId: string,
  payload: GoalContributionCreatePayload,
): Promise<GoalContribution> {
  return apiClient<GoalContribution>(
    `/api/v1/goals/${goalId}/contributions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}