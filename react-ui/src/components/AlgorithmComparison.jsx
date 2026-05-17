import React, { useState, useRef } from 'react'
import './AlgorithmComparison.css'

const SAMPLE_PUZZLE = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
]

const ALGORITHMS = [
  { id: 'backtracking', name: '🔄 Backtracking', desc: 'With MRV + Forward Checking' },
  { id: 'ac3', name: '⚡ AC-3', desc: 'Constraint Propagation' },
  { id: 'heuristic', name: '🧩 Heuristic', desc: 'Combined MRV + FC' },
  { id: 'dancing_links', name: '💃 Dancing Links', desc: 'Algorithm X' }
]

export default function AlgorithmComparison() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const logEndRef = useRef(null)

  const runComparison = async () => {
    setLoading(true)
    setResults({})
    setLogs(['🚀 Starting algorithm comparison...'])
    
    const newResults = {}
    
    for (const alg of ALGORITHMS) {
      try {
        setLogs(prev => [...prev, `⏳ Testing ${alg.name}...`])
        
        const resp = await fetch('http://127.0.0.1:5000/api/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puzzle: SAMPLE_PUZZLE,
            algorithm: alg.id,
            options: {}
          })
        })
        
        if (!resp.ok) {
          newResults[alg.id] = { error: `HTTP ${resp.status}` }
          setLogs(prev => [...prev, `❌ ${alg.name}: HTTP ${resp.status}`])
          continue
        }
        
        const data = await resp.json()
        newResults[alg.id] = data.metrics
        setLogs(prev => [...prev, 
          `✅ ${alg.name}: ${data.metrics.time_sec.toFixed(4)}s (${data.metrics.recursion_calls} calls)`
        ])
        setResults({...newResults})
      } catch (err) {
        newResults[alg.id] = { error: err.message }
        setLogs(prev => [...prev, `❌ ${alg.name}: ${err.message}`])
      }
    }
    
    setLoading(false)
    setLogs(prev => [...prev, '✅ Comparison complete!'])
  }

  const getWinner = (metric) => {
    const valid = Object.entries(results)
      .filter(([_, m]) => m && !m.error && m[metric] !== undefined)
      .sort((a, b) => a[1][metric] - b[1][metric])
    return valid[0]?.[0]
  }

  return (
    <div className="comparison-dashboard">
      <div className="comparison-header">
        <h2>⚡ Algorithm Performance Comparison</h2>
        <button 
          onClick={runComparison} 
          disabled={loading}
          className="compare-btn"
        >
          {loading ? '⏳ Comparing...' : '🚀 Run Comparison'}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Time (s)</th>
                <th>Recursion Calls</th>
                <th>Peak Memory (KB)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ALGORITHMS.map(alg => {
                const metric = results[alg.id]
                const winner_time = getWinner('time_sec')
                const winner_calls = getWinner('recursion_calls')
                return (
                  <tr key={alg.id} className={metric?.error ? 'error-row' : ''}>
                    <td>
                      <div className="alg-name">{alg.name}</div>
                      <div className="alg-desc">{alg.desc}</div>
                    </td>
                    <td className={winner_time === alg.id ? 'highlight' : ''}>
                      {metric?.time_sec ? metric.time_sec.toFixed(4) : metric?.error || '—'}
                    </td>
                    <td className={winner_calls === alg.id ? 'highlight' : ''}>
                      {metric?.recursion_calls || metric?.error || '—'}
                    </td>
                    <td>
                      {metric?.peak_memory_bytes ? (metric.peak_memory_bytes / 1024).toFixed(2) : metric?.error || '—'}
                    </td>
                    <td>
                      {metric?.error ? '❌ ' + metric.error : metric?.success ? '✅ Success' : '❌ Failed'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="log-panel">
        <h3>📝 Comparison Log</h3>
        <div className="log-content">
          {logs.map((log, idx) => (
            <div key={idx} className="log-line">{log}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}
