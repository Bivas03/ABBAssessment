# Final requirements review

Reviewed on 27 October 2026 against the supplied assessment and the user's agreed changes.

## Scope

The user explicitly selected React frontend only, with no .NET backend or REST API. Game validation/state ownership and scoreboard management therefore run in the browser. Angular, backend endpoints, database setup, API responses/game IDs, and backend unit tests are intentionally outside this implementation's agreed scope.

The user also requested session persistence: an unfinished game survives refresh; completion removes the saved active game while retaining the session scoreboard. Option A from the document is used: undo is disabled after a win or draw.

## Requirement checklist

| Requirement | Result / evidence |
| --- | --- |
| Standard 3 × 3 board | Implemented as nine labeled buttons in a three-column grid |
| Click only empty cells; show X/O; lock occupied cells | UI disables occupied cells; reducer independently rejects occupied moves |
| X starts and turns alternate | Derived from ordered move history; tested |
| Invalid moves preserve state/turn | Occupied, wrong-player, fractional, and out-of-range submissions tested |
| Detect row, column, and diagonal wins | All eight combinations tested |
| Show winner and highlight winning cells | X and O UI victory tests; double-line win rule test |
| Prevent moves after completion | Reducer guard and disabled UI; terminal-state tests |
| Detect draw and show message | Full-game UI and rule tests, with all cells and undo locked |
| Win takes precedence on move nine | Explicit ninth-move double-diagonal test |
| Reset board/history/result; X starts; preserve scores | Rule and UI reset checks |
| Numbered history with player and one-based position | Ordered list renders move number, X/O, row, and column |
| Two-player undo removes one move and restores turn | Rule and UI tests, including restoration after remount |
| Computer undo removes the X/O pair | Rule and UI tests |
| Undo before computer response | Removes pending X move and cancels response; tested |
| Disable undo when empty or complete | UI and rule tests; Option A documented in README |
| Track X wins, O wins, and draws | Reducer completion updates; X/O/draw tests |
| Count each result once | Terminal actions rejected; StrictMode win/remount test confirms no duplicate count |
| Separate scoreboard reset | Preserves active moves; completed-game reset persists zero scores without recounting result |
| Both game modes and selected mode visible | Mode buttons use aria-pressed; changing mode starts a fresh board and preserves scores |
| Human X, computer O | Automatic O responses and human input lock during thinking; UI tests |
| Computer priority: win, block, center, corner, any | Individual priority tests; deterministic selection order |
| Computer chooses valid moves | Exhaustive traversal checks legal choices at reachable O-turn positions |
| Computer stops on game completion | Completed strategy tests and human-victory UI timer test |
| Undo/reset/mode switch cancel pending computer response | Separate timer-cancellation UI tests |
| Refresh restores an unfinished game and scores | Storage round-trip and React remount tests, including pending O turn |
| Completion removes saved game data | Win/draw UI and storage tests assert activeGame is omitted |
| Refresh after completion retains score but clears board | Win and draw remount tests |
| Storage failures handled | Invalid-schema/history tests; blocked-storage test and visible persistence-warning UI test |
| Responsive interface | Desktop two-column and <=760px stacked CSS implemented; visual verification remains outstanding |
| Accessible controls | Native buttons, accessible cell labels, focus styles, live status, reduced-motion CSS; DOM labels tested |
| Core tests and run instructions | Both test files and README provided |
| Overview, tech stack, assumptions, design decisions, limitations, AI notes | README includes all applicable frontend submission documentation |
| GitHub repository submission | Source is available locally; remote publication/submission has not been performed |

## Verification results

- `npm test`: **59 passed**, 2 test files.
- `npm run build`: strict TypeScript check and Vite production build passed.
- Production preview smoke check: HTML and its referenced JavaScript/CSS assets are checked over local HTTP.
- No game-logic defects were found in this review. Seven UI regression tests were added; README gained an explicit tech-stack section, and this missing validation report was restored.

## Limits and remaining submission work

This review does not claim real-browser end-to-end or visual verification. Previous Computer Use was blocked because the current browser URL could not be determined reliably. Automated interaction tests use jsdom. Refresh is simulated by unmounting/remounting React with session storage retained, not by an actual browser reload.

Before submission, visually check laptop/mobile layouts, click through both modes, test refresh once during an unfinished game and once after completion, and verify keyboard focus/navigation. Then publish the local source to the intended GitHub repository and submit its URL if required by the panel. A frontend-only submission intentionally differs from the original backend requirements and must retain the documented scope clarification.
