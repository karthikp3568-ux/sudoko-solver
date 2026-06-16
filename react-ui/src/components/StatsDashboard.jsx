import React, { useMemo } from 'react';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

// Helper to format time: seconds -> MM:SS
function formatTime(s) {
  if (!s && s !== 0) return '--:--';
  const n = Math.max(0, Math.floor(s));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

export default function StatsDashboard({ profile, onSignInClick }) {
  const isAuth = profile?.isAuthenticated;
  const history = useMemo(() => profile?.history || [], [profile]);

  // Seeding dummy data for the blurred lock overlay visual representation
  const displayHistory = useMemo(() => {
    if (isAuth) return history;
    // Mock history for visual showcase on lock screen
    return [
      { date: '2026-06-10', mode: 'solo', difficulty: 'medium', won: true, time: 240, mistakes: 2, coinsEarned: 120 },
      { date: '2026-06-11', mode: 'race', difficulty: 'hard', won: false, time: 320, mistakes: 4, coinsEarned: 25 },
      { date: '2026-06-12', mode: 'campaign', level: 1, difficulty: 'easy', won: true, time: 180, mistakes: 1, coinsEarned: 150 },
      { date: '2026-06-13', mode: 'solo', difficulty: 'hard', won: true, time: 290, mistakes: 3, coinsEarned: 120 },
      { date: '2026-06-14', mode: 'race', difficulty: 'medium', won: true, time: 210, mistakes: 1, coinsEarned: 230 },
      { date: '2026-06-15', mode: 'campaign', level: 2, difficulty: 'medium', won: true, time: 195, mistakes: 0, coinsEarned: 150 },
      { date: '2026-06-16', mode: 'race', difficulty: 'hard', won: true, time: 250, mistakes: 2, coinsEarned: 310 },
    ];
  }, [isAuth, history]);

  // KPI Calculations
  const stats = useMemo(() => {
    const data = displayHistory;
    const total = data.length;
    const wins = data.filter(h => h.won).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    
    // Streaks & Best Time
    let currentStreak = isAuth ? (profile.streak || 0) : 3;
    let coins = isAuth ? (profile.coins || 0) : 950;
    
    const soloGames = data.filter(h => h.mode === 'solo');
    const soloWins = soloGames.filter(h => h.won).length;
    const soloBest = soloGames.filter(h => h.won).reduce((min, curr) => (curr.time < min ? curr.time : min), Infinity);
    
    const raceGames = data.filter(h => h.mode === 'race');
    const raceWins = raceGames.filter(h => h.won).length;
    
    const campaignGames = data.filter(h => h.mode === 'campaign');
    const campaignWins = campaignGames.filter(h => h.won).length;
    
    return {
      total,
      wins,
      losses: total - wins,
      winRate,
      coins,
      streak: currentStreak,
      solo: { played: soloGames.length, won: soloWins, best: soloBest === Infinity ? null : soloBest },
      race: { played: raceGames.length, won: raceWins },
      campaign: { played: campaignGames.length, won: campaignWins },
    };
  }, [displayHistory, isAuth, profile]);

  // Chart Data 1: Win / Loss Breakdown by Mode (Doughnut)
  const doughnutData = useMemo(() => {
    return {
      labels: ['Solo Wins', 'AI Race Wins', 'Campaign Wins', 'Losses'],
      datasets: [
        {
          data: [stats.solo.won, stats.race.won, stats.campaign.won, stats.losses],
          backgroundColor: [
            'rgba(0, 229, 255, 0.75)',  // Cyan
            'rgba(255, 0, 127, 0.75)',  // Magenta/Pink
            'rgba(188, 0, 255, 0.75)',  // Violet
            'rgba(255, 255, 255, 0.15)', // Glass Muted
          ],
          borderColor: [
            '#00e5ff',
            '#ff007f',
            '#bc00ff',
            'rgba(255, 255, 255, 0.3)',
          ],
          borderWidth: 1.5,
          hoverOffset: 6,
        },
      ],
    };
  }, [stats]);

  // Chart Data 2: Solve Time Trends - Last 10 Wins (Line Chart)
  const lineData = useMemo(() => {
    const successfulMatches = displayHistory.filter(h => h.won).slice(-10);
    const labels = successfulMatches.map((_, idx) => `Match ${idx + 1}`);
    const times = successfulMatches.map(h => h.time);

    return {
      labels: labels.length ? labels : ['No Matches'],
      datasets: [
        {
          label: 'Solve Time (Seconds)',
          data: times.length ? times : [0],
          fill: true,
          backgroundColor: 'rgba(0, 229, 255, 0.12)',
          borderColor: '#00e5ff',
          borderWidth: 3,
          pointBackgroundColor: '#ff007f',
          pointBorderColor: '#fff',
          pointHoverRadius: 8,
          tension: 0.35,
        },
      ],
    };
  }, [displayHistory]);

  // Chart Data 3: Mistake Rates by Difficulty (Bar Chart)
  const barData = useMemo(() => {
    const difficulties = ['easy', 'medium', 'hard', 'expert', 'insane'];
    const labelMapping = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', insane: 'Insane' };
    
    const avgMistakes = difficulties.map(diff => {
      const matches = displayHistory.filter(h => h.difficulty === diff || (diff === 'easy' && h.difficulty === 'beginner'));
      if (!matches.length) return 0;
      const totalMistakes = matches.reduce((sum, h) => sum + (h.mistakes || 0), 0);
      return parseFloat((totalMistakes / matches.length).toFixed(1));
    });

    return {
      labels: difficulties.map(d => labelMapping[d]),
      datasets: [
        {
          label: 'Average Errors per Game',
          data: avgMistakes,
          backgroundColor: 'rgba(255, 0, 127, 0.6)',
          borderColor: '#ff007f',
          borderWidth: 1,
          hoverBackgroundColor: 'rgba(255, 0, 127, 0.85)',
        },
      ],
    };
  }, [displayHistory]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0',
          font: { family: 'Hanken Grotesk, sans-serif', size: 12 },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: '#aaa', font: { family: 'Hanken Grotesk' } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: '#aaa', font: { family: 'Hanken Grotesk' } },
      },
    },
  };

  return (
    <div className="stats-dashboard-shell">
      {/* Locked overlay for guests */}
      {!isAuth && (
        <div className="stats-lock-overlay">
          <div className="stats-lock-card glass-panel animate-up">
            <span className="stats-lock-icon">🔒</span>
            <h2>Advanced Stats Dashboard</h2>
            <p>
              Sign in to your free account to unlock your personal Sudoku analytics board. 
              Track solve times, error frequencies, win rates against various AI levels, and progressive campaign levels.
            </p>
            <button className="btn-primary" onClick={onSignInClick}>
              Sign In / Sign Up
            </button>
          </div>
        </div>
      )}

      <div className={`stats-dashboard-content ${!isAuth ? 'stats-dashboard-content--blurred' : ''}`}>
        
        {/* KPI Grid */}
        <div className="stats-kpi-grid">
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">🎮</span>
            <div>
              <span className="kpi-label">Games Played</span>
              <strong className="kpi-val">{stats.total}</strong>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">🏆</span>
            <div>
              <span className="kpi-label">Total Wins</span>
              <strong className="kpi-val" style={{ color: 'var(--success)' }}>{stats.wins}</strong>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">📊</span>
            <div>
              <span className="kpi-label">Win Percentage</span>
              <strong className="kpi-val" style={{ color: 'var(--accent)' }}>{stats.winRate}%</strong>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">🔥</span>
            <div>
              <span className="kpi-label">Streak Record</span>
              <strong className="kpi-val" style={{ color: '#ff7b00' }}>{stats.streak}</strong>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">💰</span>
            <div>
              <span className="kpi-label">Total Coins</span>
              <strong className="kpi-val" style={{ color: 'var(--warning)' }}>{stats.coins}</strong>
            </div>
          </div>
          <div className="kpi-card glass-panel">
            <span className="kpi-icon">⚡</span>
            <div>
              <span className="kpi-label">Best Solo Time</span>
              <strong className="kpi-val">{stats.solo.best ? formatTime(stats.solo.best) : '--:--'}</strong>
            </div>
          </div>
        </div>

        {/* Detailed game modes sub-grid */}
        <div className="stats-breakdown-row">
          <div className="mode-stat-box glass-panel">
            <h4>Solo Mode</h4>
            <div className="mode-stat-cols">
              <div><span>Played</span><strong>{stats.solo.played}</strong></div>
              <div><span>Won</span><strong>{stats.solo.won}</strong></div>
              <div><span>Win Rate</span><strong>{stats.solo.played ? Math.round((stats.solo.won/stats.solo.played)*100) : 0}%</strong></div>
            </div>
          </div>
          <div className="mode-stat-box glass-panel">
            <h4>AI Race Mode</h4>
            <div className="mode-stat-cols">
              <div><span>Played</span><strong>{stats.race.played}</strong></div>
              <div><span>Won</span><strong>{stats.race.won}</strong></div>
              <div><span>Win Rate</span><strong>{stats.race.played ? Math.round((stats.race.won/stats.race.played)*100) : 0}%</strong></div>
            </div>
          </div>
          <div className="mode-stat-box glass-panel">
            <h4>Campaign Mode</h4>
            <div className="mode-stat-cols">
              <div><span>Played</span><strong>{stats.campaign.played}</strong></div>
              <div><span>Won</span><strong>{stats.campaign.won}</strong></div>
              <div><span>Level Progress</span><strong>Lvl {profile?.campaignLevel || 1}</strong></div>
            </div>
          </div>
        </div>

        {/* Graphs Section */}
        <div className="stats-charts-row">
          {/* Win Loss Doughnut */}
          <div className="chart-container-wrapper glass-panel">
            <h3>Win/Loss Breakdown</h3>
            <div className="chart-box">
              <Doughnut data={doughnutData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#e0e0e0', font: { family: 'Hanken Grotesk', size: 11 } }
                  }
                }
              }} />
            </div>
          </div>

          {/* Solve Time line chart */}
          <div className="chart-container-wrapper glass-panel">
            <h3>Solve Speed (Last 10 Wins)</h3>
            <div className="chart-box">
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>

          {/* Average Mistakes Bar Chart */}
          <div className="chart-container-wrapper glass-panel">
            <h3>Error Rates by Difficulty</h3>
            <div className="chart-box">
              <Bar data={barData} options={chartOptions} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
