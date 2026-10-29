import { createModel, digits } from './logic/board';
import { techniqueInfo } from './logic/catalog';
import type { Walkthrough } from './logic/walkthrough';

export function mountWalkthrough(host: HTMLElement, layout: boolean[], original: number[][], walk: Walkthrough): void {
  const model = createModel(layout), last = walk.frames.length - 1;
  let current = 0;
  host.innerHTML = `
    <div class="walk-title"><div class="eyebrow">THE SOLVE PATH</div><h2>Solution walkthrough</h2><p>From the original givens to the completed grid. Browsing these steps leaves your puzzle entries unchanged.</p></div>
    <div class="walk-stats" aria-label="Walkthrough difficulty"><div><span>DIFFICULTY RATING</span><strong>${walk.rating.toLocaleString()}</strong><small>${walk.level}</small></div><div><span>HARDEST TECHNIQUE</span><strong class="hardest"></strong></div><div><span>TOTAL STEPS</span><strong>${last}</strong><small>${walk.bruteUses} Brute Force uses (+${(walk.bruteUses * 10000).toLocaleString()})</small></div></div>
    <div class="walk-layout"><section class="walk-slide" aria-label="Interactive solution slide">
      <div class="board-heading"><span id="walk-counter"></span><span id="walk-points"></span></div>
      <div id="walk-board" class="board" role="img"></div>
      <div class="walk-controls" role="group" aria-label="Walkthrough navigation"><button type="button" data-nav="first" aria-label="First step">&lt;&lt;</button><button type="button" data-nav="prev" aria-label="Previous step">&lt;</button><button type="button" data-nav="next" aria-label="Next step">&gt;</button><button type="button" data-nav="last" aria-label="Last step">&gt;&gt;</button></div>
      <input id="walk-slider" type="range" min="0" max="${last}" value="0" aria-label="Walkthrough step" />
      <div class="walk-explanation" aria-live="polite"><h3 id="walk-technique"></h3><p id="walk-description"></p><ul id="walk-actions"></ul><p id="walk-total"></p></div>
      <p class="walk-key">Gold: changed position · Pale gold: supporting cells · Red strike: removed candidate. Small digits are candidates.</p>
    </section><section class="walk-table-wrap" aria-label="All solution steps"><h3>Technique table</h3><p>Select a step number to jump to its slide.</p><table class="technique-table"><thead><tr><th scope="col">Technique</th><th scope="col">Step</th></tr></thead><tbody></tbody></table><p class="rating-note">Rating = sum of recorded step costs. Each Brute Force placement adds +10,000. <a href="/techniques/">View all active techniques and scores →</a></p></section></div>`;
  host.querySelector('.hardest')!.textContent = walk.hardest;
  const body = host.querySelector('tbody')!;
  const groups = new Map<string, number[]>();
  walk.frames.forEach((frame, i) => { if (frame.step) { const list = groups.get(frame.step.technique) ?? []; list.push(i); groups.set(frame.step.technique, list); } });
  for (const [name, steps] of groups) {
    const row = document.createElement('tr'), technique = document.createElement('td'), cell = document.createElement('td');
    technique.textContent = `${name} (+${techniqueInfo(name).score.toLocaleString()}/step)`;
    for (const index of steps) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(index); button.dataset.step = String(index); button.setAttribute('aria-label', `Step ${index}: ${name}`);
      button.addEventListener('click', () => show(index)); cell.append(button);
    }
    row.append(technique, cell); body.append(row);
  }
  const board = host.querySelector<HTMLElement>('#walk-board')!;
  const slider = host.querySelector<HTMLInputElement>('#walk-slider')!;
  const nav = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-nav]'));
  const show = (index: number): void => {
    current = Math.max(0, Math.min(last, index));
    const frame = walk.frames[current], step = frame.step;
    board.replaceChildren();
    const targets = new Set([...(step?.placements ?? []), ...(step?.removals ?? [])].map(p => p.slot));
    for (let cellIndex = 0; cellIndex < 36; cellIndex++) {
      const r = Math.floor(cellIndex / 6), c = cellIndex % 6;
      const cell = document.createElement('div');
      cell.className = `cell${c === 2 ? ' region-right' : ''}${r === 1 || r === 3 ? ' region-bottom' : ''}`;
      if (layout[cellIndex]) cell.innerHTML = '<svg class="slash" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>';
      for (const [slot, target] of model.slots.entries()) {
        if (target.cell !== cellIndex) continue;
        if (step?.focus.includes(slot)) cell.classList.add('walk-focus');
        const value = frame.values[cellIndex][target.half];
        const part = document.createElement('div');
        part.className = `walk-slot ${layout[cellIndex] ? target.half === 0 ? 'upper' : 'lower' : 'single'}${targets.has(slot) ? ' walk-target' : ''}${original[cellIndex]?.[target.half] ? ' walk-given' : ''}`;
        part.setAttribute('aria-label', `${target.name}: ${value || `candidates ${digits(frame.masks[slot]).join(', ')}`}`);
        if (value) { part.classList.add('walk-value'); part.textContent = String(value); }
        else {
          part.classList.add('walk-notes');
          const removed = step?.removals.filter(p => p.slot === slot).map(p => p.digit) ?? [];
          for (let d = 1; d <= 9; d++) {
            const note = document.createElement('i');
            if (frame.masks[slot] & (1 << (d - 1)) || removed.includes(d)) note.textContent = String(d);
            if (removed.includes(d)) note.className = 'removed-note';
            part.append(note);
          }
        }
        cell.append(part);
      }
      board.append(cell);
    }
    board.setAttribute('aria-label', `Walkthrough step ${current} of ${last}. ${step?.technique ?? 'Original puzzle'}. ${step?.explanation ?? 'Original givens before any solving steps.'}`);
    host.querySelector('#walk-counter')!.textContent = `STEP ${current} / ${last}`;
    host.querySelector('#walk-points')!.textContent = `+${frame.points.toLocaleString()} POINTS`;
    host.querySelector('#walk-technique')!.textContent = step?.technique ?? 'Original puzzle';
    host.querySelector('#walk-description')!.textContent = step?.explanation ?? 'Start with the original givens. Move forward to see each placement and candidate elimination.';
    host.querySelector('#walk-total')!.textContent = `Cumulative rating: ${frame.cumulative.toLocaleString()} / ${walk.rating.toLocaleString()}`;
    const actions = host.querySelector('#walk-actions')!; actions.replaceChildren();
    for (const [verb, moves] of [['Place', step?.placements ?? []], ['Remove candidate', step?.removals ?? []]] as const) for (const p of moves) {
      const li = document.createElement('li'); li.textContent = `${verb} ${p.digit} ${verb === 'Place' ? 'in' : 'from'} ${model.slots[p.slot].name}.`; actions.append(li);
    }
    slider.value = String(current);
    nav.forEach(button => { button.disabled = ['first', 'prev'].includes(button.dataset.nav!) ? current === 0 : current === last; });
    host.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
      const active = Number(button.dataset.step) === current;
      button.classList.toggle('current-step', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  };
  nav.forEach(button => button.addEventListener('click', () => show(button.dataset.nav === 'first' ? 0 : button.dataset.nav === 'last' ? last : current + (button.dataset.nav === 'prev' ? -1 : 1))));
  slider.addEventListener('input', () => show(Number(slider.value)));
  show(0);
}
