import { generateSlashes } from './slashes';
import { solveGrid, digGrid } from './solver';

self.onmessage = (event: MessageEvent<boolean[] | undefined>) => {
  try {
    let slashes: boolean[];
    let completed: number[][] | null;
    do {
      slashes = generateSlashes(event.data);
      completed = solveGrid(slashes);
    } while (!completed);
    const puzzle = digGrid(slashes, completed);
    self.postMessage({ slashes, completed, puzzle });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Generation failed.' });
  }
};
