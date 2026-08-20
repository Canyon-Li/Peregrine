/// <reference types="vite/client" />

interface PeregrineWebApi {
  platform: string
  versions: {
    web: string
    node: string
    chrome: string
  }
  openExternal: (url: string) => Promise<boolean>
  notify: (notification: {
    title: string
    body: string
    kind: 'approval' | 'run' | 'artifact'
  }) => void
}

interface Window {
  peregrine?: PeregrineWebApi
}
