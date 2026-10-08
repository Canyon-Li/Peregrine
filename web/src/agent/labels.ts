/** 运行状态、模式、预算与压缩阶段的中文标签。
 *
 * 这些枚举值会直接落在界面上（RunBadge、Run Inspector、Run Detail 的 Summary），
 * 集中成一份，避免同一个概念在不同页面出现不同译法。
 *
 * 工具名、provider、model id、事件类型属于技术标识，保留英文，不放进来。
 */

import type { RunStatus } from '../api/types'

/** 查表并把未知值原样返回。
 *
 * 必须用 Object.hasOwn 而不是 `table[key] ?? fallback`：对象字面量继承自
 * Object.prototype，`table['toString']` 会拿到一个函数——它不是 nullish，
 * `??` 兜不住，最终把函数交给 React 渲染会直接抛错。后端加了新枚举值时
 * 走的就是这条兜底路径，所以这里要真的兜住。
 */
function lookup(table: Record<string, string>, key: string): string {
  return Object.hasOwn(table, key) ? table[key] : key
}

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  pending: '准备中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  interrupted: '已中断',
}

/** 未知值原样返回：后端加了新枚举时，界面上宁可看到英文，也不要变成空白。 */
export function runStatusLabel(status: string): string {
  return lookup(RUN_STATUS_LABEL, status)
}

export const RUN_MODE_LABEL: Record<string, string> = {
  normal: '普通',
  plan: '规划',
}

export function runModeLabel(mode: string): string {
  return lookup(RUN_MODE_LABEL, mode)
}

/** 预算阶段：active 是正常态，exceeded 才是真的超了。 */
export const RUN_BUDGET_STATUS_LABEL: Record<string, string> = {
  disabled: '未启用',
  not_configured: '未配置',
  active: '正常',
  warning: '预警',
  finalizing: '收口中',
  exceeded: '已达上限',
}

export function runBudgetStatusLabel(status: string): string {
  return lookup(RUN_BUDGET_STATUS_LABEL, status)
}

/** 触发当前预算阶段的主指标。 */
export const RUN_BUDGET_REASON_LABEL: Record<string, string> = {
  tokens: 'Token 用量',
  model_calls: '调用次数',
}

export function runBudgetReasonLabel(reason: string): string {
  return lookup(RUN_BUDGET_REASON_LABEL, reason)
}

/** 本轮执行结束的原因。
 *
 * 取值必须与 backend/app/agent/result.py 的 AgentStopReason 完全一致——那是唯一的
 * 权威来源，后端只从这一处写入 stop_reason。注意 final_answer 是「正常跑完」而非
 * 异常，改动本表时请对照该枚举逐项核对。
 */
export const STOP_REASON_LABEL: Record<string, string> = {
  final_answer: '已给出最终回答',
  max_steps: '已达到最大执行步数',
  model_error: '模型调用失败',
  repeated_tool_call: '重复调用了相同工具',
  context_error: '上下文超过可用窗口',
  run_budget: '用量已达上限',
  cancelled: '已由用户取消',
  interrupted: '执行已中断',
}

export function stopReasonLabel(reason: string): string {
  return lookup(STOP_REASON_LABEL, reason)
}

/** 判断 stop_reason 是否有简短中文标签（否则调用方改用完整说明文案）。 */
export function hasStopReasonLabel(reason: string): boolean {
  return Object.hasOwn(STOP_REASON_LABEL, reason)
}

/** 本次模型请求实际执行到的上下文压缩阶段。 */
export const COMPACTION_STAGE_LABEL: Record<string, string> = {
  none: '未触发',
  tool_results: '压缩工具结果',
  tool_rounds: '移除旧工具轮次',
  tool_results_and_rounds: '压缩工具结果并移除旧轮次',
  rolling_summary: '更新滚动摘要',
  tool_and_rolling_summary: '压缩工具结果并更新摘要',
}

export function compactionStageLabel(stage: string): string {
  return lookup(COMPACTION_STAGE_LABEL, stage)
}
