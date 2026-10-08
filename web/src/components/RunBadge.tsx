import type { RunStatus } from '../api/types'
import { runStatusLabel } from '../agent/labels'

const ORDER: RunStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'interrupted',
]

export default function RunBadge({ status }: { status: RunStatus }): React.JSX.Element {
  // 走 runStatusLabel 而不是直接查表：接口返回值没有运行时校验，
  // 遇到没见过的状态时显示原始值，好过一枚空白徽标。
  return <span className={`badge badge-${status}`}>{runStatusLabel(status)}</span>
}

export { ORDER }
