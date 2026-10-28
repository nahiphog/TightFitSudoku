import './style.css';
import { generateSlashes } from './slashes';
import { solveGrid } from './solver';

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
        <div class="board-heading"><span>YOUR CANVAS</span><span>6 × 6</span></div>
        <div class="board" role="img" aria-label="Empty 6 by 6 Sudoku grid. Six rectangular regions, each 2 rows high and 3 columns wide.">
          ${regions.flatMap((row, r) => row.map((region, c) => `<div class="cell region-${region}${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}" data-region="${region}" aria-hidden="true"><span>${region}</span></div>`)).join('')}
        </div>
        <div class="board-caption" aria-live="polite"><span class="status-dot"></span> <span id="generation-status">18 slashes · 3 per row, column & region</span></div>
      </div>
      <aside>
        <span class="step">01 / THE FOUNDATION</span>
        <h2>A tight fit.<br>Every digit in place.</h2>
        <p class="description">Every row, column, and outlined region contains 1–9 exactly once. Slashed cells hold two digits, with the smaller digit above the slash. Generate a fresh filled grid.</p>
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
  document.querySelector('.board')!.classList.toggle('show-labels', (event.target as HTMLInputElement).checked);
});

let slashes: boolean[] | undefined;
let generation = 0;
function generate(): void {
  let next: boolean[];
  let solution: number[][] | null;
  do {
    next = generateSlashes(slashes);
    solution = solveGrid(next);
  } while (!solution);
  slashes = next;
  generation++;
  document.querySelectorAll<HTMLDivElement>('.cell').forEach((cell, i) => {
    cell.classList.toggle('slashed', slashes![i]);
    cell.innerHTML = `<span class="region-label">${regions[Math.floor(i / 6)][i % 6]}</span>` + solution![i].map((digit, half) => `<b class="digit ${slashes![i] ? half === 0 ? 'upper' : 'lower' : 'single'}">${digit}</b>`).join('');
  });
  const contents = solution.map((digits, i) => `row ${Math.floor(i / 6) + 1} column ${i % 6 + 1}: ${digits.length === 2 ? `${digits[0]} above slash, ${digits[1]} below` : digits[0]}`);
  document.querySelector('.board')!.setAttribute('aria-label', `Filled Tight Fit Sudoku. ${contents.join('; ')}.`);
  document.querySelector('#generation-status')!.textContent = `Grid ${generation} · 54 digits · 1–9 in every unit`;
}
document.querySelector('#generate')!.addEventListener('click', generate);
generate();
