import { buildWalkthrough } from './logic/walkthrough';
self.onmessage = (event: MessageEvent<{ id: number; layout: boolean[]; puzzle: number[][] }>) => {
  const { id, layout, puzzle } = event.data;
  try { self.postMessage({ id, walkthrough: buildWalkthrough(layout, puzzle) }); }
  catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Walkthrough unavailable.' }); }
};
