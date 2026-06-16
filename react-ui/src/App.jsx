import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Board from './components/Board';
import AuthForm from './components/AuthForm';
import ImageUpload from './components/ImageUpload';
import StatsDashboard from './components/StatsDashboard';
import CampaignMap, { getCampaignLevelDetails } from './components/CampaignMap';
import { createSolverByAlgorithm } from './algorithms/solver_manager';
import {
  countFilledCells,
  defaultPuzzle,
  generatePuzzleGrid,
  isGridComplete,
  solveGrid,
} from './utils/solver';

const STORAGE_KEY = 'sudoku-arena-profile';
const THEME_KEY   = 'sudoku-arena-theme';

const THEMES = [
  { id: 'neon',   label: 'Cyber Neon',  icon: 'N' },
  { id: 'dark',   label: 'Walnut',      icon: 'W' },
  { id: 'galaxy', label: 'Typewriter',  icon: 'T' },
  { id: 'ocean',  label: 'Field Desk',  icon: 'F' },
  { id: 'lava',   label: 'Slate',       icon: 'S' },
  { id: 'paper',  label: 'Classic',     icon: 'C' },
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner',   desc: 'More givens, easy deductions. Perfect for new players.' },
  { id: 'easy',     label: 'Easy',       desc: 'Straightforward logic. Build your speed here.' },
  { id: 'medium',   label: 'Medium',     desc: 'Requires some strategy. The most popular level.' },
  { id: 'hard',     label: 'Hard',       desc: 'Demands advanced techniques like naked pairs.' },
  { id: 'expert',   label: 'Expert',     desc: 'Only for seasoned solvers. X-wings and chains needed.' },
  { id: 'insane',   label: 'Insane',     desc: 'Near-impossible. Even algorithms sweat on this one.' },
];

const AI_AGENTS = {
  rookie:    { name: 'Rookie',       level: 1, algorithm: 'backtracking', delay: 1100, burst: 1, mistakeRate: 0.15, reward: 90,  note: 'Slow and human-like. Good for first races.' },
  casual:    { name: 'Casual',       level: 2, algorithm: 'backtracking', delay: 750,  burst: 1, mistakeRate: 0.08, reward: 130, note: 'Steady pace with a few slips.' },
  tactician: { name: 'Tactician',    level: 3, algorithm: 'ac3',          delay: 500,  burst: 1, mistakeRate: 0.03, reward: 190, note: 'Uses constraints and moves with intent.' },
  master:    { name: 'Master',       level: 4, algorithm: 'ac3',          delay: 300,  burst: 1, mistakeRate: 0.01, reward: 280, note: 'Fast enough to punish hesitation.' },
  legend:    { name: 'Super Expert', level: 5, algorithm: 'dlx',          delay: 150,  burst: 1, mistakeRate: 0,    reward: 420, note: 'Near-perfect exact-cover solving.' },
};

const RULES = [
  { n: '01', title: 'Fill Every Row',    body: 'Each of the 9 horizontal rows must contain all digits 1 through 9, with no repeats.' },
  { n: '02', title: 'Fill Every Column', body: 'Each of the 9 vertical columns must also contain all digits 1 through 9, with no repeats.' },
  { n: '03', title: 'Fill Every Box',    body: 'Each of the nine 3×3 sub-grids must contain all digits 1 through 9, with no repeats.' },
  { n: '04', title: 'One Solution',      body: 'A valid Sudoku puzzle has exactly one correct solution — no guessing needed, only logic.' },
];

const initialProfile = {
  userId: null, username: 'Guest', email: null,
  coins: 0, streak: 0, bestTime: null,
  gamesPlayed: 0, gamesWon: 0, isAuthenticated: false,
  campaignLevel: 1, history: [],
};

// Seed 6 initial history points to populate graph beautifully immediately
function generateSeededHistory() {
  return [
    { date: new Date(Date.now() - 6*86400000).toISOString().split('T')[0], mode: 'solo', difficulty: 'medium', won: true, time: 240, mistakes: 2, coinsEarned: 120 },
    { date: new Date(Date.now() - 5*86400000).toISOString().split('T')[0], mode: 'race', difficulty: 'hard', won: false, time: 320, mistakes: 4, coinsEarned: 25 },
    { date: new Date(Date.now() - 4*86400000).toISOString().split('T')[0], mode: 'campaign', level: 1, difficulty: 'easy', won: true, time: 180, mistakes: 1, coinsEarned: 150 },
    { date: new Date(Date.now() - 3*86400000).toISOString().split('T')[0], mode: 'solo', difficulty: 'hard', won: true, time: 290, mistakes: 3, coinsEarned: 120 },
    { date: new Date(Date.now() - 2*86400000).toISOString().split('T')[0], mode: 'race', difficulty: 'medium', won: true, time: 210, mistakes: 1, coinsEarned: 230 },
    { date: new Date(Date.now() - 1*86400000).toISOString().split('T')[0], mode: 'campaign', level: 2, difficulty: 'medium', won: true, time: 195, mistakes: 0, coinsEarned: 150 },
  ];
}

function cloneGrid(g) { return g.map(r => [...r]); }

function loadProfile() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return s ? { ...initialProfile, ...s } : initialProfile;
  } catch { return initialProfile; }
}

function loadTheme() { return localStorage.getItem(THEME_KEY) || 'neon'; }

function formatTime(s) {
  const n = Math.max(0, Math.floor(s));
  return `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
}

function getWrongPreviewValue(v) {
  const opts = [1,2,3,4,5,6,7,8,9].filter(x => x !== v);
  return opts[Math.floor(Math.random() * opts.length)];
}

function getWrongCells(grid, sol, puz) {
  const w = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (puz[r][c] !== 0) continue;
    if (grid[r][c] !== 0 && grid[r][c] !== sol[r][c]) w.push([r, c]);
  }
  return w;
}

function getCorrectEntryCount(grid, sol, puz) {
  let correct = 0, played = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (puz[r][c] !== 0 || grid[r][c] === 0) continue;
    played++;
    if (grid[r][c] === sol[r][c]) correct++;
  }
  return { correct, played, wrong: played - correct };
}

function lineIsComplete(grid, sol, cells) {
  return cells.every(([r,c]) => grid[r][c] === sol[r][c]);
}

function detectCompletionPulse(prev, next, sol) {
  for (let r = 0; r < 9; r++) {
    const cells = Array.from({length:9}, (_,c) => [r,c]);
    if (!lineIsComplete(prev,sol,cells) && lineIsComplete(next,sol,cells))
      return {type:'row', index:r, id:Date.now()};
  }
  for (let c = 0; c < 9; c++) {
    const cells = Array.from({length:9}, (_,r) => [r,c]);
    if (!lineIsComplete(prev,sol,cells) && lineIsComplete(next,sol,cells))
      return {type:'col', index:c, id:Date.now()};
  }
  for (let box = 0; box < 9; box++) {
    const br = Math.floor(box/3)*3, bc = (box%3)*3;
    const cells = [];
    for (let r=br; r<br+3; r++) for (let c=bc; c<bc+3; c++) cells.push([r,c]);
    if (!lineIsComplete(prev,sol,cells) && lineIsComplete(next,sol,cells))
      return {type:'box', index:box, id:Date.now()};
  }
  return null;
}

/* ── Floating NumPad ── */
function NumPad({ anchorRef, onSelect, onClose }) {
  const padRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const padW = 186, padH = 224;
    let top  = rect.bottom + 10 + window.scrollY;
    let left = rect.left + window.scrollX - padW/2 + rect.width/2;
    if (left + padW > window.innerWidth - 12) left = window.innerWidth - padW - 12;
    if (left < 8) left = 8;
    if (top + padH > window.innerHeight + window.scrollY - 8)
      top = rect.top + window.scrollY - padH - 8;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    const fn = e => {
      if (padRef.current && !padRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose, anchorRef]);

  return (
    <div className="numpad-overlay">
      <div ref={padRef} className="numpad-float" style={{ top: pos.top, left: pos.left }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="numpad-key" onClick={() => { onSelect(n); onClose(); }}>{n}</button>
        ))}
        <button className="numpad-key numpad-key--erase" onClick={() => { onSelect(0); onClose(); }}>✕ Clear</button>
      </div>
    </div>
  );
}

/* ── Theme Picker ── */
function ThemePicker({ current, onChange }) {
  return (
    <div className="theme-picker">
      <span className="theme-label">Theme</span>
      <div className="theme-swatches">
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`theme-swatch theme-swatch--${t.id}${current === t.id ? ' theme-swatch--active' : ''}`}
            title={t.label}
            onClick={() => onChange(t.id)}
            aria-label={`${t.label} theme`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── 3D Rotating Board Wrapper ── */
function Board3D({ children }) {
  const ref = useRef(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const accumulated = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);

  function onMouseDown(e) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }

  function onMouseMove(e) {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    accumulated.current.y += dx * 0.5;
    accumulated.current.x -= dy * 0.5;
    // clamp x tilt
    accumulated.current.x = Math.max(-35, Math.min(35, accumulated.current.x));
    setRot({ x: accumulated.current.x, y: accumulated.current.y });
  }

  function onMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    // spring back
    const spring = () => {
      accumulated.current.x *= 0.88;
      accumulated.current.y *= 0.88;
      setRot({ x: accumulated.current.x, y: accumulated.current.y });
      if (Math.abs(accumulated.current.x) > 0.1 || Math.abs(accumulated.current.y) > 0.1) {
        animRef.current = requestAnimationFrame(spring);
      } else {
        accumulated.current = { x: 0, y: 0 };
        setRot({ x: 0, y: 0 });
      }
    };
    animRef.current = requestAnimationFrame(spring);
  }

  // Touch support
  function onTouchStart(e) {
    dragging.current = true;
    last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }
  function onTouchMove(e) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - last.current.x;
    const dy = e.touches[0].clientY - last.current.y;
    last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    accumulated.current.y += dx * 0.5;
    accumulated.current.x -= dy * 0.5;
    accumulated.current.x = Math.max(-35, Math.min(35, accumulated.current.x));
    setRot({ x: accumulated.current.x, y: accumulated.current.y });
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="board3d-scene" style={{ perspective: '900px' }}>
      <div
        ref={ref}
        className="board3d-body"
        style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN APP
════════════════════════════════════════ */
export default function App() {
  const [page, setPage]             = useState('home');
  const [mode, setMode]             = useState('solo');
  const [theme, setTheme]           = useState(loadTheme);
  const [profile, setProfile]       = useState(loadProfile);
  const [difficulty, setDifficulty] = useState('medium');
  const [agentKey, setAgentKey]     = useState('casual');
  const [puzzle, setPuzzle]         = useState(() => defaultPuzzle());
  const [solution, setSolution]     = useState(() => solveGrid(defaultPuzzle()));
  const [playerGrid, setPlayerGrid] = useState(() => defaultPuzzle());
  const [aiGrid, setAiGrid]         = useState(() => defaultPuzzle());
  const [activeCell, setActiveCell] = useState([-1,-1]);
  const [gameState, setGameState]   = useState('ready');
  const [elapsed, setElapsed]       = useState(0);
  const [message, setMessage]       = useState('Pick a difficulty and start playing.');
  const [result, setResult]         = useState(null);
  const [aiMistakes, setAiMistakes] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const [highlight, setHighlight]   = useState({});
  const [revealMistakes, setRevealMistakes] = useState(false);
  const [completionPulse, setCompletionPulse] = useState(null);
  const [showLogin, setShowLogin]   = useState(false);
  const [countdown, setCountdown]   = useState(null);
  const [aiCompletionPulse, setAiCompletionPulse] = useState(null);
  const [selectedNumber, setSelectedNumber]       = useState(null);
  const [showSummaryModal, setShowSummaryModal]   = useState(false);

  // Campaign & Stats states
  const [isCampaignGame, setIsCampaignGame]         = useState(false);
  const [campaignLevelInfo, setCampaignLevelInfo]   = useState(null);
  const [campaignFailed, setCampaignFailed]         = useState(false);
  const [showLevelUpModal, setShowLevelUpModal]     = useState(false);
  const [levelUpData, setLevelUpData]               = useState(null);
  const [statsView, setStatsView]                   = useState(false);

  // Hero board
  const [heroPuzzle] = useState(() => defaultPuzzle());
  const [heroGrid, setHeroGrid]     = useState(() => cloneGrid(defaultPuzzle()));
  const [heroActive, setHeroActive] = useState([-1,-1]);
  const [showNumpad, setShowNumpad] = useState(false);
  const heroBoardRef = useRef(null);

  const aiSolverRef  = useRef(null);
  const playerGridRef = useRef(playerGrid);
  const timerRef     = useRef(null);
  const aiLoopRef    = useRef(null);
  const startTimeRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);

  const agent = AI_AGENTS[agentKey];

  const wrongCells   = useMemo(() => revealMistakes ? getWrongCells(playerGrid, solution, puzzle) : [], [playerGrid, puzzle, revealMistakes, solution]);
  const entryStats   = useMemo(() => getCorrectEntryCount(playerGrid, solution, puzzle), [playerGrid, puzzle, solution]);
  const playerProgress = useMemo(() => {
    const givens = countFilledCells(puzzle);
    const filled = countFilledCells(playerGrid);
    return Math.max(0, Math.min(1, (filled - givens) / (81 - givens || 1)));
  }, [playerGrid, puzzle]);

  const resolvedTheme = theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem(THEME_KEY, resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);
  useEffect(() => { playerGridRef.current = playerGrid; }, [playerGrid]);

  useEffect(() => {
    let vm = document.querySelector('meta[name="viewport"]');
    if (!vm) { vm = document.createElement('meta'); vm.name = 'viewport'; document.head.appendChild(vm); }
    vm.content = 'width=device-width, initial-scale=1.0';
  }, []);

  const clearLoops = useCallback(() => {
    clearInterval(timerRef.current); clearInterval(aiLoopRef.current);
    clearInterval(countdownIntervalRef.current);
    clearTimeout(countdownTimeoutRef.current);
    timerRef.current = aiLoopRef.current = null;
    countdownIntervalRef.current = countdownTimeoutRef.current = null;
  }, []);

  useEffect(() => () => clearLoops(), [clearLoops]);

  useEffect(() => {
    if (!completionPulse) return;
    const t = setTimeout(() => setCompletionPulse(null), 800);
    return () => clearTimeout(t);
  }, [completionPulse]);

  useEffect(() => {
    if (!aiCompletionPulse) return;
    const t = setTimeout(() => setAiCompletionPulse(null), 800);
    return () => clearTimeout(t);
  }, [aiCompletionPulse]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') { setShowNumpad(false); setShowLogin(false); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  function startTimer() {
    startTimeRef.current = performance.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      const nextElapsed = (performance.now() - startTimeRef.current) / 1000;
      if (isCampaignGame && campaignLevelInfo?.timeLimit && nextElapsed >= campaignLevelInfo.timeLimit) {
        setElapsed(campaignLevelInfo.timeLimit);
        clearInterval(timerRef.current);
        finishGame('timeout');
        return;
      }
      setElapsed(nextElapsed);
    }, 250);
  }

  function startAiLoop() {
    aiLoopRef.current = setInterval(() => {
      const cur = aiSolverRef.current;
      if (!cur || cur.isDone) return;

      // Run solver steps until a place, backtrack, solved, or failed step occurs
      let action = null;
      let limit = 200;
      while (!cur.isDone && limit-- > 0) {
        cur.step();
        action = cur.lastAction;
        if (action?.type === 'place' || action?.type === 'backtrack' || action?.type === 'solved' || action?.type === 'failed') {
          break;
        }
      }

      const nextGrid = cur.getGrid();
      if (action?.type === 'place' && agent.mistakeRate > 0 && Math.random() < agent.mistakeRate) {
        const p = cloneGrid(nextGrid);
        p[action.row][action.col] = getWrongPreviewValue(solution[action.row][action.col]);
        setAiGrid(prev => {
          const pulse = detectCompletionPulse(prev, p, solution);
          if (pulse) setAiCompletionPulse(pulse);
          return p;
        });
        setAiMistakes(v => v+1);
        setHighlight({ type:'invalid', cells:[[action.row, action.col]] });
      } else {
        setAiGrid(prev => {
          const pulse = detectCompletionPulse(prev, nextGrid, solution);
          if (pulse) setAiCompletionPulse(pulse);
          return nextGrid;
        });
        if (action?.type === 'place') {
          setHighlight({ type: 'place', cells: [[action.row, action.col]] });
        } else if (action?.type === 'backtrack') {
          setHighlight({ type: 'backtrack', cells: [[action.row, action.col]] });
        } else {
          setHighlight({});
        }
      }
      setAiProgress(cur.getProgress?.() ?? 0);
      if (cur.isDone) finishGame('ai');
    }, agent.delay);
  }

  function preparePuzzle(diff = difficulty, nextMode = mode) {
    clearLoops();
    setIsCampaignGame(false);
    setCampaignLevelInfo(null);
    setCampaignFailed(false);
    setShowLevelUpModal(false);
    // map 'beginner' to 'easy' for puzzle generation
    const genDiff = diff === 'beginner' ? 'easy' : diff;
    const np = generatePuzzleGrid(genDiff);
    const ns = solveGrid(np);
    setPuzzle(np); setSolution(ns);
    setPlayerGrid(cloneGrid(np)); setAiGrid(cloneGrid(np));
    setGameState('ready'); setElapsed(0); setResult(null);
    setAiMistakes(0); setAiProgress(0); setHighlight({});
    setRevealMistakes(false); setCompletionPulse(null);
    setCountdown(null);
    setAiCompletionPulse(null);
    setSelectedNumber(null);
    setShowSummaryModal(false);
    setMode(nextMode); aiSolverRef.current = null;
    setMessage(nextMode === 'race' ? 'Ready to race. Start when ready.' : 'Puzzle ready. Start when ready.');
  }

  function startCampaignLevel(lvlDetails) {
    clearLoops();
    setIsCampaignGame(true);
    setCampaignLevelInfo(lvlDetails);
    setCampaignFailed(false);
    setShowLevelUpModal(false);
    setSelectedNumber(null);
    setPage('play');

    const np = generatePuzzleGrid(lvlDetails.clues);
    const ns = solveGrid(np);
    setPuzzle(np); setSolution(ns);
    setPlayerGrid(cloneGrid(np)); setAiGrid(cloneGrid(np));
    setGameState('ready'); setElapsed(0); setResult(null);
    setAiMistakes(0); setAiProgress(0); setHighlight({});
    setRevealMistakes(false); setCompletionPulse(null);
    setCountdown(null);
    setAiCompletionPulse(null);
    setShowSummaryModal(false);

    if (lvlDetails.opponent) {
      setMode('race');
      setAgentKey(lvlDetails.opponent);
      aiSolverRef.current = null;
      setMessage(`Race Boss Level ${lvlDetails.level}: Solve the grid before ${AI_AGENTS[lvlDetails.opponent].name}!`);
    } else {
      setMode('solo');
      aiSolverRef.current = null;
      if (lvlDetails.timeLimit) {
        setMessage(`Speed Run Level ${lvlDetails.level}: Complete the grid in under ${lvlDetails.timeLimit} seconds!`);
      } else {
        setMessage(`Campaign Stage ${lvlDetails.level}: Solve the grid to clear!`);
      }
    }
  }

  function loadUploadedPuzzle(uploadedGrid) {
    const uploadedSolution = solveGrid(uploadedGrid);
    if (!isGridComplete(uploadedSolution)) {
      setMessage('That photo did not produce a solvable Sudoku. Check the detected digits and try again.');
      return;
    }

    clearLoops();
    setIsCampaignGame(false);
    setCampaignLevelInfo(null);
    setCampaignFailed(false);
    setShowLevelUpModal(false);
    const nextPuzzle = cloneGrid(uploadedGrid);
    setPuzzle(nextPuzzle);
    setSolution(uploadedSolution);
    setPlayerGrid(cloneGrid(nextPuzzle));
    playerGridRef.current = cloneGrid(nextPuzzle);
    setAiGrid(cloneGrid(nextPuzzle));
    setActiveCell([-1, -1]);
    setGameState('ready');
    setElapsed(0);
    setResult(null);
    setAiMistakes(0);
    setAiProgress(0);
    setHighlight({});
    setRevealMistakes(false);
    setCompletionPulse(null);
    setCountdown(null);
    setAiCompletionPulse(null);
    setSelectedNumber(null);
    setShowSummaryModal(false);
    aiSolverRef.current = null;
    setMessage(mode === 'race'
      ? 'Photo puzzle loaded. Start the race when ready.'
      : 'Photo puzzle loaded. Start when ready.');
  }

  function loadUploadedPuzzleFromHome(uploadedGrid) {
    loadUploadedPuzzle(uploadedGrid);
    setMode('solo');
    setMessage('Photo puzzle loaded. Start when ready.');
    setPage('play');
  }

  function gradePlayerGrid() {
    const wrong = getWrongCells(playerGrid, solution, puzzle);
    setRevealMistakes(true);
    if (wrong.length) {
      setMessage(`${wrong.length} incorrect entr${wrong.length === 1 ? 'y' : 'ies'} highlighted.`);
      return;
    }
    if (isGridComplete(playerGrid)) {
      if (gameState === 'running') finishGame('player');
      else setMessage('Perfect grid. Start the game to record a timed result.');
      return;
    }
    setMessage(`Everything entered so far is correct. ${81 - countFilledCells(playerGrid)} cells remain.`);
  }

  function finishGame(winner) {
    clearLoops();
    const finalTime = startTimeRef.current ? (performance.now() - startTimeRef.current) / 1000 : elapsed;
    
    // Check timeout
    const isTimeout = winner === 'timeout';
    const playerWon = winner === 'player' && !isTimeout;
    
    const currentPlayerGrid = playerGridRef.current;
    const perfect = getWrongCells(currentPlayerGrid, solution, puzzle).length === 0;
    
    let coinsEarned = 25; // Default practice fail reward
    if (isCampaignGame) {
      coinsEarned = playerWon ? campaignLevelInfo.reward : 15;
    } else {
      const baseReward = mode === 'race' ? agent.reward : 120;
      const speedBonus = Math.max(0, 180 - Math.floor(finalTime));
      coinsEarned = playerWon ? baseReward + speedBonus + (perfect ? 75 : 0) : 25;
    }

    setGameState('finished');
    setElapsed(isTimeout ? (campaignLevelInfo?.timeLimit || finalTime) : finalTime);
    setRevealMistakes(true);
    setResult({ winner: playerWon ? 'player' : (isTimeout ? 'timeout' : winner), coinsEarned, perfect, time: finalTime });
    
    if (isCampaignGame) {
      if (playerWon) {
        const lvlCleared = campaignLevelInfo.level;
        const nextLvl = lvlCleared + 1;
        
        setLevelUpData({
          levelCleared: lvlCleared,
          coinsEarned,
          isBoss: campaignLevelInfo.isBoss,
          timeTaken: finalTime,
          mistakes: entryStats.wrong,
        });

        if (profile.isAuthenticated) {
          setProfile(prev => {
            const updatedHistory = [...(prev.history || [])];
            updatedHistory.push({
              date: new Date().toISOString().split('T')[0],
              mode: 'campaign',
              level: lvlCleared,
              difficulty: campaignLevelInfo.difficulty,
              won: true,
              time: finalTime,
              mistakes: entryStats.wrong,
              coinsEarned,
            });
            return {
              ...prev,
              coins: prev.coins + coinsEarned,
              campaignLevel: Math.max(prev.campaignLevel || 1, nextLvl),
              gamesPlayed: prev.gamesPlayed + 1,
              gamesWon: prev.gamesWon + 1,
              history: updatedHistory,
            };
          });
        }
        setShowLevelUpModal(true);
      } else {
        setCampaignFailed(true);
        if (profile.isAuthenticated) {
          setProfile(prev => {
            const updatedHistory = [...(prev.history || [])];
            updatedHistory.push({
              date: new Date().toISOString().split('T')[0],
              mode: 'campaign',
              level: campaignLevelInfo.level,
              difficulty: campaignLevelInfo.difficulty,
              won: false,
              time: finalTime,
              mistakes: entryStats.wrong,
              coinsEarned: 15,
            });
            return {
              ...prev,
              coins: prev.coins + 15,
              gamesPlayed: prev.gamesPlayed + 1,
              history: updatedHistory,
            };
          });
        }
        setMessage(isTimeout ? 'Time limit exceeded! Retrying might help.' : 'AI solved first. Speed up your deductions!');
      }
    } else {
      setShowSummaryModal(true);
      setMessage(playerWon
        ? `Done in ${formatTime(finalTime)}! +${coinsEarned} coins.`
        : `${agent.name} finished first. +25 practice coins.`
      );
      if (profile.isAuthenticated) {
        setProfile(prev => {
          const updatedHistory = [...(prev.history || [])];
          updatedHistory.push({
            date: new Date().toISOString().split('T')[0],
            mode: mode,
            difficulty: difficulty,
            won: playerWon,
            time: finalTime,
            mistakes: entryStats.wrong,
            coinsEarned,
          });
          return {
            ...prev,
            coins: prev.coins + coinsEarned,
            streak: playerWon ? prev.streak + 1 : 0,
            bestTime: playerWon && (!prev.bestTime || finalTime < prev.bestTime) ? finalTime : prev.bestTime,
            gamesPlayed: prev.gamesPlayed + 1,
            gamesWon: prev.gamesWon + (playerWon ? 1 : 0),
            history: updatedHistory,
          };
        });
      }
    }
  }

  useEffect(() => {
    if (gameState !== 'running' || !isGridComplete(playerGrid)) return;
    setRevealMistakes(true);
    const wrong = getWrongCells(playerGrid, solution, puzzle);
    if (wrong.length === 0) finishGame('player');
    else setMessage(`${wrong.length} mistake${wrong.length > 1 ? 's' : ''} found. Fix them to finish.`);
  }, [gameState, playerGrid, puzzle, solution]);

  function beginGame() {
    clearLoops(); setGameState('running'); setResult(null); setRevealMistakes(false);
    setCountdown(null);
    setMessage(mode === 'race' ? `Racing ${agent.name}. Go!` : 'Timer running. Good luck!');
    startTimer();
    if (mode !== 'race') return;
    const solver = createSolverByAlgorithm(agent.algorithm, puzzle);
    solver.start(); aiSolverRef.current = solver; startAiLoop();
  }

  function startGame() {
    clearLoops();
    setGameState('countdown');
    setResult(null);
    setRevealMistakes(false);
    setCountdown('3');
    setMessage(mode === 'race' ? `Get ready to race ${agent.name}.` : 'Get ready to solve.');

    let value = 3;
    countdownIntervalRef.current = setInterval(() => {
      value -= 1;
      if (value > 0) {
        setCountdown(String(value));
        return;
      }

      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdown("LET'S GO!");
      countdownTimeoutRef.current = setTimeout(beginGame, 700);
    }, 900);
  }

  function pauseGame()  { clearLoops(); setGameState('paused'); setMessage('Paused.'); }
  function resumeGame() {
    if (gameState !== 'paused') return;
    setGameState('running');
    setMessage(mode === 'race' ? `${agent.name} is back. Keep going!` : 'Resumed.');
    startTimer();
    if (mode === 'race' && aiSolverRef.current) startAiLoop();
  }

  function handleCellEdit(r, c, value) {
    if (gameState !== 'running') return;
    setPlayerGrid(prev => {
      const next = cloneGrid(prev); next[r][c] = value;
      playerGridRef.current = next;
      const pulse = detectCompletionPulse(prev, next, solution);
      if (pulse) setCompletionPulse(pulse);
      return next;
    });
    setActiveCell([r, c]);
  }

  function openMode(nextMode) {
    if (nextMode === 'race') { preparePuzzle(difficulty, 'race'); setPage('ai-select'); }
    else { preparePuzzle(difficulty, nextMode); setPage('play'); }
  }

  function playNow(diff = difficulty) {
    preparePuzzle(diff, 'solo'); setPage('play');
  }

  const primaryAction = gameState === 'running' ? pauseGame
    : gameState === 'paused' ? resumeGame
    : gameState === 'finished' ? () => preparePuzzle(difficulty, mode)
    : gameState === 'countdown' ? () => {}
    : startGame;

  const primaryLabel = gameState === 'running' ? 'Pause'
    : gameState === 'paused' ? 'Resume'
    : gameState === 'finished' ? 'New Game'
    : gameState === 'countdown' ? countdown
    : mode === 'race' ? 'Start Race' : 'Start';

  /* ─ Header ─ */
  function renderHeader() {
    return (
      <header className="topbar glass-panel arena-topbar">
        <button className="nav-logo" onClick={() => setPage('home')}>🧩 Sudoku Arena</button>
        <nav className="main-nav">
          <button className={page === 'home' ? 'nav-active' : ''} onClick={() => setPage('home')}>Home</button>
          <button onClick={() => playNow()}>Play</button>
          <button onClick={() => openMode('race')}>AI Race</button>
          <button onClick={() => openMode('photo')}>Scan & Play</button>
          <button className={page === 'campaign' ? 'nav-active' : ''} onClick={() => { setPage('campaign'); setIsCampaignGame(false); }}>Campaign</button>
          <button className={page === 'dashboard' ? 'nav-active' : ''} onClick={() => { setPage('dashboard'); setStatsView(false); }}>Dashboard</button>
        </nav>
        <ThemePicker current={resolvedTheme} onChange={setTheme} />
        {profile.isAuthenticated ? (
          <div className="profile-strip">
            <span className="profile-chip"><span className="chip-icon">👤</span>{profile.username}</span>
            <span className="profile-chip"><span className="chip-icon">💰</span>{profile.coins}</span>
            <span className="profile-chip"><span className="chip-icon">🔥</span>{profile.streak}</span>
          </div>
        ) : (
          <button className="btn-login" onClick={() => setShowLogin(true)}>Sign In</button>
        )}
      </header>
    );
  }

  /* ─ Login Modal ─ */
  function renderLoginModal() {
    if (!showLogin) return null;
    return (
      <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowLogin(false)}>✕</button>
          <AuthForm onSubmit={ud => {
            setProfile(prev => {
              const merged = { ...prev, ...ud, isAuthenticated: true };
              if (!merged.history || merged.history.length === 0) {
                merged.history = generateSeededHistory();
              }
              if (!merged.campaignLevel) {
                merged.campaignLevel = 1;
              }
              return merged;
            });
            setShowLogin(false);
          }} />
        </div>
      </div>
    );
  }

  /* ─ Home ─ */
  function renderHome() {
    return (
      <>
        {renderHeader()}
        {renderLoginModal()}
        <main className="home-grid">

          {/* ── Hero ── */}
          <section className="home-hero glass-panel animate-up">
            <div className="home-copy">
              <span className="home-tagline">Logic. Strategy. Mastery.</span>
              <h1>The World's Most<br />Elegant Puzzle.</h1>
              <p className="hero-desc">
                Sudoku is a pure logic puzzle that needs no language, no arithmetic — only reasoning.
                Place digits 1–9 so every row, column, and 3×3 box contains each number exactly once.
                No guessing. Just pure deduction.
              </p>
              <div className="home-cta-row">
                <button className="btn-primary" onClick={() => playNow('medium')}>
                  Play Free — No Login Needed
                </button>
                <button className="btn-secondary" onClick={() => { preparePuzzle('easy','solo'); setPage('play'); }}>
                  Start Easy
                </button>
              </div>
              <p className="hero-note">
                💡 Want to save your progress, earn coins, and track streaks?&nbsp;
                <button className="link-btn" onClick={() => setShowLogin(true)}>Create a free account.</button>
              </p>
            </div>

            <div className="home-board-preview">
              <Board3D>
                <div className="board-glow-ring" />
                <div ref={heroBoardRef}>
                  <Board
                    grid={heroGrid}
                    activeCell={heroActive}
                    originalGrid={heroPuzzle}
                    solveMode="idle"
                    algColor="var(--accent)"
                    boardTheme={resolvedTheme}
                    readOnly={false}
                    onCellClick={([r,c]) => {
                      if (heroPuzzle[r][c] !== 0) return;
                      setHeroActive([r,c]); setShowNumpad(true);
                    }}
                    onCellEdit={(r,c,v) => {
                      setHeroActive([r,c]);
                      setHeroGrid(prev => { const n = cloneGrid(prev); n[r][c]=v; return n; });
                    }}
                  />
                </div>
              </Board3D>
              {showNumpad && heroActive[0] >= 0 && (
                <NumPad anchorRef={heroBoardRef}
                  onSelect={val => {
                    const [r,c] = heroActive;
                    if (r >= 0) setHeroGrid(prev => { const n=cloneGrid(prev); n[r][c]=val; return n; });
                  }}
                  onClose={() => setShowNumpad(false)} />
              )}
              <p className="board-hint">Drag to rotate · Click any empty cell to fill</p>
              <div className="home-photo-upload">
                <ImageUpload onGridExtracted={loadUploadedPuzzleFromHome} />
              </div>
            </div>
          </section>

          {/* ── History ── */}
          <section className="content-section glass-panel animate-up">
            <div className="section-header">
              <span className="brand-tag">History</span>
              <h2>A Puzzle Born from Mathematics</h2>
            </div>
            <div className="history-grid">
              <div className="history-block">
                <span className="history-year">1783</span>
                <h4>Latin Squares</h4>
                <p>Swiss mathematician Leonhard Euler introduced "Latin Squares" — arrangements where each symbol appears exactly once in every row and column. This concept became the mathematical foundation for what would later become Sudoku.</p>
              </div>
              <div className="history-block">
                <span className="history-year">1979</span>
                <h4>Number Place</h4>
                <p>American puzzle constructor Howard Garns published a 9×9 logic puzzle called "Number Place" in Dell Magazines. It featured the same constraints we know today — and it went largely unnoticed in the West.</p>
              </div>
              <div className="history-block">
                <span className="history-year">1984</span>
                <h4>Japan Takes Over</h4>
                <p>Japanese publisher Nikoli introduced the puzzle as "Sūji wa dokushin ni kagiru" (the numbers must be single) — shortened to Sudoku. They added the rule that a puzzle could have at most 32 given clues and must be solvable by logic alone.</p>
              </div>
              <div className="history-block">
                <span className="history-year">2005</span>
                <h4>Global Phenomenon</h4>
                <p>The Times of London began publishing Sudoku daily. Within months it spread to newspapers worldwide, spawning books, apps, and tournaments. Over 100 million puzzles are now solved every day globally.</p>
              </div>
            </div>
            <div className="section-cta">
              <button className="btn-primary" onClick={() => playNow('easy')}>Start Playing Now →</button>
            </div>
          </section>

          {/* ── Rules ── */}
          <section className="content-section glass-panel animate-up">
            <div className="section-header">
              <span className="brand-tag">How to Play</span>
              <h2>Four Rules. Infinite Depth.</h2>
              <p>Sudoku has almost no rules — yet it produces puzzles of staggering variety and complexity.</p>
            </div>
            <div className="rules-grid">
              {RULES.map(r => (
                <div key={r.n} className="rule-card">
                  <span className="rule-num">{r.n}</span>
                  <h4>{r.title}</h4>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
            <div className="rules-extra">
              <h4>Solving Techniques — From Beginner to Master</h4>
              <div className="techniques-grid">
                {[
                  { level: 'Beginner', color: 'var(--success)', techs: ['Naked Singles — only one digit possible in a cell', 'Hidden Singles — digit has only one valid cell in a unit'] },
                  { level: 'Intermediate', color: 'var(--warning)', techs: ['Naked Pairs / Triples', 'Hidden Pairs', 'Pointing Pairs'] },
                  { level: 'Advanced', color: 'var(--accent)', techs: ['X-Wing pattern', 'Swordfish / Jellyfish', 'XY-Wing chains'] },
                  { level: 'Expert', color: 'var(--danger)', techs: ['Bowman\'s Bingo', 'Forcing Chains', 'Almost Locked Sets'] },
                ].map(t => (
                  <div key={t.level} className="technique-block">
                    <span className="technique-level" style={{ color: t.color }}>{t.level}</span>
                    <ul>
                      {t.techs.map(tech => <li key={tech}>{tech}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="section-cta">
              <button className="btn-primary" onClick={() => playNow('beginner')}>Try Beginner Level →</button>
            </div>
          </section>

          {/* ── Difficulty ── */}
          <section className="content-section glass-panel animate-up">
            <div className="section-header">
              <span className="brand-tag">Difficulty Levels</span>
              <h2>Find Your Level</h2>
              <p>We offer six difficulty tiers. Each changes how many cells are pre-filled and which techniques are required.</p>
            </div>
            <div className="difficulty-grid">
              {DIFFICULTIES.map((d, i) => (
                <div key={d.id} className="diff-card glass-panel">
                  <div className="diff-bar" style={{ width: `${(i+1) * 16}%`, background: `hsl(${120 - i*20}, 70%, 55%)` }} />
                  <h4>{d.label}</h4>
                  <p>{d.desc}</p>
                  <button className="diff-play-btn" onClick={() => playNow(d.id)}>Play {d.label} →</button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Why Sudoku Arena ── */}
          <section className="content-section glass-panel animate-up">
            <div className="section-header">
              <span className="brand-tag">Why Us</span>
              <h2>More Than Just a Puzzle Site</h2>
            </div>
            <div className="feature-strip">
              {[
                { n:'01', icon:'🆓', title:'Always Free to Play',       desc:'No account needed. Open the site, click Play, and you\'re in. Instantly.' },
                { n:'02', icon:'🤖', title:'Race AI Opponents',          desc:'Five AI agents from Rookie to Super Expert, each with unique solving algorithms and mistake rates.' },
                { n:'03', icon:'🎨', title:'Five Visual Themes',         desc:'Dark, Galaxy, Ocean, Lava, and Light. Switch anytime from the nav — your eyes, your choice.' },
                { n:'04', icon:'🏆', title:'Progress That Sticks',       desc:'Sign in to earn coins, build streaks, record best times, and track your improvement over weeks.' },
                { n:'05', icon:'📱', title:'Works on Any Device',        desc:'Fully responsive. Tap to pick a cell on mobile, click on desktop. The numpad floats right to you.' },
                { n:'06', icon:'🔬', title:'Algorithm Visualizer',       desc:'Watch Backtracking, AC-3, and Dancing Links solve puzzles in real time — great for CS students.' },
              ].map((f, i) => (
                <article key={f.n} className="feature-card glass-panel animate-up" style={{ animationDelay: `${i*0.08}s` }}>
                  <span className="feature-num">{f.n}</span>
                  <h3>{f.icon} {f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
            <div className="section-cta">
              <button className="btn-primary" onClick={() => playNow('medium')}>Jump Into a Game →</button>
              {!profile.isAuthenticated && (
                <button className="btn-secondary" onClick={() => setShowLogin(true)}>Create Free Account</button>
              )}
            </div>
          </section>

        </main>
      </>
    );
  }

  /* ─ Dashboard ─ */
  function renderDashboard() {
    return (
      <>
        {renderHeader()}
        {renderLoginModal()}
        
        {/* Dashboard Tab Bar */}
        <div className="dashboard-tab-bar">
          <button 
            className={`dash-tab-btn ${!statsView ? 'dash-tab-btn--active' : ''}`} 
            onClick={() => setStatsView(false)}
          >
            🎮 Play Center
          </button>
          <button 
            className={`dash-tab-btn ${statsView ? 'dash-tab-btn--active' : ''}`} 
            onClick={() => setStatsView(true)}
          >
            📊 Performance Stats
          </button>
        </div>

        {statsView ? (
          <StatsDashboard profile={profile} onSignInClick={() => setShowLogin(true)} />
        ) : (
          <main className="dashboard-home">
            <section className="mode-card glass-panel animate-up">
              <span className="brand-tag">Solo</span>
              <h2>Solve Alone</h2>
              <p>Pick a difficulty, track your time, and reveal mistakes only when the board is full.</p>
              <button className="btn-primary" style={{alignSelf:'flex-start'}} onClick={() => openMode('solo')}>▶ Start Solo</button>
            </section>
            <section className="mode-card glass-panel animate-up" style={{animationDelay:'0.1s'}}>
              <span className="brand-tag">AI Race</span>
              <h2>Race an Agent</h2>
              <p>Pick an AI level from Rookie to Super Expert and race to finish first.</p>
              <button className="btn-primary" style={{alignSelf:'flex-start'}} onClick={() => openMode('race')}>⚔ Choose AI</button>
            </section>
            <section className="mode-card glass-panel animate-up" style={{animationDelay:'0.15s'}}>
              <span className="brand-tag">Campaign Mode</span>
              <h2>Level Progression</h2>
              <p>Conquer 50 stages of evolving difficulty, boss battles, time trials, and earn rewards.</p>
              <button className="btn-primary" style={{alignSelf:'flex-start'}} onClick={() => setPage('campaign')}>🚩 Open Campaign</button>
            </section>
            <section className="mode-card glass-panel animate-up" style={{animationDelay:'0.2s'}}>
              <span className="brand-tag">Scan & Play</span>
              <h2>Solve from Photo</h2>
              <p>Upload a photo of any Sudoku puzzle from a newspaper or screen, and solve it interactively.</p>
              <button className="btn-primary" style={{alignSelf:'flex-start'}} onClick={() => openMode('photo')}>📸 Scan Photo</button>
            </section>
            <aside className="profile-summary glass-panel animate-up" style={{animationDelay:'0.25s'}}>
              <h2>{profile.username || 'Guest'}</h2>
              <div className="summary-grid">
                <span>Coins<strong>💰 {profile.coins || 0}</strong></span>
                <span>Streak<strong>🔥 {profile.streak || 0}</strong></span>
                <span>Games<strong>{profile.gamesPlayed || 0}</strong></span>
                <span>Wins<strong>{profile.gamesWon || 0}</strong></span>
                <span>Best<strong>{profile.bestTime ? formatTime(profile.bestTime) : '--:--'}</strong></span>
                <span>Win%<strong>{profile.gamesPlayed ? Math.round(profile.gamesWon/profile.gamesPlayed*100) : 0}%</strong></span>
              </div>
              {!profile.isAuthenticated && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowLogin(true)}>
                    Sign In to Save Progress
                  </button>
                </div>
              )}
            </aside>
          </main>
        )}
      </>
    );
  }

  /* ─ AI Select ─ */
  function renderAiSelect() {
    return (
      <>
        {renderHeader()}
        {renderLoginModal()}
        <div className="page-title-block">
          <span className="brand-tag">AI Challenge</span>
          <h2 className="page-title">Choose Your Opponent</h2>
          <p className="page-subtitle">Each agent uses a different algorithm and plays at a different speed. Pick your challenge.</p>
        </div>
        <div className="agent-grid">
          {Object.entries(AI_AGENTS).map(([key, item], i) => (
            <button key={key} className="agent-card glass-panel animate-up" style={{animationDelay:`${i*0.08}s`}}
              onClick={() => { setAgentKey(key); preparePuzzle(difficulty,'race'); setPage('play'); }}>
              <span className="agent-level">Level {item.level}</span>
              <strong>{item.name}</strong>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </>
    );
  }

  /* ─ Match Summary Modal ─ */
  function renderMatchSummaryModal() {
    if (gameState !== 'finished' || !result || !showSummaryModal) return null;
    const isPlayerWinner = result.winner === 'player';
    const opponent = AI_AGENTS[agentKey];
    return (
      <div className="modal-backdrop match-summary-backdrop" role="dialog" aria-modal="true">
        <div className="modal-box match-summary-box">
          <div className="match-summary-header">
            <h2 className={`summary-title ${isPlayerWinner ? 'summary-title--victory' : 'summary-title--defeat'}`}>
              {isPlayerWinner ? '🏆 VICTORY!' : '🤖 DEFEAT'}
            </h2>
            <p className="summary-subtitle">
              {isPlayerWinner
                ? `You defeated ${opponent.name} in a race!`
                : `${opponent.name} completed the grid first.`}
            </p>
          </div>
          <div className="match-stats-grid">
            <div className="summary-stat-card">
              <span>Your Progress</span>
              <strong>{Math.round(playerProgress * 100)}%</strong>
            </div>
            <div className="summary-stat-card">
              <span>AI Progress</span>
              <strong>{Math.round(aiProgress * 100)}%</strong>
            </div>
            <div className="summary-stat-card">
              <span>Time Taken</span>
              <strong>{formatTime(result.time)}</strong>
            </div>
            <div className="summary-stat-card">
              <span>Coins Earned</span>
              <strong style={{ color: 'var(--warning)' }}>💰 +{result.coinsEarned}</strong>
            </div>
            <div className="summary-stat-card">
              <span>Errors Made</span>
              <strong style={{ color: entryStats.wrong > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {entryStats.wrong}
              </strong>
            </div>
            {isPlayerWinner && profile.isAuthenticated && (
              <div className="summary-stat-card">
                <span>Current Streak</span>
                <strong style={{ color: 'var(--accent)' }}>🔥 {profile.streak}</strong>
              </div>
            )}
          </div>
          <div className="match-summary-actions">
            <button className="btn-primary" onClick={() => preparePuzzle(difficulty, mode)}>
              ⚔ New Race
            </button>
            <button className="btn-secondary" onClick={() => { preparePuzzle(difficulty, mode); setPage('ai-select'); }}>
              🤖 Change Opponent
            </button>
            <button className="btn-secondary" onClick={() => setShowSummaryModal(false)}>
              🔍 Review Board
            </button>
            <button className="btn-secondary" onClick={() => setPage('dashboard')}>
              🏠 Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─ Play ─ */
  function renderPlay() {
    const controlsLocked = gameState === 'running' || gameState === 'countdown';

    return (
      <>
        {renderHeader()}
        {renderLoginModal()}
        <section className="arena-controls glass-panel">
          <label>
            Difficulty
            <select value={difficulty} onChange={e => { setDifficulty(e.target.value); preparePuzzle(e.target.value, mode); }} disabled={controlsLocked}>
              {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <div className="mode-toggle" role="group">
            <button className={mode==='solo'?'mode-toggle--active':''} onClick={() => openMode('solo')} disabled={controlsLocked}>Solo</button>
            <button className={mode==='race'?'mode-toggle--active':''} onClick={() => openMode('race')} disabled={controlsLocked}>AI Race</button>
            <button className={mode==='photo'?'mode-toggle--active':''} onClick={() => openMode('photo')} disabled={controlsLocked}>Scan & Play</button>
          </div>
          <button className="ctrl-pill" onClick={() => preparePuzzle(difficulty,mode)} disabled={controlsLocked}>New Puzzle</button>
          <button className="ctrl-pill" onClick={gradePlayerGrid} disabled={gameState === 'countdown'}>Check Grid</button>
          <button className="arena-primary" onClick={primaryAction} disabled={gameState === 'countdown'}>{primaryLabel}</button>
          {!profile.isAuthenticated && (
            <span className="guest-notice">
              <button className="link-btn" onClick={() => setShowLogin(true)}>Sign in</button> to save progress
            </span>
          )}
        </section>

        {countdown && (
          <div className="countdown-backdrop" role="status" aria-live="assertive">
            <div className="countdown-card">
              <span className="countdown-kicker">{mode === 'race' ? 'Race begins in' : 'Game starts in'}</span>
              <strong key={countdown}>{countdown}</strong>
              {mode === 'race' && agent && (
                <span className="countdown-opponent">You vs {agent.name}</span>
              )}
            </div>
          </div>
        )}

        <main className={mode==='race' ? 'arena-layout' : 'solo-layout'}>
          <section className="arena-column player-column glass-panel">
            <div className="board-title-row">
              <div>
                <div className="panel-sub">Player</div>
                <h2 className="board-player-name">{profile.isAuthenticated ? profile.username : 'Guest'}</h2>
              </div>
              <span className="progress-badge">{Math.round(playerProgress*100)}%</span>
            </div>
            {mode === 'photo' && (
              <ImageUpload onGridExtracted={loadUploadedPuzzle} disabled={controlsLocked} />
            )}
            <Board
              grid={playerGrid} activeCell={activeCell} highlight={{}}
              originalGrid={puzzle} onCellClick={setActiveCell}
              onCellEdit={handleCellEdit} solveMode="idle"
              algColor="var(--accent)" boardTheme={resolvedTheme}
              wrongCells={wrongCells} completionPulse={completionPulse}
              selectedNumber={selectedNumber}
              readOnly={gameState !== 'running'}
              obscured={gameState === 'ready' || gameState === 'countdown'}
            />
            <div className="number-selector-bar">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                let count = 0;
                for (let r = 0; r < 9; r++)
                  for (let c = 0; c < 9; c++)
                    if (playerGrid[r][c] === num) count++;

                const isCompleted = count >= 9;
                const isSelected = selectedNumber === num;

                return (
                  <button
                    key={num}
                    className={`num-btn ${isSelected ? 'num-btn--selected' : ''} ${isCompleted ? 'num-btn--completed' : ''}`}
                    onClick={() => {
                      const nextNum = isSelected ? null : num;
                      setSelectedNumber(nextNum);
                      const [ar, ac] = activeCell;
                      if (ar >= 0 && ac >= 0 && puzzle[ar][ac] === 0 && gameState === 'running') {
                        handleCellEdit(ar, ac, nextNum ?? 0);
                      }
                    }}
                  >
                    <span className="num-btn-digit">{num}</span>
                    <span className="num-btn-count">{count}/9</span>
                  </button>
                );
              })}
            </div>
            <div className="race-stats">
              <span className="race-stat">Time<strong>{formatTime(elapsed)}</strong></span>
              <span className="race-stat">Filled<strong>{entryStats.played}</strong></span>
              <span className="race-stat">Correct<strong>{entryStats.correct}</strong></span>
              <span className="race-stat">Errors<strong>{revealMistakes ? entryStats.wrong : '–'}</strong></span>
            </div>
          </section>

          <aside className="versus-panel glass-panel">
            <span className={`race-state race-state--${gameState}`}>{gameState}</span>
            <h2 className="versus-vs">{mode==='race' ? 'VS' : '◈'}</h2>
            <p className="versus-msg">{message}</p>
            {result && (
              <div className="result-card">
                <strong>{result.winner==='player' ? '🏆 Complete!' : '🤖 AI Wins'}</strong>
                <span>+{result.coinsEarned} coins</span>
                {result.perfect && <span style={{color:'var(--success)',fontSize:'0.8rem'}}>✦ Perfect</span>}
              </div>
            )}
            {mode === 'race' ? (
              <div className="dual-progress-track" style={{width:'100%', marginTop: '12px'}}>
                <div className="progress-track-row">
                  <span className="progress-label">You: {Math.round(playerProgress*100)}%</span>
                  <div className="progress-track">
                    <div className="progress-fill player-fill" style={{width:`${Math.round(playerProgress*100)}%`}} />
                  </div>
                </div>
                <div className="progress-track-row" style={{marginTop: '8px'}}>
                  <span className="progress-label">{agent.name}: {Math.round(aiProgress*100)}%</span>
                  <div className="progress-track">
                    <div className="progress-fill ai-fill" style={{width:`${Math.round(aiProgress*100)}%`}} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="progress-track" style={{width:'100%', marginTop: '12px'}}>
                <div className="progress-fill" style={{width:`${Math.round(playerProgress*100)}%`}} />
              </div>
            )}
          </aside>

          {mode==='race' && (
            <section className="arena-column ai-column glass-panel">
              <div className="board-title-row">
                <div>
                  <div className="panel-sub">AI — Level {agent.level}</div>
                  <h2 className="board-player-name">{agent.name}</h2>
                </div>
                <span className="progress-badge">{Math.round(aiProgress*100)}%</span>
              </div>
              <Board
                grid={aiGrid} activeCell={[-1,-1]} highlight={highlight}
                originalGrid={puzzle} solveMode="solving"
                algColor="var(--accent2, var(--accent))" boardTheme={resolvedTheme}
                completionPulse={aiCompletionPulse} readOnly
                obscured={gameState === 'ready' || gameState === 'countdown'}
              />
              <div className="race-stats">
                <span className="race-stat">Algorithm<strong>{agent.algorithm.toUpperCase()}</strong></span>
                <span className="race-stat">Slip-ups<strong>{aiMistakes}</strong></span>
                <span className="race-stat">Reward<strong>{agent.reward}</strong></span>
              </div>
            </section>
          )}
        </main>
        {renderMatchSummaryModal()}
        {gameState === 'finished' && !showSummaryModal && (
          <div className="review-action-bar">
            <span>Race Finished. {result.winner === 'player' ? 'Victory!' : 'Defeat.'}</span>
            <button className="btn-primary" style={{padding:'6px 12px', fontSize:'0.75rem'}} onClick={() => setShowSummaryModal(true)}>
              View Stats Summary
            </button>
          </div>
        )}
      </>
    );
  }

  /* ─ Campaign Level Up Modal ─ */
  function renderLevelUpModal() {
    if (!showLevelUpModal || !levelUpData) return null;
    return (
      <div className="modal-backdrop level-up-backdrop" role="dialog" aria-modal="true">
        <div className="modal-box level-up-box glass-panel text-center">
          <div className="level-up-chest">🎁</div>
          <h2 className="level-up-title neon-pulse-glow">STAGE CLEARED!</h2>
          <p className="level-up-subtitle">You have successfully completed Level {levelUpData.levelCleared}</p>
          
          <div className="level-up-stats">
            <div className="lu-stat">
              <span>Time Taken</span>
              <strong>{formatTime(levelUpData.timeTaken)}</strong>
            </div>
            <div className="lu-stat">
              <span>Mistakes Made</span>
              <strong style={{ color: levelUpData.mistakes > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {levelUpData.mistakes}
              </strong>
            </div>
            <div className="lu-stat">
              <span>Mission Reward</span>
              <strong style={{ color: 'var(--warning)' }}>💰 +{levelUpData.coinsEarned}</strong>
            </div>
          </div>
          
          {levelUpData.isBoss && (
            <div className="boss-reward-alert">
              🏆 Boss Challenge Bonus Cleared! +500 Coins Claimed!
            </div>
          )}

          <div className="level-up-actions">
            <button className="btn-primary" onClick={() => {
              setShowLevelUpModal(false);
              const nextLvlNum = levelUpData.levelCleared + 1;
              if (nextLvlNum <= 50) {
                startCampaignLevel(getCampaignLevelDetails(nextLvlNum));
              } else {
                setPage('campaign');
              }
            }}>
              Next Level →
            </button>
            <button className="btn-secondary" onClick={() => {
              setShowLevelUpModal(false);
              setPage('campaign');
            }}>
              Campaign Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─ Campaign Failed Modal ─ */
  function renderCampaignFailedModal() {
    if (!campaignFailed || !campaignLevelInfo) return null;
    const isTimeout = elapsed >= campaignLevelInfo.timeLimit;
    return (
      <div className="modal-backdrop campaign-failed-backdrop" role="dialog" aria-modal="true">
        <div className="modal-box campaign-failed-box glass-panel text-center">
          <div className="failed-skull">💀</div>
          <h2 className="failed-title">MISSION FAILED</h2>
          <p className="failed-subtitle">
            {isTimeout 
              ? `You ran out of time! Limit was ${campaignLevelInfo.timeLimit} seconds.` 
              : `The AI opponent finished the grid first!`}
          </p>
          
          <div className="failed-stats">
            <div className="lu-stat">
              <span>Grid Progress</span>
              <strong>{Math.round(playerProgress * 100)}%</strong>
            </div>
            <div className="lu-stat">
              <span>Clues Provided</span>
              <strong>🧩 {campaignLevelInfo.clues}</strong>
            </div>
            <div className="lu-stat">
              <span>Errors Highlighted</span>
              <strong style={{ color: 'var(--danger)' }}>{entryStats.wrong}</strong>
            </div>
          </div>

          <div className="failed-actions">
            <button className="btn-primary btn-primary--boss" onClick={() => {
              setCampaignFailed(false);
              startCampaignLevel(campaignLevelInfo);
            }}>
              Retry Level
            </button>
            <button className="btn-secondary" onClick={() => {
              setCampaignFailed(false);
              setPage('campaign');
            }}>
              Campaign Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={resolvedTheme}>
      <div className="app-frame">
        {page==='home'      && renderHome()}
        {page==='dashboard' && renderDashboard()}
        {page==='ai-select' && renderAiSelect()}
        {page==='campaign'  && (
          <>
            {renderHeader()}
            {renderLoginModal()}
            <CampaignMap 
              profile={profile} 
              onStartLevel={startCampaignLevel} 
              onBackToDashboard={() => setPage('dashboard')} 
            />
          </>
        )}
        {page==='play'      && renderPlay()}
        {renderLevelUpModal()}
        {renderCampaignFailedModal()}
      </div>
    </div>
  );
}
