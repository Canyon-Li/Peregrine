import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { getAgentStatus, requestAgentPermission } from '../api/agent'
import { getSystemInfo } from '../api/system'
import AgentStatusView from '../components/AgentStatusView'
import ExtensionsSettings from '../components/ExtensionsSettings'
import { ErrorState } from '../components/PageStates'
import { PageShell } from '../components/PageShell'

export default function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [section, setSection] = useState<'general' | 'extensions'>('general')

  const infoQuery = useQuery({
    queryKey: ['system-info'],
    queryFn: () => getSystemInfo(),
    refetchInterval: 5000,
    retry: false,
  })

  const agentQuery = useQuery({
    queryKey: ['agent-status'],
    queryFn: () => getAgentStatus(),
    refetchInterval: 5000,
    retry: false,
  })

  const web = window.peregrine

  const doRequestPermission = async (
    permission: 'automation' | 'screen_access',
  ): Promise<void> => {
    try {
      await requestAgentPermission(permission)
      void queryClient.invalidateQueries({ queryKey: ['agent-status'] })
    } catch (err) {
      console.warn('agent permission request failed', err)
    }
  }

  return (
    <PageShell
      title="设置"
      subtitle="管理 Peregrine 的运行环境与扩展能力。"
      maxWidth={1120}
    >
      <div className="settings-layout">
        <aside className="settings-nav" aria-label="设置分类">
          <button className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}>
            <strong>通用</strong><span>运行环境与权限</span>
          </button>
          <button className={section === 'extensions' ? 'active' : ''} onClick={() => setSection('extensions')}>
            <strong>扩展能力</strong><span>Skills 与 MCP</span>
          </button>
        </aside>

        <main className="settings-content">
          {section === 'extensions' ? <ExtensionsSettings /> : (
            <div className="settings-general">
              <header className="settings-content__header">
                <h2>通用</h2>
                <p>查看 Host 与本地运行环境。</p>
              </header>

              <section className="settings-group">
                <header className="settings-group__header">
                  <div><h3>Peregrine Host</h3><p>模型服务与本地数据运行状态</p></div>
                  {!infoQuery.isLoading && !infoQuery.isError ? <span className="settings-status"><i />已连接</span> : null}
                </header>
                {infoQuery.isLoading ? (
                  <div className="settings-loading"><span className="spinner" />正在检查 Host…</div>
                ) : infoQuery.isError ? (
                  <ErrorState
                    message="无法连接 Peregrine Host"
                    hint="请在 backend 目录运行 python -m app.server，然后重试。"
                    onRetry={() => void infoQuery.refetch()}
                  />
                ) : (
                  <dl className="settings-info-list">
                    <InfoRow label="模型提供商" value={infoQuery.data?.provider ?? '—'} />
                    <InfoRow label="当前模型" value={infoQuery.data?.model ?? '—'} />
                    <InfoRow label="Host 版本" value={infoQuery.data?.version ?? '—'} />
                    <InfoRow label="数据库" value={infoQuery.data?.database ?? '—'} mono />
                  </dl>
                )}
              </section>

              <section className="settings-group">
                <header className="settings-group__header">
                  <div><h3>权限</h3><p>本地运行环境与文件访问</p></div>
                </header>
                <AgentStatusView
                  status={agentQuery.data ?? null}
                  loading={agentQuery.isLoading}
                  onRequestPermission={(p) => void doRequestPermission(p)}
                />
                {(agentQuery.data?.permissions.automation === 'required' ||
                  agentQuery.data?.permissions.screen_access === 'required') && (
                  <div className="settings-section__hint">
                    请求后若状态没有立即变化，请前往“系统权限设置”手动开启。
                  </div>
                )}
              </section>

              <section className="settings-group">
                <header className="settings-group__header">
                  <div><h3>界面客户端</h3><p>当前应用与运行环境版本</p></div>
                </header>
                <dl className="settings-info-list">
                  <InfoRow label="应用版本" value="0.1.0" />
                  <InfoRow label="平台" value={web?.platform ?? 'web'} />
                  <InfoRow label="Web" value={web?.versions.web ?? '—'} />
                  <InfoRow label="Chrome / Node" value={`${web?.versions.chrome ?? '—'} / ${web?.versions.node ?? '—'}`} />
                </dl>
              </section>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}): React.JSX.Element {
  return <div><dt>{label}</dt><dd className={mono ? 'mono' : undefined}>{value}</dd></div>
}
