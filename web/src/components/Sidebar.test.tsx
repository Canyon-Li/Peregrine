/** App Shell：Sidebar 导航 + Host 状态渲染测试（renderToStaticMarkup）。 */

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import Sidebar from './Sidebar'

describe('Sidebar (App Shell)', () => {
  it('渲染全部导航项', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    for (const label of [
      '工作区',
      '执行历史',
      '自动化',
      '审批',
      '长期记忆',
      '交付物',
      '设置',
    ]) {
      expect(html).toContain(label)
    }
    expect(html).toContain('Peregrine')
  })

  it('当前页有 active 状态', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="runs" onNavigate={() => {}} connected />,
    )
    expect(html).toContain('nav-item active')
  })

  it('connected 显示 Host 就绪', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    expect(html).toContain('Host 就绪')
    expect(html).toContain('status-dot--ready')
    expect(html).not.toContain('Host 离线')
  })

  it('断开连接显示 Host 离线', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected={false} />,
    )
    expect(html).toContain('Host 离线')
    expect(html).toContain('status-dot--offline')
  })

  it('图标导航提供 title 与无障碍名称，不在窄栏展示版本噪声', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    expect(html).toContain('title="工作区"')
    expect(html).toContain('aria-label="工作区"')
    expect(html).not.toContain('v0.1.0')
  })

  it('提供 badges 时在对应导航项渲染徽标', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        current="chat"
        onNavigate={() => {}}
        connected
        badges={{ runs: 2, approvals: 3 }}
      />,
    )
    expect(html).toContain('nav-badge')
    expect(html).toContain('>2</span>')
    expect(html).toContain('>3</span>')
  })

  it('badges 为 0 或缺失时不渲染徽标', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        current="chat"
        onNavigate={() => {}}
        connected
        badges={{ runs: 0, approvals: undefined }}
      />,
    )
    expect(html).not.toContain('nav-badge')
  })

  it('dots 为 true 时在对应导航项渲染状态点', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected dots={{ chat: true }} />,
    )
    expect(html).toContain('nav-badge--dot')
  })

  it('无 dots 时不渲染状态点', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    expect(html).not.toContain('nav-badge--dot')
  })

  // 展开/收起是 CSS 驱动的：默认收起时标签仍在 DOM 里，由 `.sidebar.is-expanded`
  // 决定是否显示。这里只固定「CSS 能拿到什么」的契约，
  // 实际的展开动画与点击行为在浏览器里验证。
  it('默认收起：品牌行是带 aria-expanded 的开关，字标不再是裸文本', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    expect(html).toContain('class="sidebar "')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('sidebar-brand__mark')
    expect(html).toContain('sidebar-brand__word')
    expect(html).toContain('展开导航栏')
  })

  it('每个导航项都渲染标签节点，供展开态显示', () => {
    const html = renderToStaticMarkup(
      <Sidebar current="chat" onNavigate={() => {}} connected />,
    )
    const labels = html.match(/nav-item__label/g) ?? []
    expect(labels).toHaveLength(7)
  })
})
