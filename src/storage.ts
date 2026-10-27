import { derive, freshState, reducer, type Mode, type State } from './game';
export const STORAGE_KEY = 'tic-tac-toe.session.v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;

export function saveSession(storage: StoragePort, state: State): boolean {
  try {
    // Keep a single atomic record: completion commits scores and removes active moves together.
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1, mode: state.mode, scores: state.scores,
      ...(derive(state.moves).status === 'InProgress' && state.moves.length ? { activeGame: { moves: state.moves } } : {}),
    }));
    return true;
  } catch { return false; }
}

export function loadSession(storage: StoragePort): State {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!data || data.version !== 1 || !['two-player', 'computer'].includes(data.mode)) return freshState();
    if (!data.scores || !['X', 'O', 'draws'].every(key => Number.isSafeInteger(data.scores[key]) && data.scores[key] >= 0)) return freshState();
    const base: State = { mode: data.mode as Mode, scores: { ...data.scores }, moves: [] };
    if (!data.activeGame) return base;
    if (!Array.isArray(data.activeGame.moves) || data.activeGame.moves.length > 9) return base;
    let replay = { ...base };
    for (const cell of data.activeGame.moves) {
      const next = reducer(replay, { type: 'move', cell, player: derive(replay.moves).currentPlayer });
      if (next === replay || derive(next.moves).status !== 'InProgress') return base;
      replay = next;
    }
    return replay;
  } catch { return freshState(); }
}
