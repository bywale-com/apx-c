import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
type Msg = { id: string; sessionId: string; sender: 'user' | 'agent'; text: string; ts: string }

export default function SearchPanel({ sessionId }: { sessionId?: string }) {
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
        backgroundColor: '#282c34', color: '#f8f8f2', padding: 12, borderRadius: 6,
        overflowX: 'auto', fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 14,
      }} {...props} />
    ),
    code: ({ inline, children, ...rest }: any) => inline ? (
      <code style={{
        backgroundColor: '#3a3f4b', color: '#0ea732ff', padding: '2px 6px', borderRadius: 4,
        fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 14,
      }} {...rest}>{children}</code>
    ) : (
      <code style={{
        display: 'block', backgroundColor: '#2c313c', color: '#f8f8f2',
        padding: 12, borderRadius: 6, overflowX: 'auto',
        fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace", fontSize: 14,
      }} {...rest}>{children}</code>
    ),
  }

  return (
  <div
    style={{
      width: expanded ? 280 : 40,
      background: 'rgba(255,255,255,0.03)',
      color: '#e0e0e0',
      height: '100vh',
      borderLeft: '1px solid rgba(255,158,74,0.2)',
      transition: 'width 0.3s ease',
      position: 'fixed',
      top: 0,
      right: 0,
      padding: expanded ? 12 : 8,
      boxSizing: 'border-box',
      overflowY: 'auto',
      zIndex: 999,
      backdropFilter: 'blur(20px)',
      boxShadow: '0 0 30px rgba(255,158,74,0.1)',
    }}
  >
    <button
      onClick={() => { setExpanded(!expanded); if (expanded) setSelected(null) }}
      style={{ width: 24, height: 24, marginBottom: 12, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18 }}
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
              flex: 1, padding: '6px 10px', border: '1px solid #444', borderRadius: 4,
              background: '#2a2a2a', color: '#fff', fontSize: 14,
            }}
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
            title="Scope"
            style={{ background: '#2a2a2a', color: '#e0e0e0', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
          >
            <option value="session">This session</option>
            <option value="all">All sessions</option>
          </select>
        </div>
        {loading ? (
          <div style={{ color: '#888' }}>Loading…</div>
        ) : results.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((item) => (
              <React.Fragment key={item.id}>
                <li
                  style={{
                    padding: '8px 10px', borderRadius: 4, marginBottom: 6, cursor: 'pointer',
                    backgroundColor: selected?.id === item.id ? '#333' : '#2a2a2a',
                    transition: 'background-color 0.2s', color: '#e0e0e0',
                  }}
                  onClick={() => setSelected(item)}
                >
                  <div style={{ fontSize: 12, color: '#9aa' }}>
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
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: 4,
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                      maxHeight: 240,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      position: 'absolute',
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
          <div style={{ fontStyle: 'italic', color: '#666' }}>No results</div>
        )}
      </>
    )}
  </div>
)

}