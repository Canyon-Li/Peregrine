import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { listArtifacts } from '../api/artifacts'
import { cancelRun, getRun, getRunTrace, recoverRun } from '../api/runs'
import { runModeLabel, runStatusLabel, stopReasonLabel } from '../agent/labels'
import { buildTurnView, formatDuration, formatTokens, humanizeRunError } from '../agent/turnPresentation'
import ArtifactList from '../components/ArtifactList'
import ContextInspector from '../components/ContextInspector'
import { ConfirmDialog } from '../components/ConfirmDialog'
import ExecutionTrace from '../components/ExecutionTrace'
import { Icon } from '../components/Icon'
import { ErrorState, LoadingState } from '../components/PageStates'
import { PageShell } from '../components/PageShell'
import { ActivityItems } from '../components/RunActivity'
import RunBadge from '../components/RunBadge'
import UsageInspector from '../components/UsageInspector'
import { toast } from '../stores/toasts'

export default function RunDetailPage({
  runId,
  onBack,
  onOpenConversation,
}: {
  runId: string
  onBack: () => void
  onOpenConversation: (conversationId: string) => void
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const runQuery = useQuery({ queryKey: ['run', runId], queryFn: () => getRun(runId), refetchInterval: 3000 })
  const traceQuery = useQuery({ queryKey: ['run-trace', runId], queryFn: () => getRunTrace(runId), refetchInterval: 3000 })
  const artifactsQuery = useQuery({ queryKey: ['artifacts', 'run', runId], queryFn: () => listArtifacts({ runId, limit: 100 }) })
  const run = runQuery.data
  const events = traceQuery.data?.events ?? []
  const turn = buildTurnView(events)
  const error = run && ['failed', 'interrupted'].includes(run.status)
    ? humanizeRunError(run.stop_reason, run.error)
    : null

  const cancel = async (): Promise<void> => {
    try {
      await cancelRun(runId)
      toast.info('Run 已取消')
      void queryClient.invalidateQueries({ queryKey: ['run', runId] })
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setConfirmCancel(false)
    }
  }
  const recover = async (): Promise<void> => {
    try {
      const next = await recoverRun(runId)
      toast.success(`已恢复为 Run ${next.run.id.slice(0, 8)}`)
      void queryClient.invalidateQueries({ queryKey: ['runs'] })
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <PageShell
      title="运行详情"
      subtitle={`执行 ${runId.slice(0, 8)}`}
      maxWidth={1040}
      actions={
        <div className="page-actions">
          {/* 侧栏已有一项叫「执行历史」，这里用「返回列表」区分：同一个名字
              出现在两个不同位置会让人（和读屏软件）分不清点了会去哪。 */}
          <button className="btn btn-sm" onClick={onBack}><Icon name="panelOpen" size={14} /> 返回列表</button>
          {run ? <RunBadge status={run.status} /> : null}
          {run?.status === 'running' ? <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancel(true)}>停止</button> : null}
          {run?.status === 'interrupted' ? <button className="btn btn-primary btn-sm" onClick={() => void recover()}>恢复</button> : null}
        </div>
      }
    >
      {runQuery.isPending || traceQuery.isPending ? <LoadingState label="正在加载 Run…" />
        : runQuery.isError || traceQuery.isError ? <ErrorState message={String(runQuery.error ?? traceQuery.error)} />
          : run ? (
            <div className="run-detail">
              <section className="run-summary">
                <div className="section-heading">
                  <div><h2>摘要</h2><p>{run.user_message || '未命名执行'}</p></div>
                  {run.conversation_id ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onOpenConversation(run.conversation_id as string)}
                    >
                      <Icon name="chat" size={14} /> 打开会话
                    </button>
                  ) : null}
                </div>
                {error ? <div className="run-error"><strong>{error.title}</strong><p>{error.message}</p></div> : null}
                <dl className="stat-strip">
                  <div><dt>状态</dt><dd>{runStatusLabel(run.status)}</dd></div>
                  <div><dt>模式</dt><dd>{runModeLabel(run.mode)}</dd></div>
                  <div><dt>步骤</dt><dd>{turn.steps || traceQuery.data?.run.steps || 0}</dd></div>
                  <div><dt>动作</dt><dd>{turn.toolCount}</dd></div>
                  <div><dt>Token 用量</dt><dd>{turn.usage ? formatTokens(turn.usage.totalTokens) : formatTokens(traceQuery.data?.run.total_tokens ?? 0)}</dd></div>
                  <div><dt>耗时</dt><dd>{formatDuration(turn.durationMs) || '—'}</dd></div>
                </dl>
              </section>

              <section className="run-detail-section">
                <div className="section-heading"><div><h2>用量</h2><p>主 Agent、Post-Run、缓存与 Provider 合计</p></div></div>
                <UsageInspector summary={traceQuery.data?.usage} />
              </section>

              <section className="run-detail-section">
                <div className="section-heading"><div><h2>执行过程</h2><p>人类可读的工作时间线</p></div></div>
                <ActivityItems events={events} />
              </section>

              <section className="run-detail-section">
                <div className="section-heading"><div><h2>上下文</h2><p>每个模型步骤的输入与压缩</p></div></div>
                <ContextInspector events={events} />
              </section>

              <RunArtifactsSection artifacts={artifactsQuery.data ?? []} />

              <section className="run-detail-section">
                <div className="section-heading"><div><h2>追踪</h2><p>按模型步骤分组的完整执行事件</p></div></div>
                <dl className="technical-grid">
                  <div><dt>Run ID</dt><dd>{run.id}</dd></div>
                  <div><dt>会话</dt><dd>{run.conversation_id ?? '—'}</dd></div>
                  <div><dt>Provider</dt><dd>{traceQuery.data?.run.provider ?? '—'}</dd></div>
                  <div><dt>模型</dt><dd>{traceQuery.data?.run.model ?? '—'}</dd></div>
                  <div><dt>停止原因</dt><dd>{run.stop_reason ? stopReasonLabel(run.stop_reason) : '—'}</dd></div>
                  <div><dt>原始错误</dt><dd>{run.error ?? '—'}</dd></div>
                </dl>
                <ExecutionTrace events={events} />
              </section>
            </div>
          ) : null}
      <ConfirmDialog
        open={confirmCancel}
        title="停止这个 Run？"
        message="Peregrine 会在当前可取消的操作结束后停止。"
        confirmLabel="停止 Run"
        onConfirm={() => void cancel()}
        onCancel={() => setConfirmCancel(false)}
      />
    </PageShell>
  )
}

export function RunArtifactsSection({
  artifacts,
}: {
  artifacts: Awaited<ReturnType<typeof listArtifacts>>
}): React.JSX.Element | null {
  if (artifacts.length === 0) return null
  return (
    <section className="run-detail-section">
      <div className="section-heading"><div><h2>交付物</h2><p>本次执行产生的文件与链接</p></div></div>
      <ArtifactList artifacts={artifacts} compact />
    </section>
  )
}
