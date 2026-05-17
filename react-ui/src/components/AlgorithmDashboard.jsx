import React, {useState} from 'react'
import {Bar} from 'react-chartjs-2'

export default function AlgorithmDashboard(){
  const [data, setData] = useState(null)

  async function runComparison(puzzle){
    const algs = ['backtracking','backtracking_mrv_fc','ac3','heuristic','dancing_links']
    const results = {}
    for(const alg of algs){
      const res = await fetch('http://localhost:5000/api/solve', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({puzzle:puzzle, algorithm: alg === 'backtracking_mrv_fc' ? 'backtracking' : alg, options: {mrv: alg.includes('mrv'), forward_check: alg.includes('fc')}})
      })
      const j = await res.json()
      results[alg] = j.metrics || {time_sec: null, recursion_calls: null}
    }
    setData(results)
  }

  const chartData = data ? {
    labels: Object.keys(data),
    datasets: [{
      label: 'Time (sec)',
      data: Object.values(data).map(d => d.time_sec || 0),
      backgroundColor: 'rgba(75,192,192,0.6)'
    }]
  } : null

  return (
    <div style={{padding:20}}>
      <h3>Algorithm Comparison Dashboard</h3>
      <button onClick={() => runComparison(Array(81).fill(0))}>Run on empty puzzle</button>
      {chartData && <Bar data={chartData} />}
    </div>
  )
}
