import './style.css';
import { checkGrid } from './check';
import type { HintResult } from './logic/hints';
import { mountWalkthrough } from './walkthrough-view';
import type { Walkthrough } from './logic/walkthrough';



const regions = [
  [1, 1, 1, 2, 2, 2],
  [1, 1, 1, 2, 2, 2],
  [3, 3, 3, 4, 4, 4],
  [3, 3, 3, 4, 4, 4],
  [5, 5, 5, 6, 6, 6],
  [5, 5, 5, 6, 6, 6],
] as const;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="Tight Fit Sudoku home"><img class="brand-icon" src="${import.meta.env.BASE_URL}logo.svg" alt="" width="33" height="33" /> tight fit<span class="brand-secondary"> / sudoku</span></a>
    <nav aria-label="Main navigation"><a href="${import.meta.env.BASE_URL}" aria-current="page">6×6</a><a href="${import.meta.env.BASE_URL}nine/">9×9</a><a href="${import.meta.env.BASE_URL}custom-build/">Custom build</a><a href="${import.meta.env.BASE_URL}techniques/">Techniques</a></nav>
  </header>
  <main>
    <section class="intro" aria-labelledby="title">
      <div class="eyebrow"><span></span> THE PUZZLE WORKSPACE</div>
      <h1 id="title">Tight Fit Sudoku<span class="period">.</span></h1>
      <p>Every puzzle starts with a grid.</p>
    </section>
    <section class="workspace" aria-label="Sudoku board layout">
      <div class="board-area puzzle-area">
        <div class="board-heading"><span>FINAL PUZZLE</span><span>UNIQUE SOLUTION</span></div>
        <div class="board puzzle-board" role="img" aria-label="Empty 6 by 6 Sudoku grid. Six rectangular regions, each 2 rows high and 3 columns wide.">
          ${regions.flatMap((row, r) => row.map((region, c) => `<div class="cell region-${region}${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}" data-region="${region}" aria-hidden="true"><span>${region}</span></div>`)).join('')}
        </div>
        <div class="board-caption" id="puzzle-status" aria-live="polite">Digging a unique puzzle…</div>
        <button id="check" class="check" type="button" disabled>Check</button>
        <button id="hint" class="check hint-button" type="button" disabled>Hint</button>
        <p id="check-status" role="status" aria-live="polite">Enter 1–9 in each empty space, then check your solution.</p>
        <section class="hint-panel" aria-label="Logical hint" hidden>
          <div class="hint-heading"><strong id="hint-title">Next logical step</strong><button id="dismiss-hint" type="button" aria-label="Dismiss hint">×</button></div>
          <p id="hint-message" role="status" aria-live="polite"></p>
          <ul id="hint-actions"></ul>
          <details id="hint-candidates"><summary>Candidate details before this step</summary><ul></ul></details>
          <button id="apply-hint" class="check" type="button" hidden>Apply step</button>
        </section>
      </div>
      <div class="board-area">
        <div class="board-heading"><span>COMPLETED GRID</span><span>6 × 6</span></div>
        <div class="board" role="img" aria-label="Empty 6 by 6 Sudoku grid. Six rectangular regions, each 2 rows high and 3 columns wide.">
          ${regions.flatMap((row, r) => row.map((region, c) => `<div class="cell region-${region}${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}" data-region="${region}" aria-hidden="true"><span>${region}</span></div>`)).join('')}
        </div>
        <div class="board-caption" aria-live="polite"><span class="status-dot"></span> <span id="generation-status">18 slashes · 3 per row, column & region</span></div>
      </div>
      <aside>
        <span class="step">01 / THE FOUNDATION</span>
        <h2>From a full grid.<br>To a unique puzzle.</h2>
        <p class="description">Generate a completed grid and a puzzle with exactly one solution. Both digits in every slashed cell are fixed clues. Digging removes only unslashed cells, until removing any remaining unslashed clue would break uniqueness.</p>
        <button class="generate" id="generate" type="button">Generate <span aria-hidden="true">↗</span></button>
        <p id="generated-rating" class="generated-rating" role="status">Difficulty rating will appear after generation.</p>
        <div class="stats"><div><strong>36</strong><span>CELLS</span></div><div><strong>6</strong><span>REGIONS</span></div><div><strong>2 × 3</strong><span>PER REGION</span></div></div>
        <div class="layout-label">REGION MAP</div>
        <div class="mini-map" aria-label="Region map: 111222, 111222, 333444, 333444, 555666, 555666">${regions.map(row => `<div>${row.map(n => `<span class="map-${n}">${n}</span>`).join('')}</div>`).join('')}</div>
        <label class="toggle-row"><span>Show region labels</span><input id="labels" type="checkbox" role="switch" /><span class="switch" aria-hidden="true"></span></label>
        <p class="aside-note">The starting point for your maker & solver.</p>
      </aside>
    </section>
    <section id="walkthrough" class="walkthrough" aria-label="Solution walkthrough" aria-busy="true"><p role="status">Generate a puzzle to see its solution walkthrough.</p></section>
    <footer><span>ROOM FOR A DIFFERENT KIND OF SUDOKU.</span><span>Technique adaptations from <a href="https://github.com/AImenes/sudokUI" target="_blank" rel="noreferrer">sudokUI</a> · <a href="${import.meta.env.BASE_URL}LICENSE.txt">GPL-3.0</a> · <a href="${import.meta.env.BASE_URL}tight-fit-source.tar.gz" download>Source</a></span></footer>
  </main>
`;

document.querySelector<HTMLInputElement>('#labels')!.addEventListener('change', (event) => {
  document.querySelectorAll('.board').forEach(board => board.classList.toggle('show-labels', (event.target as HTMLInputElement).checked));
});

let slashes: boolean[] | undefined;
let generation = 0;
let givens: number[][] = [];
const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
const button = document.querySelector<HTMLButtonElement>('#generate')!;
const status = document.querySelector('#generation-status')!;
const puzzleStatus = document.querySelector('#puzzle-status')!;
const checkButton = document.querySelector<HTMLButtonElement>('#check')!;
const checkStatus = document.querySelector('#check-status')!;
const hintButton = document.querySelector<HTMLButtonElement>('#hint')!;
const applyHint = document.querySelector<HTMLButtonElement>('#apply-hint')!;
const hintPanel = document.querySelector<HTMLElement>('.hint-panel')!;
const hintMessage = document.querySelector('#hint-message')!;
const hintWorker = new Worker(new URL('./hints.worker.ts', import.meta.url), { type: 'module' });
let hintId = 0;
let candidateMasks: number[] | undefined;
let latestHint: HintResult | undefined;
const walkthroughWorker = new Worker(new URL('./walkthrough.worker.ts', import.meta.url), { type: 'module' });
const walkthroughHost = document.querySelector<HTMLElement>('#walkthrough')!;
let walkthroughId = 0;
walkthroughWorker.onmessage = (event: MessageEvent<{ id: number; walkthrough?: Walkthrough; error?: string }>) => {
  if (event.data.id !== walkthroughId) return;
  walkthroughHost.setAttribute('aria-busy', 'false');
  if (event.data.walkthrough && slashes) {
    const walk = event.data.walkthrough;
    mountWalkthrough(walkthroughHost, slashes, givens, walk);
    document.querySelector('#generated-rating')!.textContent = `Difficulty rating: ${walk.rating.toLocaleString()} · ${walk.level} · ${walk.frames.length - 1} steps · Hardest: ${walk.hardest}`;
  } else {
    walkthroughHost.textContent = `Walkthrough unavailable: ${event.data.error ?? 'Please generate another puzzle.'}`;
    document.querySelector('#generated-rating')!.textContent = 'Difficulty rating unavailable for this generation.';
  }
};
walkthroughWorker.onerror = () => {
  walkthroughHost.setAttribute('aria-busy', 'false');
  walkthroughHost.textContent = 'The walkthrough could not be prepared. Generate another puzzle to retry.';
  document.querySelector('#generated-rating')!.textContent = 'Difficulty rating unavailable for this generation.';
};

function readEntries(): number[][] {
  const values = givens.map((digits, i) => digits.length ? [...digits] : Array<number>(slashes![i] ? 2 : 1).fill(0));
  document.querySelectorAll<HTMLInputElement>('.entry').forEach(input => {
    values[Number(input.dataset.cell)][Number(input.dataset.half)] = Number(input.value);
  });
  return values;
}
function clearHint(resetCandidates = true): void {
  hintId++;
  latestHint = undefined;
  if (resetCandidates) candidateMasks = undefined;
  hintPanel.hidden = true;
  applyHint.hidden = true;
  hintButton.disabled = button.disabled || !givens.length;
  hintButton.textContent = 'Hint';
  document.querySelectorAll('.hint-focus,.hint-target').forEach(cell => cell.classList.remove('hint-focus', 'hint-target'));
}

function render(board: Element, values: number[][], layout: boolean[], title: string): void {
  board.querySelectorAll<HTMLDivElement>('.cell').forEach((cell, i) => {
    cell.classList.toggle('slashed', layout[i]);
    cell.innerHTML = (layout[i] ? '<svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>' : '') + `<span class="region-label">${regions[Math.floor(i / 6)][i % 6]}</span>` + values[i].map((digit, half) => `<b class="digit ${layout[i] ? half === 0 ? 'upper' : 'lower' : 'single'}">${digit}</b>`).join('');
  });
  const contents = values.map((digits, i) => `row ${Math.floor(i / 6) + 1} column ${i % 6 + 1}: ${digits.length === 2 ? `${digits[0]} above slash, ${digits[1]} below` : digits[0] ?? (layout[i] ? 'empty slashed cell' : 'empty cell')}`);
  board.setAttribute('aria-label', `${title}. ${contents.join('; ')}.`);
  if (board.classList.contains('puzzle-board')) {
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'Playable Tight Fit Sudoku. Enter digits in empty cells.');
    board.querySelectorAll<HTMLDivElement>('.cell').forEach((cell, i) => {
      cell.removeAttribute('aria-hidden');
      cell.classList.remove('error');
      if (values[i].length) {
        cell.setAttribute('aria-label', `Row ${Math.floor(i / 6) + 1}, column ${i % 6 + 1}, given ${values[i].join(' and ')}`);
        return;
      }
      cell.removeAttribute('aria-label');
      for (let half = 0; half < (layout[i] ? 2 : 1); half++) {
        const input = document.createElement('input');
        input.className = `entry digit ${layout[i] ? half === 0 ? 'upper' : 'lower' : 'single'}`;
        input.type = 'text';
        input.inputMode = 'numeric';
        input.maxLength = 1;
        input.autocomplete = 'off';
        input.setAttribute('aria-label', `Row ${Math.floor(i / 6) + 1}, column ${i % 6 + 1}${layout[i] ? half === 0 ? ', above slash (smaller digit)' : ', below slash (larger digit)' : ''}`);
        input.dataset.cell = String(i);
        input.dataset.half = String(half);
        cell.append(input);
      }
    });
  }
}

function generate(): void {
  button.disabled = true;
  walkthroughId++;
  walkthroughHost.setAttribute('aria-busy', 'true');
  walkthroughHost.innerHTML = '<p role="status">Preparing the solution walkthrough…</p>';
  document.querySelector('#generated-rating')!.textContent = 'Calculating the solve path and difficulty rating…';
  clearHint();
  checkButton.disabled = true;
  document.querySelectorAll<HTMLInputElement>('.entry').forEach(input => { input.disabled = true; });
  checkStatus.textContent = 'Preparing a new puzzle…';
  button.textContent = 'Generating…';
  status.textContent = 'Generating a completed grid…';
  puzzleStatus.textContent = 'Digging and checking uniqueness…';
  document.querySelector('.workspace')!.setAttribute('aria-busy', 'true');
  worker.postMessage(slashes);
}

function failed(): void {
  button.disabled = false;
  button.textContent = 'Generate';
  status.textContent = 'Generation failed. Please try again.';
  puzzleStatus.textContent = 'No new puzzle generated.';
  checkButton.disabled = !givens.length;
  hintButton.disabled = !givens.length;
  document.querySelectorAll<HTMLInputElement>('.entry').forEach(input => { input.disabled = false; });
  checkStatus.textContent = 'Generation failed. You can continue the previous puzzle or try Generate again.';
  document.querySelector('.workspace')!.setAttribute('aria-busy', 'false');
  walkthroughHost.setAttribute('aria-busy', 'false');
  walkthroughHost.textContent = 'No new walkthrough was generated. Press Generate to try again.';
}

worker.onmessage = (event: MessageEvent<{ slashes: boolean[]; completed: number[][]; puzzle: number[][]; error?: string }>) => {
  if (event.data.error) { failed(); return; }
  const { completed, puzzle } = event.data;
  givens = puzzle;
  slashes = event.data.slashes;
  generation++;
  render(document.querySelector('.board:not(.puzzle-board)')!, completed, slashes, 'Completed Tight Fit Sudoku');
  render(document.querySelector('.puzzle-board')!, puzzle, slashes, 'Final Tight Fit Sudoku puzzle with exactly one solution');
  const givenCount = puzzle.filter(digits => digits.length).length;
  status.textContent = `Grid ${generation} · 54 digits · 1–9 in every unit`;
  puzzleStatus.textContent = `${givenCount} given cells · ${36 - givenCount} removed · unique solution`;
  button.disabled = false;
  checkButton.disabled = false;
  clearHint();
  checkStatus.textContent = 'Enter 1–9 in each empty space, then check your solution.';
  button.innerHTML = 'Generate <span aria-hidden="true">↗</span>';
  document.querySelector('.workspace')!.setAttribute('aria-busy', 'false');
  walkthroughWorker.postMessage({ id: walkthroughId, layout: slashes, puzzle });
};
worker.onerror = failed;
button.addEventListener('click', generate);
document.querySelector('.puzzle-board')!.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.classList.contains('entry')) return;
  input.value = input.value.replace(/[^1-9]/g, '').slice(-1);
  clearHint();
  document.querySelectorAll('.puzzle-board .error').forEach(cell => cell.classList.remove('error'));
  document.querySelectorAll('.entry[aria-invalid]').forEach(entry => entry.removeAttribute('aria-invalid'));
  checkStatus.textContent = 'Your entries have changed. Press Check to verify them.';
});
checkButton.addEventListener('click', () => {
  if (!slashes || !givens.length) return;
  const values = readEntries();
  document.querySelectorAll<HTMLInputElement>('.entry').forEach(input => {
    values[Number(input.dataset.cell)][Number(input.dataset.half)] = Number(input.value);
    input.removeAttribute('aria-invalid');
  });
  const result = checkGrid(slashes, values);
  document.querySelectorAll('.puzzle-board .cell').forEach((cell, i) => {
    const invalid = result.errors.includes(i);
    cell.classList.toggle('error', invalid);
    if (invalid) cell.querySelectorAll('.entry').forEach(input => input.setAttribute('aria-invalid', 'true'));
  });
  checkStatus.textContent = result.solved ? 'Solved! Every row, column, and region contains 1–9 exactly once, and all slash pairs are in order.' : result.errors.length ? `There are conflicts in ${result.errors.length} highlighted cells. Check repeated digits and make sure the smaller digit is above each slash.${result.empty ? ` ${result.empty} spaces are still empty.` : ''}` : `Not finished yet: ${result.empty} spaces are still empty. No rule conflicts so far.`;
});

function requestHint(): void {
  if (!slashes || !givens.length || button.disabled) return;
  clearHint(false);
  hintPanel.hidden = false;
  document.querySelector('#hint-title')!.textContent = 'Finding a logical step…';
  hintMessage.textContent = 'Checking your entries and the remaining candidates.';
  document.querySelector('#hint-actions')!.replaceChildren();
  document.querySelector('#hint-candidates')!.setAttribute('hidden', '');
  hintButton.disabled = true;
  hintButton.textContent = 'Thinking…';
  hintWorker.postMessage({ id: hintId, layout: slashes, values: readEntries(), masks: candidateMasks });
}
hintWorker.onmessage = (event: MessageEvent<{ id: number; result?: HintResult; error?: string }>) => {
  if (event.data.id !== hintId) return;
  hintButton.disabled = false;
  hintButton.textContent = 'Hint';
  const result = event.data.result;
  if (!result) {
    document.querySelector('#hint-title')!.textContent = 'Hint unavailable';
    hintMessage.textContent = event.data.error ?? 'Please try again.';
    return;
  }
  latestHint = result;
  document.querySelector('#hint-title')!.textContent = result.step?.technique ?? (result.status === 'solved' ? 'Puzzle solved' : result.status === 'conflict' ? 'Check your entries' : 'No logical step found');
  hintMessage.textContent = result.message;
  const actions = document.querySelector('#hint-actions')!;
  const cells = document.querySelectorAll('.puzzle-board .cell');
  const step = result.step;
  for (const target of result.targets) if (step?.focus.includes(target.slot)) cells[target.cell].classList.add('hint-focus');
  for (const action of [...(step?.placements ?? []).map(p => ({ ...p, verb: 'Place' })), ...(step?.removals ?? []).map(p => ({ ...p, verb: 'Remove' }))]) {
    const target = result.targets.find(t => t.slot === action.slot)!;
    const li = document.createElement('li');
    li.textContent = `${action.verb} ${action.digit} ${action.verb === 'Place' ? 'in' : 'from the candidates of'} ${target.name}.`;
    actions.append(li);
    cells[target.cell].classList.add('hint-target');
  }
  const details = document.querySelector('#hint-candidates')!;
  const list = details.querySelector('ul')!;
  list.replaceChildren();
  for (const target of result.targets) {
    const li = document.createElement('li'); li.textContent = `${target.name}: {${target.candidates.join(', ')}}`; list.append(li);
  }
  details.toggleAttribute('hidden', !step);
  applyHint.hidden = !step;
  applyHint.textContent = step?.placements.length ? 'Apply placement' : 'Apply candidate elimination';
};
hintWorker.onerror = () => {
  hintButton.disabled = button.disabled || !givens.length;
  hintButton.textContent = 'Hint';
  hintMessage.textContent = 'The hint could not be computed. Please try again.';
};
hintButton.addEventListener('click', requestHint);
document.querySelector('#dismiss-hint')!.addEventListener('click', () => clearHint(false));
applyHint.addEventListener('click', () => {
  if (!latestHint?.step) return;
  const { step, targets, masks } = latestHint;
  candidateMasks = [...masks];
  for (const p of step.removals) candidateMasks[p.slot] &= ~(1 << (p.digit - 1));
  for (const p of step.placements) {
    const target = targets.find(t => t.slot === p.slot)!;
    const input = document.querySelector<HTMLInputElement>(`.entry[data-cell="${target.cell}"][data-half="${target.half}"]`);
    if (input) input.value = String(p.digit);
    candidateMasks[p.slot] = 1 << (p.digit - 1);
  }
  document.querySelectorAll('.puzzle-board .error').forEach(cell => cell.classList.remove('error'));
  document.querySelectorAll('.entry[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  latestHint = undefined;
  applyHint.hidden = true;
  hintMessage.textContent += step.placements.length ? ' Placement applied. Press Hint for the next step.' : ' Candidate elimination saved. Press Hint for the next step; editing an entry recalculates candidates.';
  checkStatus.textContent = 'A logical step was applied. Press Check to verify your progress.';
});
generate();




