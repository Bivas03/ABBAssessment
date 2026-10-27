# Playroom · Tic Tac Toe

A frontend-only React and TypeScript implementation of the supplied Tic Tac Toe assessment. Play locally with a friend or against a deterministic computer opponent.

## Tech stack

React 19, TypeScript, Vite, and CSS. Tests use Vitest, React Testing Library, and jsdom. Browser `sessionStorage` holds session data; no REST API, backend, or database is used in the user-approved scope.

## Run locally

Install Node.js 22.12 or newer (Node.js 24 LTS recommended), then:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm test          # game, storage, and React interaction tests
npm run build    # strict TypeScript check and production build
npm run preview  # serve the production build locally
```

The build output is `dist/` and can be served by any static host. No server application, environment variables, account, or database is needed.

## Features

- Responsive, accessible 3 × 3 board, alternating turns, invalid-move protection.
- Row, column, diagonal, and double-line win highlights; draw detection.
- Session scoreboard for X wins, O wins, and draws; each completion recorded once.
- Move history with move number, player, and one-based row/column.
- Two-player and human-X/computer-O modes.
- Computer priority: win, block, center, corner, then edge. Ties use a fixed order.
- Mode-aware undo and separate game/scoreboard reset controls.
- Refresh recovery with browser `sessionStorage`, including pending computer turns.
- Keyboard-operable cells, visible focus, accessible position labels, live status announcements, and reduced-motion support.

## Agreed changes to the assessment

The original document inconsistently references Angular and React and requests a .NET backend and REST APIs. The user explicitly chose **React with no backend**. Game validation, state ownership, history, computer strategy, and scoring therefore live in a pure frontend reducer. API contracts and backend setup/tests do not apply. GitHub publication has not been requested or performed; this folder is ready to place in a repository.

## State and persistence

`src/game.ts` contains pure, UI-independent rules. Ordered moves are the source of truth for the board, player turn, result, and winning cells. `src/storage.ts` validates and replays saved moves before restoring them. `src/main.tsx` renders the interface and schedules computer moves.

One versioned session-storage record atomically saves the mode, scores, and optional active game. During play, each move and undo saves the current history. After a win or draw, the same write updates scores and omits the active game; completed moves are no longer stored. The result stays visible in memory until reset or refresh. Refresh after completion starts an empty board with the saved mode and scores. Reset Game and changing mode clear saved moves and preserve scores. Reset Scoreboard preserves current moves.

Scores are shared across modes and belong to the symbols X/O. A normal refresh retains the tab's session. Closing the tab normally ends that session; browser session-restoration features can restore session storage. Browser storage is user-controlled, so scores are not tamper-proof. If storage is blocked or full, the game continues and displays a persistence warning. Corrupt data is discarded safely.

## Undo and computer timing

We chose the document's **Option A: disable undo after completion**. A final score cannot be reversed. In two-player mode, undo removes one move. In computer mode, undo removes the last X/O pair, returning control to the human. If O has not responded, only the pending human move is removed.

The computer waits 350 ms. While thinking, board input is locked; undo/reset/mode changes remain available. Effect cleanup cancels stale timers on those actions and unmount. A restored O turn schedules one fresh response. Score changes happen only in the reducer, never in an effect, including under React StrictMode.

## Validation

See [VALIDATION.md](VALIDATION.md) for the document-to-implementation mapping and verification results. Tests include all requested game-rule categories, storage validation, pending-turn cancellation, refresh recovery, and an exhaustive traversal verifying computer choices are legal at every reachable O-turn position.

## AI development notes

The user supplied the assessment, requested a specification, replaced the backend with React-only logic, selected session persistence and completed-game cleanup, discussed paired undo, and authorized implementation and validation. Codex generated the application, styling, tests, and documentation. Decisions reviewed include terminal-state locks, atomic score persistence, invalid stored histories, computer timer cleanup, and StrictMode behavior. No human-authored code changes are claimed. The test/build results are recorded in the validation report.

## Limitations and future improvements

- Local device play only; no accounts, remote multiplayer, or cross-device persistence.
- The required basic computer strategy is intentionally not unbeatable. Minimax could be an optional difficulty later.
- No redo, result archive, or undo after completion.
- Optional Google Fonts enhance typography; system fallbacks keep the app usable offline after assets load.
- Potential extensions: separate scores by mode, optional local-storage persistence, difficulty levels, and arrow-key board navigation.
