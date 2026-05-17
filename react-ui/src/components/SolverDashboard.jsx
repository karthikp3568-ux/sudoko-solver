import React, { useState, useRef } from 'react'
import './SolverDashboard.css'

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

export default function SolverDashboard() {
  const [algorithm, setAlgorithm] = useState('backtracking')
  const [metrics, setMetrics] = useState(null)
  const [solution, setSolution] = useState(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const logEndRef = useRef(null)

  const handleSolve = async () => {
    setLoading(true)
    setMetrics(null)
    setSolution(null)
    setLogs(['Starting solve...'])
    
    try {
      const apiUrl = 'http://127.0.0.1:5000/api/solve'
      setLogs(prev => [...prev, `Calling ${apiUrl}...`])
      
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzle: SAMPLE_PUZZLE,
          algorithm,
          options: {
            mrv: algorithm === 'backtracking',
            forward_check: algorithm === 'backtracking'
          }
        })
      })
      
      if (!resp.ok) {
        setLogs(prev => [...prev, `❌ Error: HTTP ${resp.status}`])
        return
      }
      
      const data = await resp.json()
      setMetrics(data.metrics)
      setSolution(data.solution)
      setLogs(prev => [...prev, 
        `✅ Solved! Time: ${data.metrics.time_sec.toFixed(4)}s`,
        `Recursive calls: ${data.metrics.recursion_calls}`,
        `Peak memory: ${(data.metrics.peak_memory_bytes / 1024).toFixed(2)} KB`
      ])
    } catch (err) {
      setLogs(prev => [...prev, `❌ Error: ${err.message}`])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="solver-dashboard">
      <div className="solver-controls">
        <h2>Algorithm Solver</h2>
        <div className="control-group">
          <label>Select Algorithm:</label>
          <select 
            value={algorithm} 
            onChange={(e) => setAlgorithm(e.target.value)}
            disabled={loading}
          >
            <option value="backtracking">🔄 Backtracking (with MRV + FC)</option>
            <option value="ac3">⚡ AC-3 Constraint Propagation</option>
            <option value="heuristic">🧩 Heuristic Solver</option>
            <option value="dancing_links">💃 Dancing Links (Algorithm X)</option>
          </select>
        </div>
        <button 
          onClick={handleSolve} 
          disabled={loading}
          className="solve-btn"
        >
          {loading ? '⏳ Solving...' : '▶️ Solve'}
        </button>
      </div>

      <div className="solver-grid-section">
        <div className="grid-container">
          <h3>Input Puzzle</h3>
          <div className="sudoku-grid">
            {SAMPLE_PUZZLE.map((row, r) => (
              <div key={r} className="grid-row">
                {row.map((val, c) => (
                  <div key={`${r}-${c}`} className="grid-cell">
                    {val || ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {solution && (
          <div className="grid-container">
            <h3>Solution</h3>
            <div className="sudoku-grid">
              {solution.map((row, r) => (
                <div key={r} className="grid-row">
                  {row.map((val, c) => (
                    <div key={`${r}-${c}`} className={`grid-cell ${SAMPLE_PUZZLE[r][c] ? 'given' : 'solved'}`}>
                      {val}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {metrics && (
        <div className="metrics-panel">
          <h3>📊 Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Execution Time</div>
              <div className="metric-value">{metrics.time_sec.toFixed(4)}s</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Recursive Calls</div>
              <div className="metric-value">{metrics.recursion_calls}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Peak Memory</div>
              <div className="metric-value">{(metrics.peak_memory_bytes / 1024).toFixed(2)} KB</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Success</div>
              <div className="metric-value">{metrics.success ? '✅' : '❌'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="log-panel">
        <h3>📝 Execution Log</h3>
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
