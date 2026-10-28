import './style.css';



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
    <a class="brand" href="./" aria-label="Tight Fit Sudoku home"><span class="brand-icon" aria-hidden="true">▦</span> tight fit<span class="brand-secondary"> / sudoku</span></a>
    <span class="header-note">A little structure. A lot of possibility.</span>
  </header>
  <main>
    <section class="intro" aria-labelledby="title">
      <div class="eyebrow"><span></span> THE PUZZLE WORKSPACE</div>
      <h1 id="title">Tight Fit Sudoku<span class="period">.</span></h1>
      <p>Every puzzle starts with a grid.</p>
    </section>
    <section class="workspace" aria-label="Sudoku board layout">
      <div class="board-area">
        <div class="board-heading"><span>COMPLETED GRID</span><span>6 × 6</span></div>
        <div class="board" role="img" aria-label="Empty 6 by 6 Sudoku grid. Six rectangular regions, each 2 rows high and 3 columns wide.">
          ${regions.flatMap((row, r) => row.map((region, c) => `<div class="cell region-${region}${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}" data-region="${region}" aria-hidden="true"><span>${region}</span></div>`)).join('')}
        </div>
        <div class="board-caption" aria-live="polite"><span class="status-dot"></span> <span id="generation-status">18 slashes · 3 per row, column & region</span></div>
      </div>
      <div class="board-area puzzle-area">
        <div class="board-heading"><span>FINAL PUZZLE</span><span>UNIQUE SOLUTION</span></div>
        <div class="board puzzle-board" role="img" aria-label="Empty 6 by 6 Sudoku grid. Six rectangular regions, each 2 rows high and 3 columns wide.">
          ${regions.flatMap((row, r) => row.map((region, c) => `<div class="cell region-${region}${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}" data-region="${region}" aria-hidden="true"><span>${region}</span></div>`)).join('')}
        </div>
        <div class="board-caption" id="puzzle-status" aria-live="polite">Digging a unique puzzle…</div>
      </div>
      <aside>
        <span class="step">01 / THE FOUNDATION</span>
        <h2>From a full grid.<br>To a unique puzzle.</h2>
        <p class="description">Generate a completed grid and a puzzle with exactly one solution. Digging removes a whole cell at a time, keeping its slash, until no remaining given cell can be removed without losing uniqueness.</p>
        <button class="generate" id="generate" type="button">Generate <span aria-hidden="true">↗</span></button>
        <div class="stats"><div><strong>36</strong><span>CELLS</span></div><div><strong>6</strong><span>REGIONS</span></div><div><strong>2 × 3</strong><span>PER REGION</span></div></div>
        <div class="layout-label">REGION MAP</div>
        <div class="mini-map" aria-label="Region map: 111222, 111222, 333444, 333444, 555666, 555666">${regions.map(row => `<div>${row.map(n => `<span class="map-${n}">${n}</span>`).join('')}</div>`).join('')}</div>
        <label class="toggle-row"><span>Show region labels</span><input id="labels" type="checkbox" role="switch" /><span class="switch" aria-hidden="true"></span></label>
        <p class="aside-note">The starting point for your maker & solver.</p>
      </aside>
    </section>
    <footer><span>ROOM FOR A DIFFERENT KIND OF SUDOKU.</span><span>Made to fit.</span></footer>
  </main>
`;

document.querySelector<HTMLInputElement>('#labels')!.addEventListener('change', (event) => {
  document.querySelectorAll('.board').forEach(board => board.classList.toggle('show-labels', (event.target as HTMLInputElement).checked));
});

let slashes: boolean[] | undefined;
let generation = 0;
const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
const button = document.querySelector<HTMLButtonElement>('#generate')!;
const status = document.querySelector('#generation-status')!;
const puzzleStatus = document.querySelector('#puzzle-status')!;

function render(board: Element, values: number[][], layout: boolean[], title: string): void {
  board.querySelectorAll<HTMLDivElement>('.cell').forEach((cell, i) => {
    cell.classList.toggle('slashed', layout[i]);
    cell.innerHTML = (layout[i] ? '<svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>' : '') + `<span class="region-label">${regions[Math.floor(i / 6)][i % 6]}</span>` + values[i].map((digit, half) => `<b class="digit ${layout[i] ? half === 0 ? 'upper' : 'lower' : 'single'}">${digit}</b>`).join('');
  });
  const contents = values.map((digits, i) => `row ${Math.floor(i / 6) + 1} column ${i % 6 + 1}: ${digits.length === 2 ? `${digits[0]} above slash, ${digits[1]} below` : digits[0] ?? (layout[i] ? 'empty slashed cell' : 'empty cell')}`);
  board.setAttribute('aria-label', `${title}. ${contents.join('; ')}.`);
}

function generate(): void {
  button.disabled = true;
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
  document.querySelector('.workspace')!.setAttribute('aria-busy', 'false');
}

worker.onmessage = (event: MessageEvent<{ slashes: boolean[]; completed: number[][]; puzzle: number[][]; error?: string }>) => {
  if (event.data.error) { failed(); return; }
  const { completed, puzzle } = event.data;
  slashes = event.data.slashes;
  generation++;
  render(document.querySelector('.board')!, completed, slashes, 'Completed Tight Fit Sudoku');
  render(document.querySelector('.puzzle-board')!, puzzle, slashes, 'Final Tight Fit Sudoku puzzle with exactly one solution');
  const givens = puzzle.filter(digits => digits.length).length;
  status.textContent = `Grid ${generation} · 54 digits · 1–9 in every unit`;
  puzzleStatus.textContent = `${givens} given cells · ${36 - givens} removed · unique solution`;
  button.disabled = false;
  button.innerHTML = 'Generate <span aria-hidden="true">↗</span>';
  document.querySelector('.workspace')!.setAttribute('aria-busy', 'false');
};
worker.onerror = failed;
button.addEventListener('click', generate);
generate();


