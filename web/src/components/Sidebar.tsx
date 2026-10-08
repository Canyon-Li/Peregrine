/** 导航栏（Web Rail）：图标导航 + 可展开的中文标签 + 底部 Settings / Host 状态。

收起时宽 68px，只显示图标（悬停有 title 提示）；展开时宽 208px，显示中文标签。
展开状态记在 localStorage，避免每次刷新都要重新展开。
*/

import { useState } from 'react'
import type { ReactElement } from 'react'
import type { PageKey } from '../App'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { StatusDot } from './ui'

const RAIL_EXPANDED_KEY = 'peregrine.railExpanded'

/** 读取展开状态；localStorage 不可用（无痕/SSR/测试）时回退为收起。 */
function loadExpanded(): boolean {
  try {
    return localStorage.getItem(RAIL_EXPANDED_KEY) === '1'
  } catch {
    return false
  }
}

export interface SidebarItem {
  key: PageKey
  label: string
  icon: IconName
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'chat', label: '工作区', icon: 'chat' },
  { key: 'runs', label: '执行历史', icon: 'runs' },
  { key: 'automations', label: '自动化', icon: 'automations' },
  { key: 'approvals', label: '审批', icon: 'approvals' },
  { key: 'memory', label: '长期记忆', icon: 'memory' },
  { key: 'artifacts', label: '交付物', icon: 'artifacts' },
]

export interface SidebarProps {
  current: PageKey
  onNavigate: (page: PageKey) => void
  connected: boolean
  /** 各导航项徽标（数字 >0 才显示），如 running run 数 / pending 审批数。 */
  badges?: Partial<Record<PageKey, number>>
  /** 背景状态点（非常克制）：Chat running、Artifacts 有新结果等。 */
  dots?: Partial<Record<PageKey, boolean>>
}

export default function Sidebar({
  current,
  onNavigate,
  connected,
  badges,
  dots,
}: SidebarProps): ReactElement {
  const [expanded, setExpanded] = useState<boolean>(loadExpanded)

  const toggleExpanded = (): void => {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(RAIL_EXPANDED_KEY, next ? '1' : '0')
      } catch {
        /* 持久化失败不影响本次展开 */
      }
      return next
    })
  }

  const badgeFor = (key: PageKey): number | null => {
    const value = badges?.[key]
    return typeof value === 'number' && value > 0 ? value : null
  }

  const renderItem = (item: SidebarItem): ReactElement => (
    <button
      key={item.key}
      type="button"
      className={`nav-item ${current === item.key ? 'active' : ''}`}
      onClick={() => onNavigate(item.key)}
      aria-current={current === item.key ? 'page' : undefined}
      aria-label={item.label}
      title={item.label}
    >
      <Icon name={item.icon} />
      <span className="nav-item__label">{item.label}</span>
      {badgeFor(item.key) !== null ? (
        <span className="nav-badge" aria-label={`${badgeFor(item.key)}`}>
          {badgeFor(item.key)! > 99 ? '99+' : badgeFor(item.key)}
        </span>
      ) : dots?.[item.key] ? (
        <span className="nav-badge nav-badge--dot" aria-hidden="true" />
      ) : null}
    </button>
  )

  return (
    <nav
      className={`sidebar ${expanded ? 'is-expanded' : ''}`}
      aria-label="主导航"
    >
      <button
        type="button"
        className="sidebar-brand"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? '收起导航栏' : '展开导航栏'}
        title={expanded ? '收起导航栏' : '展开导航栏'}
      >
        <span className="sidebar-brand__mark" aria-hidden="true">P</span>
        <span className="sidebar-brand__word">Peregrine</span>
        <Icon name="chevronDown" size={14} className="sidebar-brand__chevron" />
      </button>

      <div className="sidebar-nav">{SIDEBAR_ITEMS.map(renderItem)}</div>

      <div className="sidebar-footer">
        {renderItem({ key: 'settings', label: '设置', icon: 'settings' })}
        <div
          className="host-status"
          title={connected ? 'Host 已连接' : 'Host 已离线'}
          aria-label={connected ? 'Host 就绪' : 'Host 离线'}
        >
          <StatusDot tone={connected ? 'ready' : 'offline'} />
        </div>
      </div>
    </nav>
  )
}
