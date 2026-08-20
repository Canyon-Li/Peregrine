import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAgentStatus, requestAgentPermission } from '../api/agent'
import { getSystemInfo } from '../api/system'
import AgentStatusView from '../components/AgentStatusView'

export default function SettingsPage(): React.JSX.Element {
  const queryClient = useQueryClient()

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
    <div style={{ padding: 16, overflowY: 'auto', flex: 1, maxWidth: 640 }}>
      <h2 style={{ margin: 0, fontSize: 16, marginBottom: 12 }}>Settings</h2>

      <div className="panel" style={{ padding: 14 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Peregrine Host</h3>
        {infoQuery.isLoading ? (
          <div className="text-dim"><span className="spinner" /> 正在检查后端…</div>
        ) : infoQuery.isError ? (
          <div className="error-text">
            无法连接 Peregrine Host。请先在 backend 启动：
            <pre style={{ background: 'var(--bg)', padding: 10, borderRadius: 6 }}>{'python -m app.server'}</pre>
          </div>
        ) : (
          <table className="table">
            <tbody>
              <tr>
                <td className="text-muted">host status</td>
                <td className="text-dim">{infoQuery.data?.status ?? '-'}</td>
              </tr>
              <tr>
                <td className="text-muted">provider</td>
                <td>{infoQuery.data?.provider ?? '-'}</td>
              </tr>
              <tr>
                <td className="text-muted">model</td>
                <td>{infoQuery.data?.model ?? '-'}</td>
              </tr>
              <tr>
                <td className="text-muted">host version</td>
                <td className="text-dim">{infoQuery.data?.version ?? '-'}</td>
              </tr>
              <tr>
                <td className="text-muted">database</td>
                <td className="text-dim">{infoQuery.data?.database ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="panel" style={{ padding: 14, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Agent</h3>
        <AgentStatusView
          status={agentQuery.data ?? null}
          loading={agentQuery.isLoading}
          onRequestPermission={(p) => void doRequestPermission(p)}
        />
        {(agentQuery.data?.permissions.automation === 'required' ||
          agentQuery.data?.permissions.screen_access === 'required') && (
          <div className="text-dim" style={{ marginTop: 8 }}>
            点击 Request 会打开系统权限提示；如果未立即生效，请到
            System Settings → Privacy &amp; Security 手动开启。
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: 14, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, marginTop: 0 }}>Web</h3>
        <table className="table">
          <tbody>
            <tr>
              <td className="text-muted">app version</td>
              <td>0.1.0</td>
            </tr>
            <tr>
              <td className="text-muted">platform</td>
              <td className="text-dim">{web?.platform ?? 'web'}</td>
            </tr>
            <tr>
              <td className="text-muted">web</td>
              <td className="text-dim">{web?.versions.web ?? '-'}</td>
            </tr>
            <tr>
              <td className="text-muted">chrome</td>
              <td className="text-dim">{web?.versions.chrome ?? '-'}</td>
            </tr>
            <tr>
              <td className="text-muted">node</td>
              <td className="text-dim">{web?.versions.node ?? '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
