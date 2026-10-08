/** agent/labels：界面文案的唯一来源，以及未知枚举的兜底行为。 */

import { describe, expect, it } from 'vitest'

import {
  compactionStageLabel,
  hasStopReasonLabel,
  runBudgetReasonLabel,
  runBudgetStatusLabel,
  runModeLabel,
  runStatusLabel,
  stopReasonLabel,
} from './labels'

describe('labels', () => {
  it('已知枚举值全部有中文文案', () => {
    expect(runStatusLabel('running')).toBe('运行中')
    expect(runStatusLabel('interrupted')).toBe('已中断')
    expect(runModeLabel('plan')).toBe('规划')
    expect(runBudgetStatusLabel('exceeded')).toBe('已达上限')
    expect(runBudgetReasonLabel('model_calls')).toBe('调用次数')
    expect(stopReasonLabel('run_budget')).toBe('用量已达上限')
    expect(compactionStageLabel('rolling_summary')).toBe('更新滚动摘要')
  })

  it('stop_reason 覆盖后端 AgentStopReason 的全部取值', () => {
    // 逐项对应 backend/app/agent/result.py 的 AgentStopReason。
    // 后端新增枚举值时，这里会失败，提醒同步补文案——否则界面会漏出英文枚举值。
    const BACKEND_STOP_REASONS = [
      'final_answer',
      'context_error',
      'model_error',
      'repeated_tool_call',
      'max_steps',
      'run_budget',
      'cancelled',
      'interrupted',
    ]
    for (const reason of BACKEND_STOP_REASONS) {
      expect(hasStopReasonLabel(reason), `${reason} 缺少中文文案`).toBe(true)
      expect(stopReasonLabel(reason)).not.toBe(reason)
    }
    // final_answer 是「正常跑完」，最常出现在已完成 Run 的详情页上。
    expect(stopReasonLabel('final_answer')).toBe('已给出最终回答')
  })

  it('未知枚举值原样返回，不显示空白', () => {
    // 后端新增枚举时，界面上宁可看到英文，也不要变成 undefined/空白。
    expect(runStatusLabel('queued')).toBe('queued')
    expect(runModeLabel('review')).toBe('review')
    expect(runBudgetStatusLabel('throttled')).toBe('throttled')
    expect(runBudgetReasonLabel('wall_clock')).toBe('wall_clock')
    expect(stopReasonLabel('timeout')).toBe('timeout')
    expect(compactionStageLabel('semantic_trim')).toBe('semantic_trim')
  })

  it('不把原型属性当成枚举值', () => {
    // 直接查表会命中 Object.prototype 上的 toString 等键，必须走 ?? 兜底。
    expect(runStatusLabel('toString')).toBe('toString')
    expect(stopReasonLabel('constructor')).toBe('constructor')
  })
})
