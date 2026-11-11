import './style.css';
import type { generateNineGrid } from './nine-grid';

document.querySelector('#app')!.innerHTML = `
<header class="header"><a class="brand" href="${import.meta.env.BASE_URL}"><img class="brand-icon" src="${import.meta.env.BASE_URL}logo.svg" alt="" width="33" height="33" /> tight fit<span class="brand-secondary"> / sudoku</span></a>
<nav aria-label="Main navigation"><a href="${import.meta.env.BASE_URL}">6×6</a><a href="${import.meta.env.BASE_URL}nine/" aria-current="page">9×9</a><a href="${import.meta.env.BASE_URL}custom-build/">Custom build</a><a href="${import.meta.env.BASE_URL}techniques/">Techniques</a></nav></header>
<main><div class="intro"><div class="eyebrow">THE NINE BY NINE VARIANT</div><h1>Tight Fit Sudoku 9×9<span class="period">.</span></h1>
<p>Use 1–10 once in each row, column, and 3×3 region. Each has one slashed cell, with the smaller number above the slash.</p></div>
<button class="generate" id="nine-generate">Generate <span aria-hidden="true">↗</span></button>
<p id="nine-status" role="status"></p>
<div class="workspace" id="nine-workspace" hidden>
  <section class="board-area"><h2>Final puzzle</h2><div class="board nine-board puzzle-board" id="nine-puzzle"></div>
    <button class="check" id="nine-check">Check</button><p id="check-status" role="status"></p></section>
  <section class="board-area"><details id="nine-reveal"><summary>Completed grid</summary><div class="board nine-board" id="nine-completed"></div></details></section>
</div></main>`;

const generate = document.querySelector<HTMLButtonElement>('#nine-generate')!;
const workspace = document.querySelector<HTMLElement>('#nine-workspace')!;
const puzzle = document.querySelector<HTMLElement>('#nine-puzzle')!;
const completed = document.querySelector<HTMLElement>('#nine-completed')!;
const status = document.querySelector('#nine-status')!;
const checkStatus = document.querySelector('#check-status')!;
const reveal = document.querySelector<HTMLDetailsElement>('#nine-reveal')!;
const worker = new Worker(new URL('./nine.worker.ts', import.meta.url), { type: 'module' });
type Result = ReturnType<typeof generateNineGrid>;
let current: Result | undefined;

function render(board: HTMLElement, cells: number[][], slashes: boolean[]) {
  board.replaceChildren();
  cells.forEach((values, i) => {
    const row = Math.floor(i / 9), col = i % 9;
    const cell = document.createElement('div');
    cell.className = `cell${col === 2 || col === 5 ? ' region-right' : ''}${row === 2 || row === 5 ? ' region-bottom' : ''}`;
    if (slashes[i]) cell.innerHTML = '<svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>';
    if (values.length) {
      values.forEach((value, half) => {
        const digit = document.createElement('b');
        digit.className = `digit ${slashes[i] ? half ? 'lower' : 'upper' : 'single'}`;
        digit.textContent = String(value);
        cell.append(digit);
      });
    } else {
      const input = document.createElement('input');
      input.className = 'entry digit single';
      input.inputMode = 'numeric';
      input.maxLength = 2;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        input.removeAttribute('aria-invalid');
        cell.classList.remove('error');
        checkStatus.textContent = '';
      });
      cell.append(input);
    }
    board.append(cell);
  });
}

function start() {
  generate.disabled = true;
  workspace.hidden = true;
  status.textContent = 'Generating and checking uniqueness…';
  worker.postMessage(null);
}
worker.onmessage = (event: MessageEvent<Result | { error: string }>) => {
  generate.disabled = false;
  if ('error' in event.data) { status.textContent = event.data.error; return; }
  current = event.data;
  render(puzzle, current.puzzle, current.slashes);
  render(completed, current.completed, current.slashes);
  reveal.open = false;
  checkStatus.textContent = '';
  workspace.hidden = false;
  status.textContent = `${current.puzzle.filter(cell => cell.length).length} given cells · 9 locked slashes · unique solution`;
};
worker.onerror = () => {
  generate.disabled = false;
  status.textContent = 'The generator could not start. Reload the page to try again.';
};
generate.addEventListener('click', start);
document.querySelector('#nine-check')!.addEventListener('click', () => {
  if (!current) return;
  let empty = 0, incorrect = 0;
  Array.from(puzzle.children).forEach((cell, i) => {
    const input = cell.querySelector('input');
    if (!input) return;
    const wrong = input.value !== '' && input.value !== String(current!.completed[i][0]);
    if (input.value === '') empty++;
    if (wrong) incorrect++;
    cell.classList.toggle('error', wrong);
    if (wrong) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
  checkStatus.textContent = incorrect ? `${incorrect} incorrect entries highlighted.` : empty ? `All entries are correct so far. ${empty} cells remain.` : 'Solved! Every unit contains 1–10 exactly once.';
});
start();
