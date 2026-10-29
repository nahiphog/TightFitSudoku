import './style.css';
import { generateSlashes } from './slashes';
import { validateBuild } from './custom-build-engine';
import type { BuildResult } from './custom-build-engine';
import { mountWalkthrough } from './walkthrough-view';

document.querySelector('#app')!.innerHTML = `
<header class="header"><a class="brand" href="/"><span class="brand-icon" aria-hidden="true">▦</span> tight fit<span class="brand-secondary"> / sudoku</span></a><nav aria-label="Main navigation"><a href="/">Generate</a><a href="/custom-build/" aria-current="page">Custom build</a><a href="/techniques/">Techniques</a></nav></header>
<main class="custom-page"><div class="eyebrow">YOUR CLUES. YOUR PUZZLE.</div><h1>Custom build<span class="period">.</span></h1><p class="custom-intro">Choose where the clues go. Build a unique Tight Fit Sudoku around your pattern.</p>
<section class="custom-card" aria-label="Custom Tight Fit Sudoku grid"><div class="board-heading"><span>CHOOSE CLUES</span><span id="filled-count">0 clue cells selected</span></div><div id="custom-grid" class="board" role="group" aria-label="Choose whole-cell clue positions in a 6 by 6 Tight Fit grid"></div><p id="highlighted-cells" class="selected-cells" aria-live="polite">Highlighted cells: none</p>
<div class="custom-layout-row"><span>18 slashes · 3 per row, column & region</span><button id="new-layout" type="button" class="text-button">New slash layout</button></div>
<p class="custom-help">Click a cell to keep it as a given. A selected slashed cell keeps both digits. Unselected cells stay empty; the slash layout stays fixed during the search.</p>
<div class="difficulty-constraint" aria-label="Difficulty rating constraint"><label>Difficulty rating from <select id="difficulty-min"><option value="0">0</option><option value="300">300</option><option value="500">500</option><option value="800">800</option><option value="1000">1000</option><option value="2000">2000</option></select></label><span>to</span><label><span class="sr-only">Maximum difficulty rating</span><select id="difficulty-max" aria-label="Maximum difficulty rating"><option value="0">0</option><option value="500">500</option><option value="1000">1000</option><option value="2000">2000</option><option value="10000">10000</option><option value="100000" selected>100000</option><option value="500000">500000</option></select></label></div>
<div class="build-controls"><button id="build-now" class="check" type="button">Build now</button><button id="halt-build" class="check secondary-button" type="button" disabled>Halt build</button><button id="clear-highlights" class="text-button" type="button">Remove highlights</button><button id="select-all" class="text-button" type="button">Select all</button></div><p id="build-status" class="build-status" role="status" aria-live="polite">Choose the clue cells, then build.</p><p class="custom-help">Some clue patterns or rating ranges may have no matching puzzle. The search continues until it finds one or you press Halt build. <a href="/techniques/">About ratings →</a></p></section>
<section id="built-result" class="built-result" hidden aria-label="Built Tight Fit Sudoku puzzle"><div class="result-topline"><h2>Built puzzle</h2><details class="export-menu"><summary>Export</summary><div><button id="copy-built" type="button">Clipboard (JSON)</button><button id="image-built" type="button">Image (PNG)</button></div></details></div><p id="built-rating" class="generated-rating"></p><div class="built-board-area"><div id="built-grid" class="board" role="img" aria-label="Built Tight Fit puzzle"></div></div><section id="custom-walkthrough" class="walkthrough" aria-label="Solution walkthrough"></section></section>
<footer><span>MADE TO FIT YOUR IDEAS.</span><span><a href="/">Generate</a> · <a href="/techniques/">Techniques</a> · <a href="/tight-fit-source.tar.gz" download>Source</a></span></footer></main>`;

const grid = document.querySelector<HTMLElement>('#custom-grid')!;
const status = document.querySelector<HTMLElement>('#build-status')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-now')!;
const haltButton = document.querySelector<HTMLButtonElement>('#halt-build')!;
const resultPanel = document.querySelector<HTMLElement>('#built-result')!;
const minSelect = document.querySelector<HTMLSelectElement>('#difficulty-min')!;
const maxSelect = document.querySelector<HTMLSelectElement>('#difficulty-max')!;
const patternControls = ['new-layout', 'clear-highlights', 'select-all'].map(id => document.getElementById(id) as HTMLButtonElement);
let layout = generateSlashes(), selected = new Set<number>(), worker: Worker | undefined;
let building = false, attempts = 0, latest: BuildResult | undefined, version = 0;
const slashSVG = '<svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>';
const cellClass = (i: number): string => `cell${i % 6 === 2 ? ' region-right' : ''}${Math.floor(i / 6) === 1 || Math.floor(i / 6) === 3 ? ' region-bottom' : ''}`;
function invalidate(): void {
  latest = undefined; resultPanel.hidden = true;
  document.querySelector('#custom-walkthrough')!.replaceChildren();
}
function updateSelection(): void {
  const positions = [...selected].sort((a, b) => a - b);
  const digitCount = positions.reduce((n, i) => n + (layout[i] ? 2 : 1), 0);
  document.querySelector('#filled-count')!.textContent = `${positions.length} clue cells · ${digitCount} digits`;
  document.querySelector('#highlighted-cells')!.textContent = `Highlighted cells: ${positions.length ? positions.map(i => `R${Math.floor(i / 6) + 1}C${i % 6 + 1}`).join(', ') : 'none'}`;
  grid.querySelectorAll<HTMLButtonElement>('button').forEach((button, i) => {
    button.classList.toggle('highlighted', selected.has(i));
    button.setAttribute('aria-pressed', String(selected.has(i)));
  });
}
function renderPattern(): void {
  grid.replaceChildren();
  for (let i = 0; i < 36; i++) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `${cellClass(i)} custom-cell`;
    button.innerHTML = layout[i] ? slashSVG : '';
    button.setAttribute('aria-label', `Row ${Math.floor(i / 6) + 1}, column ${i % 6 + 1}${layout[i] ? ', slashed cell, two clue digits' : ', single clue digit'}`);
    button.addEventListener('click', () => {
      if (building) return;
      if (selected.has(i)) selected.delete(i); else selected.add(i);
      invalidate(); updateSelection(); status.textContent = 'Clue pattern updated. Press Build now to search.';
    });
    grid.append(button);
  }
  updateSelection();
}
function setBuilding(active: boolean): void {
  building = active; buildButton.disabled = active; haltButton.disabled = !active;
  minSelect.disabled = active; maxSelect.disabled = active;
  patternControls.forEach(button => { button.disabled = active; });
  grid.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = active; });
  grid.setAttribute('aria-busy', String(active));
}
function stop(): void { version++; worker?.terminate(); worker = undefined; setBuilding(false); }
function showResult(result: BuildResult): void {
  latest = result;
  const board = document.querySelector('#built-grid')!; board.replaceChildren();
  result.puzzle.forEach((digits, i) => {
    const cell = document.createElement('div'); cell.className = cellClass(i);
    cell.innerHTML = (result.layout[i] ? slashSVG : '') + digits.map((digit, half) => `<b class="digit ${result.layout[i] ? half === 0 ? 'upper' : 'lower' : 'single'}">${digit}</b>`).join('');
    cell.setAttribute('aria-hidden', 'true'); board.append(cell);
  });
  board.setAttribute('aria-label', `Built unique Tight Fit Sudoku. ${result.puzzle.map((ds, i) => `row ${Math.floor(i / 6) + 1} column ${i % 6 + 1}: ${ds.length ? ds.join(' above slash, ') : result.layout[i] ? 'empty slashed cell' : 'empty cell'}`).join('; ')}`);
  document.querySelector('#built-rating')!.textContent = `Difficulty rating: ${result.walkthrough.rating.toLocaleString()} · ${result.walkthrough.level} · ${result.walkthrough.frames.length - 1} steps · ${selected.size} given cells`;
  mountWalkthrough(document.querySelector<HTMLElement>('#custom-walkthrough')!, result.layout, result.puzzle, result.walkthrough);
  resultPanel.hidden = false;
}
buildButton.addEventListener('click', () => {
  const request = { layout: [...layout], selected: [...selected], minimum: Number(minSelect.value), maximum: Number(maxSelect.value) };
  const error = validateBuild(request);
  if (error) { status.textContent = error; return; }
  stop(); invalidate(); attempts = 0; setBuilding(true);
  const id = version;
  worker = new Worker(new URL('./custom.worker.ts', import.meta.url), { type: 'module' });
  status.textContent = `Building… seeking a unique puzzle rated ${request.minimum.toLocaleString()}–${request.maximum.toLocaleString()} with exactly ${selected.size} given cells.`;
  worker.onmessage = (event: MessageEvent<{ attempts?: number; unique?: number; lastRating?: number; result?: BuildResult; error?: string }>) => {
    if (id !== version) return;
    attempts = event.data.attempts ?? attempts;
    if (event.data.error) { stop(); status.textContent = `Build failed: ${event.data.error}`; return; }
    if (event.data.result) {
      const result = event.data.result; stop(); showResult(result);
      status.textContent = `Found a unique puzzle rated ${result.walkthrough.rating.toLocaleString()} in ${attempts.toLocaleString()} attempt${attempts === 1 ? '' : 's'}.`; return;
    }
    status.textContent = `Building… ${attempts.toLocaleString()} attempts checked · ${(event.data.unique ?? 0).toLocaleString()} unique puzzles found${event.data.lastRating !== undefined ? ` · Last rating: ${event.data.lastRating.toLocaleString()} (outside requested range)` : ''}.`;
  };
  worker.onerror = () => { if (id !== version) return; stop(); status.textContent = 'The builder could not finish. Try again or choose a different clue pattern.'; };
  worker.postMessage(request);
});
haltButton.addEventListener('click', () => { stop(); status.textContent = `Stopped after ${attempts.toLocaleString()} attempts. Your clue pattern is preserved.`; });
document.querySelector('#clear-highlights')!.addEventListener('click', () => { selected.clear(); invalidate(); updateSelection(); status.textContent = 'All highlights removed.'; });
document.querySelector('#select-all')!.addEventListener('click', () => { selected = new Set(Array.from({ length: 36 }, (_, i) => i)); invalidate(); updateSelection(); status.textContent = 'All cells selected. A complete grid has a difficulty rating of 0.'; });
document.querySelector('#new-layout')!.addEventListener('click', () => { layout = generateSlashes(layout); invalidate(); renderPattern(); status.textContent = 'New valid slash layout. Selected clue cells are preserved.'; });
for (const select of [minSelect, maxSelect]) select.addEventListener('change', () => { invalidate(); status.textContent = 'Difficulty range updated. Press Build now to search.'; });
document.querySelector('#copy-built')!.addEventListener('click', async () => {
  if (!latest) return;
  try { await navigator.clipboard.writeText(JSON.stringify({ type: 'tight-fit-sudoku', version: 1, size: 6, slashes: latest.layout, cells: latest.puzzle }, null, 2)); status.textContent = 'Puzzle copied as JSON, including the slash layout and clue digits.'; }
  catch { status.textContent = 'Clipboard access is unavailable. Use the image export instead.'; }
  document.querySelector('.export-menu')!.removeAttribute('open');
});
document.querySelector('#image-built')!.addEventListener('click', () => {
  if (!latest) return;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 660;
  const ctx = canvas.getContext('2d'); if (!ctx) { status.textContent = 'Image export is unavailable in this browser.'; return; }
  const margin = 18, size = 104;
  ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, 660, 660);
  ctx.strokeStyle = '#344c43'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  latest.puzzle.forEach((ds, i) => {
    const x = margin + i % 6 * size, y = margin + Math.floor(i / 6) * size;
    if (latest!.layout[i]) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + size, y); ctx.stroke(); }
    ctx.fillStyle = '#263e38'; ctx.font = '34px sans-serif';
    ds.forEach((d, half) => ctx.fillText(String(d), x + size * (latest!.layout[i] ? half === 0 ? .28 : .72 : .5), y + size * (latest!.layout[i] ? half === 0 ? .27 : .73 : .5)));
  });
  for (let i = 0; i <= 6; i++) {
    ctx.lineWidth = i % 3 === 0 ? 4 : 1; ctx.beginPath(); ctx.moveTo(margin + i * size, margin); ctx.lineTo(margin + i * size, margin + 6 * size); ctx.stroke();
    ctx.lineWidth = i % 2 === 0 ? 4 : 1; ctx.beginPath(); ctx.moveTo(margin, margin + i * size); ctx.lineTo(margin + 6 * size, margin + i * size); ctx.stroke();
  }
  const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'tight-fit-custom-build.png'; link.click();
  status.textContent = 'Puzzle image exported.'; document.querySelector('.export-menu')!.removeAttribute('open');
});
window.addEventListener('pagehide', () => worker?.terminate());
renderPattern();
