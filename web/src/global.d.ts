/// <reference types="vite/client" />

interface PeregrineWebApi {
  platform: string
  versions: {
    web: string
    node: string
    chrome: string
  }
}

interface Window {
  peregrine?: PeregrineWebApi
}
