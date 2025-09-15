import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
type Msg = { id: string; sessionId: string; sender: 'user' | 'agent'; text: string; ts: string }

// Warm, light grayscale palette to match app theme
const ui = {
  bgPanel: 'rgba(200,203,194,0.45)',
  border: 'rgba(154,156,148,0.45)',
  borderSoft: 'rgba(154,156,148,0.28)',
  divider: 'rgba(120,122,116,0.55)',
  inkHigh: '#353535',
  inkMid: '#5c5e58',
  inkLow: '#8d8f88',
  white: '#ffffff',
}

export default function SearchPanel({ sessionId, onWidthChange }: { sessionId?: string; onWidthChange?: (width: number) => void }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [results, setResults] = useState<Msg[]>([])
  const [selected, setSelected] = useState<Msg | null>(null)
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<'all' | 'session'>('session')

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      alert('Clipboard API not supported')
      return
    }
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Failed to copy: ' + (err instanceof Error ? err.message : 'unknown error'))
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        backgroundColor: copied ? '#0ea732' : '#444',
        border: 'none',
        borderRadius: 4,
        color: 'white',
        cursor: 'pointer',
        fontSize: 12,
        padding: '4px 8px',
        marginLeft: 8,
        userSelect: 'none',
        transition: 'background-color 0.3s ease',
      }}
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
  useEffect(() => {
    // Notify parent of initial width
    onWidthChange && onWidthChange(expanded ? 280 : 40)
  // eslint-disable-next-line
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { fetchResults() }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [query, scope, sessionId])

  async function fetchResults() {
    setLoading(true)
    try {
      let url = '/api/search-chat'
      const params = new URLSearchParams()
      if (query.trim()) {
        params.append('query', query)
      }
      if (scope === 'session' && sessionId) {
        params.append('sessionId', sessionId)
      }
      const r = await fetch(`${url}?${params.toString()}`)
      const j = await r.json()
      if (r.ok) {
        setResults(j.results || [])
        if (j.results.length && !selected) {
          setSelected(j.results[j.results.length - 1])
        }
      } else {
        console.error('Error fetching results:', j.error)
        setResults([])
      }
    } catch (e) {
      console.error('Error fetching results:', e)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const markdownComponents = {
    pre: (props: any) => (
      <pre style={{
        backgroundColor: 'rgba(0,0,0,0.85)', color: ui.white, padding: 12, borderRadius: 6,
        overflowX: 'auto', fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 13,
        border: `1px solid ${ui.border}`,
      }} {...props} />
    ),
    code: ({ inline, children, ...rest }: any) => inline ? (
      <code style={{
        backgroundColor: 'rgba(0,0,0,0.75)', color: ui.white, padding: '2px 6px', borderRadius: 3,
        fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 13,
        border: `1px solid ${ui.border}`,
      }} {...rest}>{children}</code>
    ) : (
      <code style={{
        display: 'block', backgroundColor: 'rgba(0,0,0,0.85)', color: ui.white,
        padding: 12, borderRadius: 6, overflowX: 'auto',
        fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 13,
        border: `1px solid ${ui.border}`,
      }} {...rest}>{children}</code>
    ),
  }

  return (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: ui.bgPanel,
      color: ui.inkHigh,
      borderLeft: `1px solid ${ui.border}`,
      transition: 'all 0.3s ease',
      padding: expanded ? 12 : 8,
      boxSizing: 'border-box',
      overflowY: 'auto',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}
  >
    <button
      onClick={() => {
        const next = !expanded
        setExpanded(next)
        if (!next) setSelected(null)
        onWidthChange && onWidthChange(next ? 280 : 40)
      }}
      style={{ width: 24, height: 24, marginBottom: 12, background: 'none', border: 'none', color: ui.inkLow, cursor: 'pointer', fontSize: 18 }}
      title={expanded ? 'Collapse' : 'Expand'}
    >
      {expanded ? '→' : '←'}
    </button>
    {expanded && (
      <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            style={{
              flex: 1, padding: '6px 10px', border: `1px solid ${ui.border}`, borderRadius: 4,
              background: 'rgba(255,255,255,0.6)', color: ui.inkHigh, fontSize: 14,
            }}
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            title="Scope"
            style={{ background: 'rgba(255,255,255,0.6)', color: ui.inkHigh, border: `1px solid ${ui.border}`, borderRadius: 4, padding: '4px 6px' }}
          >
            <option value="session">This session</option>
            <option value="all">All sessions</option>
          </select>
        </div>
        {loading ? (
          <div style={{ color: ui.inkLow }}>Loading…</div>
        ) : results.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((item) => (
              <React.Fragment key={item.id}>
                <li
                  style={{
                    padding: '8px 10px', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                    backgroundColor: selected?.id === item.id ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)',
                    border: selected?.id === item.id ? `1px solid ${ui.divider}` : `1px solid ${ui.border}`,
                    transition: 'all 0.2s', color: ui.inkHigh,
                  }}
                  onClick={() => setSelected(item)}
                >
                  <div style={{ fontSize: 12, color: ui.inkLow }}>
                    {new Date(item.ts).toLocaleString()} • {item.sender}
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.text ? item.text.replace(/\s+/g, ' ').slice(0, 120) : ''}
                  </div>
                </li>
                {selected?.id === item.id && (
                  <div
                    style={{
                      margin: '4px 0 12px 20px',
                      padding: 10,
                      background: 'rgba(255,255,255,0.65)',
                      border: `1px solid ${ui.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                      maxHeight: 240,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                      {selected.text}
                    </ReactMarkdown>
                    <div style={{ alignSelf: 'flex-end' }}>
                      <CopyButton textToCopy={selected.text} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </ul>
        ) : (
          <div style={{ fontStyle: 'italic', color: ui.inkLow }}>No results</div>
        )}
      </>
    )}
  </div>
)

}