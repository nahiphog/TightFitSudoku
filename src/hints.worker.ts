import { getHint } from './logic/hints';
self.onmessage = (event: MessageEvent<{ id: number; layout: boolean[]; values: number[][]; masks?: number[] }>) => {
  const { id, layout, values, masks } = event.data;
  try { self.postMessage({ id, result: getHint(layout, values, masks) }); }
  catch { self.postMessage({ id, error: 'Unable to verify a logical hint. Please try again or check your entries.' }); }
};
