/** Usage Inspector：展示 Main Agent 与 Post-Run 的完整 Provider 用量。 */

import type { ModelUsage, RunUsageSummary } from '../api/types'
import { runBudgetReasonLabel, runBudgetStatusLabel } from '../agent/labels'
import { formatTokens } from '../agent/turnPresentation'
import { EmptyState } from './ui'

function optionalTokens(value: number | null | undefined): string {
  return value === null || value === undefined ? '无数据' : formatTokens(value)
}

function hasUsage(usage: ModelUsage): boolean {
  return usage.total_tokens > 0 || (usage.model_calls ?? 0) > 0
}

function PostRunRow({
  label,
  usage,
  status,
}: {
  label: string
  usage: ModelUsage
  status?: string
}): React.JSX.Element {
  return (
    <div className="usage-post-row">
      <span>{label}</span>
      <strong className="mono">{formatTokens(usage.total_tokens)}</strong>
      <small>{status ?? `${usage.model_calls ?? 0} 次调用`}</small>
    </div>
  )
}

export default function UsageInspector({
  summary,
}: {
  summary: RunUsageSummary | null | undefined
}): React.JSX.Element {
  if (!summary) {
    return <EmptyState title="暂无用量数据" hint="Trace 加载后会显示完整 Provider 用量。" />
  }
  const main = summary.main_agent
  const cacheKnown = main.cached_input_tokens !== null
    && main.cached_input_tokens !== undefined

  return (
    <section className="usage-inspector">
      <div className="usage-heading">
        <div><h3>主 Agent</h3><span>{main.model_calls ?? 0} 次模型调用</span></div>
        <strong className="mono">已处理 {formatTokens(main.input_tokens)}</strong>
      </div>
      <dl className="usage-main-grid">
        <div><dt>缓存命中</dt><dd>{optionalTokens(main.cached_input_tokens)}</dd></div>
        <div><dt>未缓存</dt><dd>{optionalTokens(main.uncached_input_tokens)}</dd></div>
        <div><dt>输出</dt><dd>{formatTokens(main.output_tokens)}</dd></div>
        <div><dt>缓存读取</dt><dd>{optionalTokens(main.cache_read_input_tokens)}</dd></div>
        <div><dt>缓存写入</dt><dd>{optionalTokens(main.cache_write_input_tokens)}</dd></div>
        <div><dt>工具定义</dt><dd>≈{formatTokens(summary.tool_schema_tokens_estimated)}</dd></div>
      </dl>
      {!cacheKnown ? (
        <p className="usage-note">当前 Provider 没有返回缓存细分；「无数据」不等于 0。</p>
      ) : null}
      <div className="usage-budget">
        <div className="usage-heading">
          <div><h3>Run 预算</h3><span>{runBudgetStatusLabel(summary.run_budget_status)}</span></div>
          <strong className="mono">计入预算 {formatTokens(summary.main_agent_chargeable_tokens)}</strong>
        </div>
        <p className="usage-note">
          Token {summary.run_budget_warning_tokens === null ? '—' : formatTokens(summary.run_budget_warning_tokens)}
          {' → '}{summary.run_budget_finalization_tokens === null ? '—' : formatTokens(summary.run_budget_finalization_tokens)}
          {' → '}{summary.run_budget_hard_tokens === null ? '—' : formatTokens(summary.run_budget_hard_tokens)}
          {' · 调用 '}{summary.run_budget_warning_model_calls ?? '—'}
          {' → '}{summary.run_budget_finalization_model_calls ?? '—'}
          {' → '}{summary.run_budget_hard_model_calls ?? '—'}
          {summary.run_budget_reason ? ` · 触发原因：${runBudgetReasonLabel(summary.run_budget_reason)}` : ''}
        </p>
      </div>
      <div className="usage-post-run">
        <PostRunRow
          label="上下文摘要"
          usage={summary.context_summary}
          status={
            summary.context_summary_status === 'not_run'
              ? '未执行'
              : `${summary.context_summary_provider ?? '—'} / ${summary.context_summary_model ?? 'default'} · ${Math.round(summary.context_summary_duration_ms)} ms`
          }
        />
        <PostRunRow
          label="记忆反思"
          usage={summary.memory_reflection}
          status={
            summary.memory_reflection_status === 'skipped'
              ? `已跳过 · ${summary.memory_reflection_skip_reason ?? 'policy'}`
              : undefined
          }
        />
        <PostRunRow label="记忆维护" usage={summary.memory_maintenance} />
      </div>
      <div className="usage-total">
        <div><span>Provider 合计</span><small>{summary.provider_total.model_calls ?? 0} 次调用</small></div>
        <strong className="mono">{formatTokens(summary.provider_total.total_tokens)}</strong>
      </div>
      {!hasUsage(summary.context_summary) && !hasUsage(summary.memory_reflection) && !hasUsage(summary.memory_maintenance) ? (
        <p className="usage-note">本 Run 没有产生辅助模型或 Post-Run 模型开销。</p>
      ) : null}
    </section>
  )
}
