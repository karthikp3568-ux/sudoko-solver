import React, { useState, useMemo } from 'react';

// Get comprehensive details for a level L (1 to 50)
export function getCampaignLevelDetails(L) {
  const isBoss = L % 10 === 0;
  let difficulty = 'beginner';
  let clues = 50 - L;
  let description = 'Evolving puzzle difficulty.';
  let opponent = null;
  let timeLimit = null; // in seconds
  let reward = 150;

  if (L <= 10) {
    difficulty = 'easy';
    clues = 50 - L; // L1: 49 clues, L10: 40 clues
    if (L === 10) {
      opponent = 'rookie';
      description = 'ROOKIE RACE BOSS: Defeat Rookie AI in a direct grid race!';
      reward = 500;
    } else {
      description = 'Beginner drills. Focus on scanning the board.';
    }
  } else if (L <= 20) {
    difficulty = 'medium';
    clues = 40 - Math.floor((L - 10) / 2); // L11: 39 clues, L20: 35 clues
    if (L === 20) {
      opponent = 'casual';
      description = 'CASUAL RACE BOSS: Out-solve the Casual AI solver on a medium grid!';
      reward = 500;
    } else {
      description = 'Standard deductions and medium strategies needed.';
    }
  } else if (L <= 30) {
    difficulty = 'hard';
    clues = 35 - Math.floor((L - 20) / 2); // L21: 34 clues, L30: 30 clues
    if (L === 30) {
      timeLimit = 300; // 5 minutes
      description = 'SPEED RUN BOSS: Solve this hard grid before the 5-minute timer expires!';
      reward = 500;
    } else {
      description = 'Advanced techniques like naked pairs are crucial here.';
    }
  } else if (L <= 40) {
    difficulty = 'expert';
    clues = 30 - Math.floor((L - 30) / 2); // L31: 29 clues, L40: 25 clues
    if (L === 40) {
      opponent = 'tactician';
      description = 'TACTICIAN RACE BOSS: Beat the constraint-satisfaction AC-3 solver!';
      reward = 500;
    } else {
      description = 'Expert grid. Demands chains and fish techniques.';
    }
  } else {
    difficulty = 'insane';
    clues = 25 - Math.floor((L - 40) / 2); // L41: 24 clues, L50: 20 clues
    if (clues < 17) clues = 17; // Clamp to mathematical limit
    if (L === 50) {
      opponent = 'legend';
      timeLimit = 600; // 10 minutes
      clues = 17; // Mathematical absolute minimum
      description = 'THE ULTIMATE GRID: Solve a 17-clue grid under 10 minutes while racing the Legend AI!';
      reward = 500;
    } else {
      description = 'Extreme constraints. Algorithms start to sweat on these.';
    }
  }

  return {
    level: L,
    difficulty,
    clues,
    isBoss,
    opponent,
    timeLimit,
    description,
    reward,
  };
}

export default function CampaignMap({ profile, onStartLevel, onBackToDashboard }) {
  const currentCampaignLevel = profile?.campaignLevel || 1;
  const [selectedLevelNum, setSelectedLevelNum] = useState(currentCampaignLevel);

  const selectedLevel = useMemo(() => {
    return getCampaignLevelDetails(selectedLevelNum);
  }, [selectedLevelNum]);

  const levels = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 50; i++) {
      list.push(getCampaignLevelDetails(i));
    }
    return list;
  }, []);

  return (
    <div className="campaign-map-container animate-up">
      <div className="campaign-header">
        <button className="btn-back" onClick={onBackToDashboard}>
          ← Back to Dashboard
        </button>
        <div className="campaign-title-row">
          <div>
            <span className="brand-tag">Campaign Journey</span>
            <h2>Progression Levels</h2>
          </div>
          <div className="campaign-status-badge glass-panel">
            <span>Highest Level Unlocked</span>
            <strong>Level {currentCampaignLevel} / 50</strong>
          </div>
        </div>
      </div>

      <div className="campaign-content-layout">
        {/* Level Map Grid */}
        <section className="campaign-grid-section glass-panel">
          <div className="campaign-grid">
            {levels.map((lvl) => {
              const num = lvl.level;
              const isCompleted = num < currentCampaignLevel;
              const isActive = num === currentCampaignLevel;
              const isLocked = num > currentCampaignLevel;
              const isBoss = lvl.isBoss;
              const isSelected = num === selectedLevelNum;

              let nodeClass = 'campaign-node';
              if (isCompleted) nodeClass += ' campaign-node--completed';
              if (isActive) nodeClass += ' campaign-node--active';
              if (isLocked) nodeClass += ' campaign-node--locked';
              if (isBoss) nodeClass += ' campaign-node--boss';
              if (isSelected) nodeClass += ' campaign-node--selected';

              return (
                <button
                  key={num}
                  className={nodeClass}
                  disabled={isLocked}
                  onClick={() => setSelectedLevelNum(num)}
                  title={`Level ${num} ${isBoss ? '(Boss)' : ''}`}
                >
                  <span className="node-num">{num}</span>
                  {isBoss && <span className="node-boss-badge">💀</span>}
                  {isCompleted && <span className="node-check-badge">✓</span>}
                  {isLocked && <span className="node-lock-badge">🔒</span>}
                </button>
              );
            })}
          </div>
          <div className="campaign-key">
            <span><span className="key-dot key-dot--completed"></span> Completed</span>
            <span><span className="key-dot key-dot--active"></span> Active Target</span>
            <span><span className="key-dot key-dot--locked">🔒</span> Locked</span>
            <span><span className="key-dot key-dot--boss">💀</span> Boss Level</span>
          </div>
        </section>

        {/* Mission Briefing Sidebar */}
        <aside className="campaign-briefing glass-panel">
          <div className="briefing-header">
            <span className={`briefing-tag ${selectedLevel.isBoss ? 'briefing-tag--boss' : ''}`}>
              {selectedLevel.isBoss ? '🔥 BOSS MISSION' : 'STAGE MISSION'}
            </span>
            <h3>Level {selectedLevel.level}</h3>
            <span className="briefing-difficulty" data-diff={selectedLevel.difficulty}>
              Difficulty: {selectedLevel.difficulty.toUpperCase()}
            </span>
          </div>

          <div className="briefing-details">
            <div className="briefing-stat-row">
              <span>Clues Provided</span>
              <strong>🧩 {selectedLevel.clues} cells</strong>
            </div>

            {selectedLevel.opponent && (
              <div className="briefing-stat-row">
                <span>AI Rival</span>
                <strong style={{ color: 'var(--accent2, var(--accent))' }}>
                  🤖 {selectedLevel.opponent.toUpperCase()} AI
                </strong>
              </div>
            )}

            {selectedLevel.timeLimit && (
              <div className="briefing-stat-row">
                <span>Time Limit</span>
                <strong style={{ color: 'var(--danger)' }}>
                  ⏳ {selectedLevel.timeLimit / 60} min ({selectedLevel.timeLimit}s)
                </strong>
              </div>
            )}

            <div className="briefing-stat-row">
              <span>Clear Reward</span>
              <strong style={{ color: 'var(--warning)' }}>💰 +{selectedLevel.reward} Coins</strong>
            </div>

            <div className="briefing-desc-box">
              <h4>Objective & Notes</h4>
              <p>{selectedLevel.description}</p>
            </div>
          </div>

          <button
            className={`btn-primary briefing-launch-btn ${selectedLevel.isBoss ? 'btn-primary--boss' : ''}`}
            onClick={() => onStartLevel(selectedLevel)}
          >
            {selectedLevel.isBoss ? '⚡ LAUNCH BOSS FIGHT' : '▶ START CHALLENGE'}
          </button>
        </aside>
      </div>
    </div>
  );
}
