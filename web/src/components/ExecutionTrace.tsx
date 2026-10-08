/** Execution Trace：按步骤与事件类别查看完整技术轨迹。 */

import { useMemo, useState } from 'react'

import type { AgentEvent } from '../api/types'
import { compactionStageLabel } from '../agent/labels'
import { buildTraceGroups } from '../agent/runAnalysis'
import { formatDuration, formatTokens } from '../agent/turnPresentation'
import { EmptyState } from './ui'

type TraceFilter = 'all' | 'model' | 'tools' | 'approval' | 'memory'

const FILTERS: Array<{ id: TraceFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'model', label: '模型' },
  { id: 'tools', label: '工具' },
  { id: 'approval', label: '审批' },
  { id: 'memory', label: '记忆' },
]

function matches(event: AgentEvent, filter: TraceFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'model') return event.type.startsWith('model_')
  if (filter === 'tools') return event.type.startsWith('tool_') && !event.type.includes('approval')
  if (filter === 'approval') return event.type.includes('approval')
  return event.type.startsWith('memory_')
}

function time(iso: string): string {
  const value = new Date(iso)
  return Number.isNaN(value.getTime())
    ? iso
    : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function eventMeta(event: AgentEvent): string {
  const parts: string[] = []
  if (event.tool_call?.name) parts.push(event.tool_call.name)
  if (event.tool_result) {
    parts.push(event.tool_result.success ? '成功' : '失败')
    parts.push(formatDuration(event.tool_result.duration_ms))
  }
  if (event.usage) parts.push(`${formatTokens(event.usage.total_tokens)} Token`)
  if (event.compaction_stage && event.compaction_stage !== 'none') {
    parts.push(compactionStageLabel(event.compaction_stage))
  }
  return parts.join(' · ')
}

export default function ExecutionTrace({ events }: { events: AgentEvent[] }): React.JSX.Element {
  const [filter, setFilter] = useState<TraceFilter>('all')
  const filtered = useMemo(() => events.filter((event) => matches(event, filter)), [events, filter])
  const groups = useMemo(() => buildTraceGroups(filtered), [filtered])

  return (
    <div className="execution-trace">
      <div className="trace-filters" aria-label="追踪筛选">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? 'active' : ''}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {groups.length === 0 ? (
        <EmptyState title="没有匹配的追踪事件" hint="切换筛选条件查看其它事件。" />
      ) : groups.map((group) => (
        <section key={group.id} className="trace-group">
          <h3>{group.label}</h3>
          <div className="trace-events">
            {group.events.map((event) => (
              <details key={event.event_id} className={`trace-event trace-event--${event.type.includes('failed') ? 'failed' : 'normal'}`}>
                <summary>
                  <time>{time(event.event_time)}</time>
                  <span>{event.type.replaceAll('_', ' ')}</span>
                  <small>{eventMeta(event)}</small>
                </summary>
                <pre>{JSON.stringify(event, null, 2)}</pre>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
