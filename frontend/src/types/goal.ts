export type Goal = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  icon: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type GoalContribution = {
  id: string;
  goal_id: string;
  amount: string;
  contribution_date: string;
  notes: string | null;
  created_at: string;
};

export type GoalDetail = Goal & {
  contributions: GoalContribution[];
};

export type GoalListResponse = {
  items: Goal[];
  total: number;
};

export type GoalContributionListResponse = {
  items: GoalContribution[];
  total: number;
};

export type GoalCreatePayload = {
  name: string;
  description?: string | null;
  target_amount: string;
  current_amount?: string;
  target_date?: string | null;
  icon?: string | null;
};

export type GoalUpdatePayload = {
  name?: string;
  description?: string | null;
  target_amount?: string;
  current_amount?: string;
  target_date?: string | null;
  icon?: string | null;
  is_completed?: boolean;
};

export type GoalContributionCreatePayload = {
  amount: string;
  contribution_date: string;
  notes?: string | null;
};