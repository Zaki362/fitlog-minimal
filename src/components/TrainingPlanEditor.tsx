import { getDaysSinceLastTrained, getLastTrainedDateByMuscleGroup, formatLastTrainedStatus } from "../lib/stats";
import { formatNextDueStatus, mergeTrainingPlan, TRAINING_PLAN_GROUPS } from "../lib/trainingPlan";
import type { AppData, MuscleGroup, TrainingPlan, TrainingPlanItem, TrainingPlanRole } from "../types";
import { MUSCLE_LABELS } from "../types";

type TrainingPlanEditorProps = {
  data: AppData;
  onSavePlan: (plan: TrainingPlan) => void;
  onResetPlan: () => void;
};

const roleLabels: Record<TrainingPlanRole, string> = {
  main: "主训练",
  accessory: "附加训练",
  disabled: "不提醒",
};

function defaultRoleForGroup(group: MuscleGroup): TrainingPlanRole {
  if (group === "abs" || group === "cardio") {
    return "accessory";
  }
  if (group === "arms") {
    return "disabled";
  }
  return "main";
}

export function TrainingPlanEditor({ data, onSavePlan, onResetPlan }: TrainingPlanEditorProps) {
  const plan = mergeTrainingPlan(data.trainingPlan, data.updatedAt);
  const lastDates = getLastTrainedDateByMuscleGroup(data);

  function updateItem(item: TrainingPlanItem, patch: Partial<TrainingPlanItem>) {
    const now = new Date().toISOString();
    const nextItem: TrainingPlanItem = {
      ...item,
      ...patch,
      updatedAt: now,
    };

    onSavePlan({
      ...plan,
      updatedAt: now,
      items: plan.items.map((planItem) => (planItem.id === item.id ? nextItem : planItem)),
    });
  }

  function updateEnabled(item: TrainingPlanItem, enabled: boolean) {
    updateItem(item, {
      enabled,
      role: enabled ? (item.role === "disabled" ? defaultRoleForGroup(item.muscleGroup) : item.role) : "disabled",
      allowStandalone: enabled ? item.allowStandalone : false,
    });
  }

  function updateRole(item: TrainingPlanItem, role: TrainingPlanRole) {
    updateItem(item, {
      role,
      enabled: role !== "disabled",
      allowStandalone: role === "disabled" ? false : item.allowStandalone,
    });
  }

  return (
    <section className="training-plan-list" aria-label="训练计划配置">
      <div className="training-plan-toolbar">
        <div>
          <h2>训练计划</h2>
          <p>按目标间隔推算今日建议，修改后会立即生效。</p>
        </div>
        <button className="button button--ghost" type="button" onClick={onResetPlan}>
          恢复默认
        </button>
      </div>

      {TRAINING_PLAN_GROUPS.map((group) => {
        const item = plan.items.find((planItem) => planItem.muscleGroup === group);
        if (!item) {
          return null;
        }

        const lastDate = lastDates[group] ?? null;
        const daysSince = getDaysSinceLastTrained(group, data);
        const nextDueStatus = formatNextDueStatus(item, daysSince);

        return (
          <article className={`training-plan-card ${item.enabled ? "" : "is-disabled"}`} key={item.id}>
            <div className="training-plan-card__header">
              <div>
                <h3>{MUSCLE_LABELS[group]}</h3>
                <p>
                  {roleLabels[item.role]} · 每 {item.targetIntervalDays} 天一次
                </p>
              </div>
              <label className="switch-control">
                <input
                  checked={item.enabled}
                  type="checkbox"
                  onChange={(event) => updateEnabled(item, event.target.checked)}
                />
                <span>参与提醒</span>
              </label>
            </div>

            <div className="training-plan-card__meta">
              <span>上次训练：{formatLastTrainedStatus(group, lastDate)}</span>
              <span>下次应练：{nextDueStatus}</span>
            </div>

            {group === "arms" && item.role === "disabled" ? (
              <p className="training-plan-card__note">当前不会单独推荐胳膊训练。</p>
            ) : null}

            <div className="training-plan-card__control">
              <span>角色</span>
              <div className="role-toggle" role="group" aria-label={`${MUSCLE_LABELS[group]}训练角色`}>
                {(["main", "accessory", "disabled"] as TrainingPlanRole[]).map((role) => (
                  <button
                    className={item.role === role ? "is-selected" : ""}
                    key={role}
                    type="button"
                    onClick={() => updateRole(item, role)}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            <div className="training-plan-card__control training-plan-card__control--inline">
              <span>频率</span>
              <div className="interval-stepper">
                <button
                  aria-label={`${MUSCLE_LABELS[group]}训练间隔减少一天`}
                  type="button"
                  onClick={() => updateItem(item, { targetIntervalDays: Math.max(1, item.targetIntervalDays - 1) })}
                >
                  -
                </button>
                <strong>{item.targetIntervalDays} 天</strong>
                <button
                  aria-label={`${MUSCLE_LABELS[group]}训练间隔增加一天`}
                  type="button"
                  onClick={() => updateItem(item, { targetIntervalDays: Math.min(30, item.targetIntervalDays + 1) })}
                >
                  +
                </button>
              </div>
            </div>

            <label className="training-plan-card__standalone">
              <input
                checked={item.allowStandalone}
                disabled={!item.enabled || item.role === "disabled"}
                type="checkbox"
                onChange={(event) => updateItem(item, { allowStandalone: event.target.checked })}
              />
              <span>允许单独推荐</span>
            </label>
          </article>
        );
      })}
    </section>
  );
}
