import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  PiggyBank,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import { getDashboard } from "@/lib/api/dashboard";
import { getServerBudgets } from "@/lib/api/serverBudgets";
import { getGoals } from "@/lib/api/goalsServer";
import type { Budget } from "@/lib/api/budgets";
import type { DashboardData } from "@/types/dashboard";
import type { Goal } from "@/types/goal";

import styles from "./recommendations.module.scss";

type Recommendation = {
  id: string;
  title: string;
  priority: "High priority" | "Worth reviewing" | "Goal planning";
  description: string;
  evidence: string;
  action: string;
  amount?: string;
  href: string;
  icon: typeof Lightbulb;
};

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function buildRecommendations(
  dashboard: DashboardData,
  budgets: Budget[],
  goals: Goal[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const exceeded = budgets
    .filter((budget) => budget.status === "EXCEEDED" || Number(budget.projected_overspend) > 0)
    .sort((a, b) => Number(b.projected_overspend) - Number(a.projected_overspend));

  for (const budget of exceeded.slice(0, 2)) {
    const projectedOverspend = Math.max(Number(budget.projected_overspend) || 0, 0);
    recommendations.push({
      id: `budget-${budget.id}`,
      title: `Review your ${budget.name || budget.category_name || "budget"}`,
      priority: "High priority",
      description: "Your recorded spending is over the limit or is projected to exceed it. Review recent transactions and adjust the remaining month's spending if needed.",
      evidence: `Budget: ${currency(Number(budget.amount))} · Recorded spend: ${currency(Number(budget.spent))} · Status: ${budget.status === "EXCEEDED" ? "Exceeded" : "Projected overspend"}`,
      action: "Review budget and transactions",
      ...(projectedOverspend > 0 ? { amount: `${currency(projectedOverspend)} projected overspend` } : {}),
      href: "/budgets",
      icon: CircleAlert,
    });
  }

  const largestCategory = [...dashboard.expenses_by_category]
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  if (largestCategory && Number(largestCategory.amount) > 0) {
    recommendations.push({
      id: `category-${largestCategory.category_id}`,
      title: `Take a closer look at ${largestCategory.category_name}`,
      priority: "Worth reviewing",
      description: "This is the largest expense category in the dashboard's current reporting period. Check the underlying transactions for optional or unusual spending before deciding whether to change anything.",
      evidence: `Recorded spending: ${currency(Number(largestCategory.amount))} · Share of expenses: ${Number(largestCategory.percentage).toFixed(1)}%`,
      action: "Review transactions",
      href: "/transactions",
      icon: TrendingUp,
    });
  }

  const activeGoals = goals
    .filter((goal) => !goal.is_completed)
    .map((goal) => ({
      goal,
      remaining: Math.max(Number(goal.target_amount) - Number(goal.current_amount), 0),
    }))
    .filter(({ remaining }) => remaining > 0)
    .sort((a, b) => {
      if (a.goal.target_date && b.goal.target_date) {
        return a.goal.target_date.localeCompare(b.goal.target_date);
      }
      if (a.goal.target_date) return -1;
      if (b.goal.target_date) return 1;
      return b.remaining - a.remaining;
    });

  const nextGoal = activeGoals[0];
  if (nextGoal) {
    const { goal, remaining } = nextGoal;
    const targetDate = goal.target_date
      ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${goal.target_date}T00:00:00`))
      : null;
    recommendations.push({
      id: `goal-${goal.id}`,
      title: `Keep moving toward ${goal.name}`,
      priority: "Goal planning",
      description: targetDate
        ? `Your goal has a target date of ${targetDate}. Review your contribution plan to decide how to close the remaining gap.`
        : "Your goal does not have a target date yet. Adding a realistic deadline can help you plan contributions.",
      evidence: `Target: ${currency(Number(goal.target_amount))} · Saved so far: ${currency(Number(goal.current_amount))} · Remaining: ${currency(remaining)}`,
      action: "Open financial goals",
      href: "/goals",
      icon: Target,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "build-budget",
      title: "Set up a budget to get more tailored guidance",
      priority: "Worth reviewing",
      description: "Artha needs recorded budgets and spending data to identify specific areas to review. Create a monthly budget to make future recommendations more useful.",
      evidence: "No budget alerts or active unfinished goals were found in the data available for this page.",
      action: "Create a budget",
      href: "/budgets",
      icon: PiggyBank,
    });
  }

  return recommendations.slice(0, 4);
}

export default async function RecommendationsPage() {
  let dashboard: DashboardData | null = null;
  let budgets: Budget[] = [];
  let goals: Goal[] = [];
  let loadError = false;

  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const results = await Promise.allSettled([
    getDashboard(),
    getServerBudgets(monthStart),
    getGoals(),
  ]);

  if (results[0].status === "fulfilled") dashboard = results[0].value;
  else loadError = true;
  if (results[1].status === "fulfilled") budgets = results[1].value.items;
  else loadError = true;
  if (results[2].status === "fulfilled") goals = results[2].value.items;
  else loadError = true;

  const recommendations = dashboard
    ? buildRecommendations(dashboard, budgets, goals)
    : [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headingIcon}><Lightbulb size={22} /></div>
        <div className={styles.headingText}>
          <h1>Recommendations</h1>
          <p className={styles.subtitle}>Practical next steps based on the financial data recorded in Artha.</p>
        </div>
      </header>

      <section className={styles.notice} aria-label="How recommendations work">
        <ShieldCheck size={20} />
        <p><strong>Evidence first.</strong> Each insight shows the data behind it. Suggestions are optional; Artha has not changed any of your financial records.</p>
      </section>

      {loadError && (
        <section className={styles.partialNotice} role="status">
          Some financial data could not be loaded. Recommendations below use only the data that was retrieved successfully.
        </section>
      )}

      {!dashboard ? (
        <section className={styles.emptyState}>
          <CircleAlert size={28} />
          <h2>Recommendations are temporarily unavailable</h2>
          <p>Artha could not retrieve the dashboard data needed to create reliable personalized insights.</p>
          <Link href="/" className={styles.primaryLink}>Return to dashboard <ArrowRight size={16} /></Link>
        </section>
      ) : recommendations.length === 0 ? (
        <section className={styles.emptyState}>
          <CheckCircle2 size={28} />
          <h2>You’re in a good place</h2>
          <p>No actionable recommendations were identified from the financial data currently available.</p>
        </section>
      ) : (
        <>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Your next best actions</h2>
              <p>Prioritized using recorded budgets, spending, and goals.</p>
            </div>
            <span className={styles.count}>{recommendations.length} insights</span>
          </div>

          <div className={styles.recommendationGrid}>
            {recommendations.map((recommendation, index) => {
              const Icon = recommendation.icon;
              return (
                <article className={styles.recommendationCard} key={recommendation.id}>
                  <div className={styles.cardTop}>
                    <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                    <span className={`${styles.priority} ${recommendation.priority === "High priority" ? styles.priorityHigh : recommendation.priority === "Goal planning" ? styles.priorityGoal : styles.priorityReview}`}>
                      {recommendation.priority}
                    </span>
                  </div>
                  <div className={styles.cardIcon}><Icon size={21} /></div>
                  <h3>{recommendation.title}</h3>
                  <p className={styles.description}>{recommendation.description}</p>
                  <div className={styles.evidence}>
                    <span>WHY THIS APPEARED</span>
                    <p>{recommendation.evidence}</p>
                  </div>
                  {recommendation.amount && <p className={styles.amount}><ArrowDownRight size={16} /> {recommendation.amount}</p>}
                  <Link href={recommendation.href} className={styles.actionLink}>{recommendation.action} <ArrowRight size={16} /></Link>
                </article>
              );
            })}
          </div>
        </>
      )}

      <footer className={styles.footer}>
        <ShieldCheck size={15} />
        <span>Insights reflect data recorded in Artha and are not guaranteed savings or professional financial advice.</span>
      </footer>
    </main>
  );
}
