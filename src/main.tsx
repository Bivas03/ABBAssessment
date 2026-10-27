import React, { useEffect, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { computerMove, derive, freshState, reducer } from './game';
import { loadSession, saveSession } from './storage';
import './style.css';

function initialize() {
  try { return loadSession(window.sessionStorage); } catch { return freshState(); }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialize);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const game = derive(state.moves);
  const thinking = state.mode === 'computer' && game.currentPlayer === 'O' && game.status === 'InProgress';
  const completed = game.status !== 'InProgress';
  const total = state.scores.X + state.scores.O + state.scores.draws;

  useEffect(() => {
    try { setStorageAvailable(saveSession(window.sessionStorage, state)); }
    catch { setStorageAvailable(false); }
  }, [state]);

  useEffect(() => {
    if (!thinking) return;
    const timer = window.setTimeout(() => {
      const cell = computerMove(state.moves);
      if (cell !== null) dispatch({ type: 'move', cell, player: 'O' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state.moves, thinking]);

  const status = game.winner
    ? state.mode === 'computer' ? game.winner === 'X' ? 'You take the win!' : 'Computer wins this one.' : `Player ${game.winner} wins!`
    : game.status === 'Draw' ? 'A well-played draw.'
      : thinking ? 'Computer is thinking…'
        : state.mode === 'computer' ? 'Your move, player X.' : `Player ${game.currentPlayer}, your move.`;

  return <main className="shell">
    <header className="header">
      <a className="brand" href="./" aria-label="Tic Tac Toe home"><span className="brand-icon" aria-hidden="true">#</span> playroom<span className="brand-dot">.</span></a>
      <span className="header-note"><span className="live-dot" /> A little friendly competition</span>
    </header>

    <section className="intro"><span className="eyebrow">THE CLASSIC, REIMAGINED</span><h1>Good things come<br />three in a row<span>.</span></h1><p>A quick break. A friendly rivalry. Your next move.</p></section>

    <div className="workspace">
      <section className="game-card" aria-label="Tic Tac Toe game">
        <div className="game-top"><h2>Tic Tac Toe</h2><span className="small-label">3 × 3 · STRATEGY</span></div>
        <div className="mode-selector" role="group" aria-label="Game mode">
          <button aria-pressed={state.mode === 'two-player'} onClick={() => dispatch({ type: 'mode', mode: 'two-player' })}><span aria-hidden="true">♧</span> Two players</button>
          <button aria-pressed={state.mode === 'computer'} onClick={() => dispatch({ type: 'mode', mode: 'computer' })}><span aria-hidden="true">▣</span> Vs. computer</button>
        </div>
        <div className={`status ${completed ? 'finished' : ''}`} role="status" aria-live="polite" aria-atomic="true">
          <span className={`turn-mark ${game.winner === 'O' || thinking || (!completed && game.currentPlayer === 'O') ? 'o-color' : ''}`} aria-hidden="true">{game.status === 'Draw' ? '=' : game.winner ?? game.currentPlayer}</span>
          <div><strong>{status}</strong><span>{completed ? 'Start a fresh game to play again.' : thinking ? 'Finding a good spot.' : 'Choose an empty square to play.'}</span></div>
          {!completed && <span className="turn-pill">{thinking ? 'THINKING' : 'YOUR TURN'}</span>}
        </div>
        <div className="board" role="group" aria-label="Game board">
          {game.board.map((player, cell) => <button key={cell} className={`cell ${player === 'O' ? 'o-color' : ''} ${game.winningCells.includes(cell) ? 'winning' : ''}`} aria-label={`Row ${Math.floor(cell / 3) + 1}, Column ${cell % 3 + 1}: ${player ?? 'empty'}${game.winningCells.includes(cell) ? ', winning cell' : ''}`} disabled={!!player || completed || thinking} onClick={() => dispatch({ type: 'move', cell, player: game.currentPlayer })}>{player && <span className="symbol">{player}</span>}</button>)}
        </div>
        <div className="controls"><button className="button secondary" disabled={!state.moves.length || completed} onClick={() => dispatch({ type: 'undo' })}><span aria-hidden="true">↶</span> Undo last move</button><button className="button primary" onClick={() => dispatch({ type: 'reset' })}><span aria-hidden="true">↻</span> Reset game</button></div>
        <p className="game-hint">{completed ? 'Result recorded. Undo is locked for completed games.' : state.mode === 'computer' ? 'You are X. Undo takes back your move and the computer’s reply.' : 'X goes first. Take turns and make your three count.'}</p>
      </section>

      <aside className="sidebar">
        <section className="panel" aria-labelledby="score-title">
          <div className="panel-heading"><h2 id="score-title">The scoreboard</h2><span className="small-label">THIS SESSION</span></div>
          <div className="scores"><div className="score x-score"><span className="score-mark">X</span><strong>{state.scores.X}</strong><span>{state.mode === 'computer' ? 'You' : 'Player X'}</span></div><div className="score draw-score"><span className="score-mark">=</span><strong>{state.scores.draws}</strong><span>Draws</span></div><div className="score o-score"><span className="score-mark">O</span><strong>{state.scores.O}</strong><span>{state.mode === 'computer' ? 'Computer' : 'Player O'}</span></div></div>
          <div className="score-footer"><span>{total} {total === 1 ? 'game' : 'games'} played</span><button className="text-button" onClick={() => dispatch({ type: 'reset-scores' })}>Reset scoreboard</button></div>
          <p className="panel-note">Scores are shared across both game modes.</p>
        </section>

        <section className="panel history-panel" aria-labelledby="history-title"><div className="panel-heading"><h2 id="history-title">Move history</h2><span className="count">{state.moves.length} / 9</span></div>
          {state.moves.length === 0 ? <div className="empty-history"><span aria-hidden="true">↗</span><strong>A clean slate.</strong><p>Your moves will appear here.<br />Make the first one count.</p></div> : <ol className="history" aria-label="Moves in this game">{state.moves.map((cell, index) => <li key={index}><span className="move-number">{String(index + 1).padStart(2, '0')}</span><span className={`move-player ${index % 2 ? 'o-color' : ''}`}>{index % 2 ? 'O' : 'X'}</span><span>Row {Math.floor(cell / 3) + 1}, Column {cell % 3 + 1}</span>{index === state.moves.length - 1 && <span className="latest">LATEST</span>}</li>)}</ol>}
        </section>
        <div className="tip"><span aria-hidden="true">✧</span><p><strong>Small board. Big possibilities.</strong>Connect three in a row, column, or diagonal to win.</p></div>
      </aside>
    </div>
    <footer><span>Made for a moment of play.</span><span>{storageAvailable ? 'Progress stays in this tab. Finish a game to clear its saved board.' : 'Browser storage is unavailable. Progress will be lost on refresh.'}</span></footer>
  </main>;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
