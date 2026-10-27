import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './main';
import { STORAGE_KEY } from './storage';
afterEach(() => vi.useRealTimers());
const cell = (row: number, col: number) => screen.getByRole('button', { name: new RegExp(`^Row ${row}, Column ${col}:`) });
const chooseComputer = () => fireEvent.click(screen.getByRole('button', { name: /Vs. computer/ }));

describe('application interactions', () => {
  it('renders nine accessible cells and records moves', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /^Row/ })).toHaveLength(9);
    expect(screen.getByRole('button', { name: /Undo last move/ })).toBeDisabled();
    fireEvent.click(cell(1, 1));
    expect(cell(1, 1)).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Player O, your move.');
    expect(screen.getByRole('list', { name: 'Moves in this game' }).children).toHaveLength(1);
  });
  it('highlights a win, locks undo, and clears only the active saved game', () => {
    render(<App />);
    [[1,1],[2,1],[1,2],[2,2],[1,3]].forEach(([r,c]) => fireEvent.click(cell(r,c)));
    expect(screen.getByRole('status')).toHaveTextContent('Player X wins!');
    expect(screen.getAllByRole('button', { name: /winning cell/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Undo last move/ })).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toMatchObject({ scores: { X: 1 } });
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty('activeGame');
    fireEvent.click(screen.getByRole('button', { name: /Reset game/ }));
    expect(screen.getByText('1 game played')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Player X, your move.');
  });
  it('automatically responds and undoes both moves', () => {
    vi.useFakeTimers(); render(<App />); chooseComputer();
    fireEvent.click(cell(1, 1));
    expect(screen.getByRole('status')).toHaveTextContent('Computer is thinking');
    expect(cell(2, 2)).toBeDisabled();
    act(() => { vi.advanceTimersByTime(350); });
    expect(cell(2, 2)).toHaveTextContent('O');
    fireEvent.click(screen.getByRole('button', { name: /Undo last move/ }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(cell(1, 1)).toBeEnabled();
    expect(cell(2, 2)).toBeEmptyDOMElement();
  });
  it.each(['undo', 'reset', 'mode'])('cancels pending computer move on %s', action => {
    vi.useFakeTimers(); render(<App />); chooseComputer();
    fireEvent.click(cell(1, 1));
    if (action === 'undo') fireEvent.click(screen.getByRole('button', { name: /Undo last move/ }));
    if (action === 'reset') fireEvent.click(screen.getByRole('button', { name: /Reset game/ }));
    if (action === 'mode') fireEvent.click(screen.getByRole('button', { name: /Two players/ }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(cell(2, 2)).toBeEmptyDOMElement();
  });
  it('restores a pending computer turn on refresh and responds once in StrictMode', () => {
    vi.useFakeTimers();
    const initial = render(<App />); chooseComputer(); fireEvent.click(cell(1, 1)); initial.unmount();
    render(<React.StrictMode><App /></React.StrictMode>);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('list').children).toHaveLength(2);
    expect(cell(2, 2)).toHaveTextContent('O');
  });
  it('resets scores without removing active moves', () => {
    render(<App />); fireEvent.click(cell(1, 1));
    fireEvent.click(screen.getByRole('button', { name: 'Reset scoreboard' }));
    expect(cell(1, 1)).toHaveTextContent('X');
    expect(screen.getByRole('status')).toHaveTextContent('Player O');
  });

  it('renders a draw, locks the board and undo, and preserves its score after refresh', () => {
    const initial = render(<App />);
    [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach(index =>
      fireEvent.click(cell(Math.floor(index / 3) + 1, index % 3 + 1)));
    expect(screen.getByRole('status')).toHaveTextContent('A well-played draw.');
    screen.getAllByRole('button', { name: /^Row/ }).forEach(button => expect(button).toBeDisabled());
    expect(screen.getByRole('button', { name: /Undo last move/ })).toBeDisabled();
    expect(screen.getByRole('list').children).toHaveLength(9);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty('activeGame');
    initial.unmount();
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Player X, your move.');
    expect(screen.getByText('1 game played')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).scores).toEqual({ X: 0, O: 0, draws: 1 });
  });

  it('does not schedule a computer reply after the human wins', () => {
    vi.useFakeTimers(); render(<App />); chooseComputer();
    // O takes center, then corner 2, then blocks the bottom row at 7.
    for (const index of [0, 8, 6]) {
      fireEvent.click(cell(Math.floor(index / 3) + 1, index % 3 + 1));
      act(() => { vi.advanceTimersByTime(350); });
    }
    fireEvent.click(cell(2, 1)); // X completes the left column.
    expect(screen.getByRole('status')).toHaveTextContent('You take the win!');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('list').children).toHaveLength(7);
    expect(screen.getAllByRole('button', { name: /winning cell/ })).toHaveLength(3);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).scores).toEqual({ X: 1, O: 0, draws: 0 });
  });

  it('lets the computer win, highlights its diagonal, and records one O win', () => {
    vi.useFakeTimers(); render(<App />); chooseComputer();
    for (const index of [0, 1, 3]) {
      fireEvent.click(cell(Math.floor(index / 3) + 1, index % 3 + 1));
      act(() => { vi.advanceTimersByTime(350); });
    }
    expect(screen.getByRole('status')).toHaveTextContent('Computer wins this one.');
    const winning = screen.getAllByRole('button', { name: /winning cell/ });
    expect(winning).toHaveLength(3);
    winning.forEach(button => expect(button).toHaveTextContent('O'));
    expect(screen.getByRole('button', { name: /Undo last move/ })).toBeDisabled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).scores).toEqual({ X: 0, O: 1, draws: 0 });
  });

  it('undoes a two-player move in the UI and persists the restored turn and history', () => {
    const initial = render(<App />);
    fireEvent.click(cell(1, 1)); fireEvent.click(cell(2, 2));
    fireEvent.click(screen.getByRole('button', { name: /Undo last move/ }));
    expect(cell(1, 1)).toHaveTextContent('X');
    expect(cell(2, 2)).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toHaveTextContent('Player O, your move.');
    expect(screen.getByRole('list').children).toHaveLength(1);
    initial.unmount(); render(<App />);
    expect(cell(1, 1)).toHaveTextContent('X');
    expect(cell(2, 2)).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Player O, your move.');
  });

  it('restores an empty board after a win without counting that win again in StrictMode', () => {
    const initial = render(<React.StrictMode><App /></React.StrictMode>);
    [0, 3, 1, 4, 2].forEach(index =>
      fireEvent.click(cell(Math.floor(index / 3) + 1, index % 3 + 1)));
    expect(screen.getByText('1 game played')).toBeInTheDocument();
    initial.unmount(); render(<React.StrictMode><App /></React.StrictMode>);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('1 game played')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Player X, your move.');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).scores.X).toBe(1);
  });

  it('persists scoreboard reset after completion without recording the old result again', () => {
    const initial = render(<App />);
    [0, 3, 1, 4, 2].forEach(index =>
      fireEvent.click(cell(Math.floor(index / 3) + 1, index % 3 + 1)));
    fireEvent.click(screen.getByRole('button', { name: 'Reset scoreboard' }));
    expect(screen.getByRole('status')).toHaveTextContent('Player X wins!');
    expect(screen.getByText('0 games played')).toBeInTheDocument();
    initial.unmount(); render(<App />);
    expect(screen.getByText('0 games played')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a persistence warning and remains playable when storage writes fail', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('storage full'); });
    try {
      render(<App />);
      expect(screen.getByText(/Browser storage is unavailable/)).toBeInTheDocument();
      fireEvent.click(cell(1, 1));
      expect(cell(1, 1)).toHaveTextContent('X');
      expect(screen.getByRole('status')).toHaveTextContent('Player O, your move.');
    } finally { write.mockRestore(); }
  });
});
