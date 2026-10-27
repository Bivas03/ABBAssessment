import { describe, expect, it } from 'vitest';
import { computerMove, derive, freshState, lines, reducer, type State } from './game';
import { loadSession, saveSession, STORAGE_KEY } from './storage';

function play(cells: number[], mode: State['mode'] = 'two-player') {
  return cells.reduce((state, cell) => reducer(state, { type: 'move', cell, player: derive(state.moves).currentPlayer }), { ...freshState(), mode });
}

describe('game rules', () => {
  it('accepts valid moves and alternates players', () => {
    const state = play([0, 4]);
    expect(derive(state.moves).board).toEqual(['X', null, null, null, 'O', null, null, null, null]);
    expect(derive(state.moves).currentPlayer).toBe('X');
  });
  it.each([-1, 9, 1.5, NaN])('rejects invalid cell %s', cell => {
    const state = freshState();
    expect(reducer(state, { type: 'move', cell, player: 'X' })).toBe(state);
  });
  it('rejects occupied cells and the wrong player without changing turn', () => {
    const state = play([0]);
    expect(reducer(state, { type: 'move', cell: 0, player: 'O' })).toBe(state);
    expect(reducer(state, { type: 'move', cell: 1, player: 'X' })).toBe(state);
    expect(derive(state.moves).currentPlayer).toBe('O');
  });
  it.each(lines.map((line, i) => ({ line, name: `winning line ${i + 1}` })))('detects $name', ({ line }) => {
    const others = Array.from({ length: 9 }, (_, i) => i).filter(i => !line.includes(i));
    const state = play([line[0], others[0], line[1], others[1], line[2]]);
    expect(derive(state.moves)).toMatchObject({ status: 'Won', winner: 'X', winningCells: line });
    expect(state.scores).toEqual({ X: 1, O: 0, draws: 0 });
  });
  it('records an O win', () => {
    expect(play([0, 3, 1, 4, 8, 5]).scores.O).toBe(1);
  });
  it('detects a draw and records it once', () => {
    const state = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(derive(state.moves).status).toBe('Draw');
    expect(state.scores.draws).toBe(1);
    expect(reducer(state, { type: 'move', cell: 0, player: 'O' })).toBe(state);
  });
  it('prioritizes a ninth-move win over a draw and highlights both winning lines', () => {
    const state = play([0, 1, 2, 3, 6, 5, 8, 7, 4]);
    expect(derive(state.moves).status).toBe('Won');
    expect(derive(state.moves).winningCells.sort()).toEqual([0, 2, 4, 6, 8]);
    expect(state.scores).toEqual({ X: 1, O: 0, draws: 0 });
  });
  it('blocks further moves and undo after completion', () => {
    const state = play([0, 3, 1, 4, 2]);
    expect(reducer(state, { type: 'move', cell: 5, player: 'O' })).toBe(state);
    expect(reducer(state, { type: 'undo' })).toBe(state);
  });
  it('resets the game while preserving scores and mode', () => {
    const completed = play([0, 3, 1, 4, 2], 'computer');
    const state = reducer(completed, { type: 'reset' });
    expect(state.moves).toEqual([]);
    expect(state.mode).toBe('computer');
    expect(state.scores.X).toBe(1);
    expect(derive(state.moves)).toMatchObject({ currentPlayer: 'X', status: 'InProgress' });
  });
  it('undo removes one move in two-player mode', () => {
    const state = reducer(play([0, 4]), { type: 'undo' });
    expect(state.moves).toEqual([0]);
    expect(derive(state.moves).currentPlayer).toBe('O');
  });
  it('undo removes a full pair in computer mode', () => {
    const state = reducer(play([0, 4, 2, 1], 'computer'), { type: 'undo' });
    expect(state.moves).toEqual([0, 4]);
    expect(derive(state.moves).currentPlayer).toBe('X');
  });
  it('undo removes only the pending human move before the computer responds', () => {
    expect(reducer(play([0, 4, 2], 'computer'), { type: 'undo' }).moves).toEqual([0, 4]);
  });
  it('empty undo does nothing', () => {
    const state = freshState();
    expect(reducer(state, { type: 'undo' })).toBe(state);
  });
  it('mode changes clear moves and preserve scores', () => {
    const state = { ...play([0, 4]), scores: { X: 2, O: 1, draws: 3 } };
    expect(reducer(state, { type: 'mode', mode: 'computer' })).toEqual({ ...state, mode: 'computer', moves: [] });
  });
  it('score reset preserves the current game', () => {
    const state = { ...play([0, 4]), scores: { X: 2, O: 1, draws: 3 } };
    expect(reducer(state, { type: 'reset-scores' })).toEqual({ ...state, scores: { X: 0, O: 0, draws: 0 } });
  });
});

describe('computer strategy', () => {
  it('wins before blocking', () => expect(computerMove([0, 3, 1, 4, 8])).toBe(5));
  it('blocks an immediate human win', () => expect(computerMove([0, 4, 1])).toBe(2));
  it('takes the center', () => expect(computerMove([0])).toBe(4));
  it('takes the first available corner', () => expect(computerMove([4])).toBe(0));
  it('takes an available edge if no corner is available', () => expect(computerMove([0, 2, 6, 8, 4, 3, 5])).toBe(1));
  it('does not move after a win or draw', () => {
    expect(computerMove([0, 3, 1, 4, 2])).toBeNull();
    expect(computerMove([0, 1, 2, 4, 3, 5, 7, 6, 8])).toBeNull();
  });
  it('only chooses valid moves across every reachable computer-turn position', () => {
    let checked = 0;
    const visited = new Set<string>();
    function visit(moves: number[]) {
      const game = derive(moves);
      const key = game.board.map(cell => cell ?? '-').join('');
      if (visited.has(key)) return;
      visited.add(key);
      if (game.status !== 'InProgress') return;
      if (game.currentPlayer === 'O') {
        const cell = computerMove(moves);
        expect(cell).not.toBeNull();
        expect(game.board[cell!]).toBeNull();
        checked++;
      }
      game.board.forEach((value, cell) => { if (!value) visit([...moves, cell]); });
    }
    visit([]);
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('session storage', () => {
  it('restores active moves, mode, scores, and turn', () => {
    const state = { ...play([0, 4, 1], 'computer'), scores: { X: 1, O: 2, draws: 3 } };
    expect(saveSession(sessionStorage, state)).toBe(true);
    expect(loadSession(sessionStorage)).toEqual(state);
    expect(derive(loadSession(sessionStorage).moves).currentPlayer).toBe('O');
  });
  it('removes completed active-game data atomically while retaining scores', () => {
    saveSession(sessionStorage, play([0, 3, 1, 4]));
    saveSession(sessionStorage, play([0, 3, 1, 4, 2]));
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty('activeGame');
    expect(loadSession(sessionStorage)).toEqual({ ...freshState(), scores: { X: 1, O: 0, draws: 0 } });
  });
  it('clears completed draw data too', () => {
    saveSession(sessionStorage, play([0, 1, 2, 4, 3, 5, 7, 6, 8]));
    expect(loadSession(sessionStorage).moves).toEqual([]);
    expect(loadSession(sessionStorage).scores.draws).toBe(1);
  });
  it.each(['invalid json', '{}', '{"version":99}', '{"version":1,"mode":"computer","scores":{"X":-1,"O":0,"draws":0}}'])('handles malformed storage: %s', data => {
    sessionStorage.setItem(STORAGE_KEY, data);
    expect(loadSession(sessionStorage)).toEqual(freshState());
  });
  it.each([[0, 0], [10], [0, 3, 1, 4, 2, 5], ['0']])('rejects invalid saved history %s', (...moves) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, mode: 'computer', scores: { X: 2, O: 0, draws: 0 }, activeGame: { moves } }));
    const state = loadSession(sessionStorage);
    expect(state.moves).toEqual([]);
    expect(state.scores.X).toBe(2);
  });
  it('handles blocked storage', () => {
    const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    expect(loadSession(blocked)).toEqual(freshState());
    expect(saveSession(blocked, freshState())).toBe(false);
  });
});
