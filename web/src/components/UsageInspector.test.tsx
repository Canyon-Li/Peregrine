/** Usage Inspector：缓存未知语义与 Post-Run 总账。 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import type { RunUsageSummary } from '../api/types'
import UsageInspector from './UsageInspector'

describe('UsageInspector', () => {
  it('展示 Main、Post-Run、调用次数与 Provider Total', () => {
    const summary: RunUsageSummary = {
      main_agent: {
        input_tokens: 94_600,
        output_tokens: 2_800,
        total_tokens: 97_400,
        cached_input_tokens: 71_200,
        uncached_input_tokens: 23_400,
        cache_read_input_tokens: 71_200,
        cache_write_input_tokens: 4_000,
        model_calls: 9,
      },
      context_summary: { input_tokens: 1_800, output_tokens: 100, total_tokens: 1_900, model_calls: 1 },
      memory_reflection: { input_tokens: 2_900, output_tokens: 200, total_tokens: 3_100, model_calls: 1 },
      memory_maintenance: { input_tokens: 0, output_tokens: 0, total_tokens: 0, model_calls: 0 },
      provider_total: { input_tokens: 97_500, output_tokens: 3_000, total_tokens: 100_500, model_calls: 10 },
      tool_schema_tokens_estimated: 39_000,
      memory_reflection_status: 'completed',
      memory_reflection_skip_reason: null,
      context_summary_status: 'completed',
      context_summary_provider: 'qwen',
      context_summary_model: 'qwen-turbo',
      context_summary_duration_ms: 820,
      main_agent_chargeable_tokens: 26_200,
      run_budget_status: 'warning',
      run_budget_reason: 'model_calls',
      run_budget_warning_tokens: 50_000,
      run_budget_finalization_tokens: 75_000,
      run_budget_hard_tokens: 100_000,
      run_budget_warning_model_calls: 8,
      run_budget_finalization_model_calls: 10,
      run_budget_hard_model_calls: 12,
    }
    const html = renderToStaticMarkup(<UsageInspector summary={summary} />)
    expect(html).toContain('已处理 94.6k')
    expect(html).toContain('71.2k')
    expect(html).toContain('记忆反思')
    expect(html).toContain('上下文摘要')
    expect(html).toContain('qwen / qwen-turbo · 820 ms')
    expect(html).toContain('100.5k')
    expect(html).toContain('10 次调用')
    expect(html).toContain('≈39k')
    expect(html).toContain('计入预算 26.2k')
    // 预算阶段与触发指标都走 agent/labels，界面不直接暴露后端枚举值。
    expect(html).toContain('预警')
    expect(html).toContain('触发原因：调用次数')
  })

  it('缓存字段未知时不显示成零', () => {
    const summary: RunUsageSummary = {
      main_agent: { input_tokens: 10, output_tokens: 2, total_tokens: 12, model_calls: 1 },
      context_summary: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      memory_reflection: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      memory_maintenance: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      provider_total: { input_tokens: 10, output_tokens: 2, total_tokens: 12, model_calls: 1 },
      tool_schema_tokens_estimated: 0,
      memory_reflection_status: 'skipped',
      memory_reflection_skip_reason: 'gate:smalltalk',
      context_summary_status: 'not_run',
      context_summary_provider: null,
      context_summary_model: null,
      context_summary_duration_ms: 0,
      main_agent_chargeable_tokens: 12,
      run_budget_status: 'active',
      run_budget_reason: null,
      run_budget_warning_tokens: 50_000,
      run_budget_finalization_tokens: 75_000,
      run_budget_hard_tokens: 100_000,
      run_budget_warning_model_calls: 8,
      run_budget_finalization_model_calls: 10,
      run_budget_hard_model_calls: 12,
    }
    const html = renderToStaticMarkup(<UsageInspector summary={summary} />)
    expect(html).toContain('无数据')
    expect(html).toContain('「无数据」不等于 0')
    expect(html).toContain('已跳过 · gate:smalltalk')
  })
})
