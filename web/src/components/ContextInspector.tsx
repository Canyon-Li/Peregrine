/** Context Inspector：按模型步骤展示输入构成与压缩结果。 */

import { useEffect, useMemo, useState } from 'react'

import type { AgentEvent } from '../api/types'
import { compactionStageLabel } from '../agent/labels'
import {
  buildContextSteps,
  type ContextStepVM,
} from '../agent/runAnalysis'
import { formatTokens } from '../agent/turnPresentation'
import { EmptyState } from './ui'

function TokenTransition({ before, after }: { before: number; after: number }): React.JSX.Element {
  return (
    <span className="context-token-transition mono">
      {formatTokens(before)}{before !== after ? ` → ${formatTokens(after)}` : ''}
    </span>
  )
}

function CompactionList({ step }: { step: ContextStepVM }): React.JSX.Element {
  const actions = [
    step.compactedToolResults > 0
      ? `${step.compactedToolResults} 个工具结果已压缩`
      : null,
    step.removedToolRounds > 0
      ? `${step.removedToolRounds} 个旧工具轮已移除`
      : null,
    step.summaryUpdated ? '会话摘要已更新' : null,
  ].filter((item): item is string => item !== null)

  return (
    <section className="context-section">
      <div className="context-section__heading">
        <h3>压缩</h3>
        <span className={`context-stage ${step.compactionStage === 'none' ? '' : 'active'}`}>
          {compactionStageLabel(step.compactionStage)}
        </span>
      </div>
      {actions.length > 0 ? (
        <ul className="context-checks">
          {actions.map((action) => <li key={action}>✓ {action}</li>)}
        </ul>
      ) : (
        <p className="context-muted">本步骤不需要压缩。</p>
      )}
      {step.summaryError ? <p className="context-warning">摘要更新失败：{step.summaryError}</p> : null}
      {step.summaryProvider || step.summaryUsage > 0 || step.summaryError ? (
        <dl className="context-summary-details">
          <div><dt>摘要模型</dt><dd>{step.summaryProvider ? `${step.summaryProvider} / ${step.summaryModel ?? 'default'}` : '历史记录未提供'}</dd></div>
          <div><dt>摘要用量</dt><dd className="mono">{formatTokens(step.summaryUsage)}</dd></div>
          <div><dt>耗时</dt><dd className="mono">{step.summaryDurationMs === null ? '—' : `${Math.round(step.summaryDurationMs)} ms`}</dd></div>
          <div><dt>原始历史</dt><dd>{step.summaryError ? '已保留' : '摘要成功后仍由数据库完整保存'}</dd></div>
        </dl>
      ) : null}
    </section>
  )
}

export default function ContextInspector({
  events,
}: {
  events: AgentEvent[]
}): React.JSX.Element {
  const steps = useMemo(() => buildContextSteps(events), [events])
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const selected = steps.find((step) => step.step === selectedStep) ?? steps.at(-1)

  useEffect(() => {
    if (selectedStep === null && steps.length > 0) setSelectedStep(steps.at(-1)!.step)
    if (selectedStep !== null && !steps.some((step) => step.step === selectedStep)) {
      setSelectedStep(steps.at(-1)?.step ?? null)
    }
  }, [selectedStep, steps])

  if (!selected) {
    return <EmptyState title="暂无上下文数据" hint="模型请求开始后会记录上下文构成。" />
  }

  return (
    <div className="context-inspector">
      <div className="context-step-picker" aria-label="选择模型步骤">
        <span>模型步骤</span>
        <div>
          {steps.map((step) => (
            <button
              key={step.step}
              type="button"
              className={step.step === selected.step ? 'active' : ''}
              aria-pressed={step.step === selected.step}
              onClick={() => setSelectedStep(step.step)}
            >
              {step.step}
            </button>
          ))}
        </div>
      </div>

      <section className="context-section">
        <h3>上下文</h3>
        <dl className="context-metrics">
          <div><dt>输入</dt><dd><TokenTransition before={selected.originalInputTokens} after={selected.preparedInputTokens} /></dd></div>
          <div><dt>上下文窗口</dt><dd className="mono">{formatTokens(selected.contextWindow)}</dd></div>
          <div><dt>可用预算</dt><dd className="mono">{formatTokens(selected.workingInputBudget)}</dd></div>
          <div><dt>模型输入上限</dt><dd className="mono">{formatTokens(selected.inputBudget)}</dd></div>
          <div><dt>触发 / 目标</dt><dd className="mono">{formatTokens(selected.triggerTokens)} / {formatTokens(selected.targetTokens)}</dd></div>
          <div><dt>窗口占用</dt><dd className="mono">{(selected.windowUsageRatio * 100).toFixed(1)}%</dd></div>
          <div><dt>预算占用</dt><dd className="mono">{(selected.budgetUsageRatio * 100).toFixed(1)}%</dd></div>
          <div><dt>工具定义</dt><dd className="mono">{formatTokens(selected.toolSchemaTokens)}</dd></div>
          <div><dt>工具结果</dt><dd><TokenTransition before={selected.toolResultTokensBefore} after={selected.toolResultTokensAfter} /></dd></div>
          <div><dt>消息</dt><dd><TokenTransition before={selected.messageTokensBefore} after={selected.messageTokensAfter} /></dd></div>
          <div><dt>技能</dt><dd className="mono">{formatTokens(selected.skillTokens)}</dd></div>
        </dl>
        <progress
          className="context-window-progress"
          max={Math.max(1, selected.contextWindow)}
          value={Math.min(selected.preparedInputTokens, Math.max(1, selected.contextWindow))}
          aria-label="上下文窗口占用"
        />
      </section>

      <section className="context-section">
        <h3>上下文构成</h3>
        <div className="context-breakdown">
          {selected.breakdown.map((item) => (
            <div key={item.key} className="context-breakdown__row">
              <span>{item.label}</span>
              <progress max={1} value={item.ratio} aria-label={`${item.label} 占比`} />
              <strong className="mono">{formatTokens(item.tokens)}</strong>
              <small className="mono">{(item.ratio * 100).toFixed(0)}%</small>
            </div>
          ))}
        </div>
        <p className="context-note">Memory、Task 与系统消息当前没有独立计数字段，统一包含在「消息与注入内容」中。</p>
      </section>

      <CompactionList step={selected} />

    </div>
  )
}
