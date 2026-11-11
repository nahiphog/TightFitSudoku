import { generateNineGrid } from './nine-grid';

self.onmessage = () => {
  try { self.postMessage(generateNineGrid()); }
  catch { self.postMessage({ error: 'Generation failed. Please try again.' }); }
};
