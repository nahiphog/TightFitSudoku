/** Generalized sudokUI AIC/forcing reasoning, GPL-3.0; see techniques.ts. */
import { bit, digits, size, unitName, propagate } from './board';
import type { Model } from './board';
import type { Step } from './techniques';

/** Each implication is a necessary consequence of a real Tight Fit constraint. */
export function chains(model: Model, masks: number[]): Step | null {
  const count = masks.length * 18;
  const edges: { to: number; reason: string }[][] = Array.from({ length: count }, () => []);
  const literal = (s: number, d: number, truth: boolean): number => (s * 9 + d - 1) * 2 + Number(truth);
  const add = (from: number, to: number, reason: string): void => { edges[from].push({ to, reason }); };
  const weak = (s: number, d: number, t: number, e: number, reason: string): void => {
    add(literal(s, d, true), literal(t, e, false), reason);
    add(literal(t, e, true), literal(s, d, false), reason);
  };
  for (let s = 0; s < masks.length; s++) {
    const ds = digits(masks[s]);
    if (ds.length < 2) continue;
    for (const d of ds) {
      for (const e of ds) if (d !== e) add(literal(s, d, true), literal(s, e, false), 'one digit per position');
      for (const p of model.peers[s]) if (masks[p] & bit(d)) add(literal(s, d, true), literal(p, d, false), 'shared row, column or region');
    }
    if (ds.length === 2) for (let i = 0; i < 2; i++) add(literal(s, ds[i], false), literal(s, ds[1 - i], true), 'only two candidates in this position');
  }
  model.units.forEach((unit, u) => {
    for (let d = 1; d <= 9; d++) {
      const positions = unit.filter(s => masks[s] & bit(d));
      if (positions.length === 2) for (let i = 0; i < 2; i++) add(literal(positions[i], d, false), literal(positions[1 - i], d, true), `only two places for ${d} in ${unitName(u)}`);
    }
  });
  for (const [a, b] of model.pairs) for (const d of digits(masks[a])) for (const e of digits(masks[b])) if (d >= e) weak(a, d, b, e, 'upper slash digit must be smaller');
  const describe = (node: number): string => {
    const candidate = Math.floor(node / 2), slot = Math.floor(candidate / 9), digit = candidate % 9 + 1;
    return `${model.slots[slot].name} ${node % 2 ? 'is' : 'is not'} ${digit}`;
  };
  for (let s = 0; s < masks.length; s++) if (size(masks[s]) > 1) for (const d of digits(masks[s])) for (const assumption of [true, false]) {
    const start = literal(s, d, assumption), target = start ^ 1;
    const parent = new Int32Array(count).fill(-1), reasons: string[] = Array(count).fill('');
    parent[start] = start;
    const queue = [start];
    for (let at = 0; at < queue.length && parent[target] < 0; at++) {
      for (const edge of edges[queue[at]]) if (parent[edge.to] < 0) {
        parent[edge.to] = queue[at]; reasons[edge.to] = edge.reason; queue.push(edge.to);
      }
    }
    if (parent[target] < 0) continue;
    const path: number[] = [];
    for (let node = target; node !== start; node = parent[node]) path.unshift(node);
    const explanation = `Assume ${describe(start)}. ${path.map(node => `Then ${describe(node)} (${reasons[node]}).`).join(' ')} This contradicts the assumption, so ${describe(target)}.`;
    return { technique: 'Alternating Inference Chain', explanation, placements: assumption ? [] : [{ slot: s, digit: d }], removals: assumption ? [{ slot: s, digit: d }] : [], focus: [...new Set([start, ...path].map(node => Math.floor(node / 18)))] };
  }
  return null;
}

/** Single-candidate forcing with a concrete contradiction; never a solved-grid lookup. */
export function forcing(model: Model, masks: number[]): Step | null {
  for (let s = 0; s < masks.length; s++) if (size(masks[s]) > 1) for (const d of digits(masks[s])) {
    const trial = [...masks]; trial[s] = bit(d);
    const contradiction = propagate(model, trial);
    if (contradiction) return {
      technique: 'Forcing contradiction',
      explanation: `Try ${d} in ${model.slots[s].name}. Repeatedly remove fixed digits from their peers, keep only ordered slash pairs, and fill digits with one remaining position. This leads to a contradiction: ${contradiction}. Therefore ${model.slots[s].name} cannot be ${d}.`,
      placements: [], removals: [{ slot: s, digit: d }], focus: [s],
    };
  }
  return null;
}
