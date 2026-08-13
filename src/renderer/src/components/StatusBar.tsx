import { useEffect, useState } from 'react'
import type { RuntimeStatus } from '../lib/types.js'

interface Props {
  status: RuntimeStatus
  model: string
}

export function StatusBar({ status, model }: Props) {
  const [tokenCount, setTokenCount] = useState(0)
  const [version, setVersion] = useState('v0.1.0-rc.5')

  useEffect(() => {
    window.dsDesktop.app.getVersion().then(v => setVersion(v)).catch(() => {})
  }, [])

  const dotClass = status.connected
    ? (status.error ? 'dot running' : 'dot connected')
    : 'dot disconnected'

  return (
    <footer className="statusbar">
      <div className="status-item">
        <span className={['status-dot', dotClass].join(' ')} />
        <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="token-bar">
        <span>{model}</span>
        <span>·</span>
        <span>{tokenCount} tokens</span>
        <span>·</span>
        <span>{version}</span>
      </div>
      <div className="status-item">
        <span>{status.provider}</span>
      </div>
    </footer>
  )
}