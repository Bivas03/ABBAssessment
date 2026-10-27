export type Player = 'X' | 'O';
export type Mode = 'two-player' | 'computer';
export type Scores = { X: number; O: number; draws: number };
export type State = { mode: Mode; moves: number[]; scores: Scores };
export const emptyScores = (): Scores => ({ X: 0, O: 0, draws: 0 });
export const freshState = (): State => ({ mode: 'two-player', moves: [], scores: emptyScores() });
export const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export function derive(moves: number[]) {
  const board: (Player | null)[] = Array(9).fill(null);
  moves.forEach((cell, turn) => { board[cell] = turn % 2 === 0 ? 'X' : 'O'; });
  const winningLines = lines.filter(line => board[line[0]] && line.every(cell => board[cell] === board[line[0]]));
  const winningCells = [...new Set(winningLines.flat())];
  const winner = winningCells.length ? board[winningCells[0]] : null;
  const status = winner ? 'Won' : moves.length === 9 ? 'Draw' : 'InProgress';
  const currentPlayer: Player = moves.length % 2 === 0 ? 'X' : 'O';
  return { board, winner, winningCells, status, currentPlayer };
}

export function computerMove(moves: number[]): number | null {
  const { board, status } = derive(moves);
  if (status !== 'InProgress') return null;
  for (const player of ['O', 'X'] as const) {
    for (const line of lines) {
      const empty = line.filter(cell => !board[cell]);
      if (empty.length === 1 && line.filter(cell => board[cell] === player).length === 2) return empty[0];
    }
  }
  return [4, 0, 2, 6, 8, 1, 3, 5, 7].find(cell => !board[cell]) ?? null;
}

export type Action =
  | { type: 'move'; cell: number; player: Player }
  | { type: 'undo' } | { type: 'reset' }
  | { type: 'mode'; mode: Mode } | { type: 'reset-scores' };

export function reducer(state: State, action: Action): State {
  const game = derive(state.moves);
  switch (action.type) {
    case 'move': {
      if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell > 8 ||
          game.status !== 'InProgress' || game.board[action.cell] || action.player !== game.currentPlayer) return state;
      const moves = [...state.moves, action.cell];
      const result = derive(moves);
      const scores = { ...state.scores };
      if (result.winner) scores[result.winner]++;
      else if (result.status === 'Draw') scores.draws++;
      return { ...state, moves, scores };
    }
    case 'undo': {
      if (!state.moves.length || game.status !== 'InProgress') return state;
      const count = state.mode === 'computer' && state.moves.length % 2 === 0 ? 2 : 1;
      return { ...state, moves: state.moves.slice(0, -count) };
    }
    case 'reset': return { ...state, moves: [] };
    case 'mode': return action.mode === state.mode ? state : { ...state, mode: action.mode, moves: [] };
    case 'reset-scores': return { ...state, scores: emptyScores() };
  }
}
