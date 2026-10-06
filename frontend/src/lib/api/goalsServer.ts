import { serverApiClient } from "./serverClient";

import type {
  Goal,
  GoalContributionListResponse,
  GoalDetail,
  GoalListResponse,
} from "@/types/goal";

export async function getGoals(): Promise<GoalListResponse> {
  return serverApiClient<GoalListResponse>(
    "/api/v1/goals",
  );
}

export async function getGoal(
  goalId: string,
): Promise<Goal> {
  return serverApiClient<Goal>(
    `/api/v1/goals/${goalId}`,
  );
}

export async function getGoalDetails(
  goalId: string,
): Promise<GoalDetail> {
  return serverApiClient<GoalDetail>(
    `/api/v1/goals/${goalId}/details`,
  );
}

export async function getGoalContributions(
  goalId: string,
): Promise<GoalContributionListResponse> {
  return serverApiClient<GoalContributionListResponse>(
    `/api/v1/goals/${goalId}/contributions`,
  );
}