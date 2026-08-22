import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAgentStatus, requestAgentPermission } from '../api/agent'
import { getSystemInfo } from '../api/system'
import AgentStatusView from '../components/AgentStatusView'
import { ErrorState } from '../components/PageStates'
import { PageShell } from '../components/PageShell'

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
    <PageShell
      title="Settings"
      subtitle="Host connection, Agent permissions, and Web environment."
      maxWidth={720}
    >
      <section className="settings-section">
        <h2>Peregrine Host</h2>
        {infoQuery.isLoading ? (
          <div className="text-dim"><span className="spinner" /> Checking Host…</div>
        ) : infoQuery.isError ? (
          <ErrorState
            message="Could not connect to Peregrine Host"
            hint="Start python -m app.server from backend, then retry."
            onRetry={() => void infoQuery.refetch()}
          />
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
      </section>

      <section className="settings-section">
        <h2>Agent</h2>
        <AgentStatusView
          status={agentQuery.data ?? null}
          loading={agentQuery.isLoading}
          onRequestPermission={(p) => void doRequestPermission(p)}
        />
        {(agentQuery.data?.permissions.automation === 'required' ||
          agentQuery.data?.permissions.screen_access === 'required') && (
          <div className="settings-section__hint">
            Request opens the system permission prompt. If the change is not immediate,
            enable it in System Settings → Privacy &amp; Security.
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>Web</h2>
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
      </section>
    </PageShell>
  )
}
