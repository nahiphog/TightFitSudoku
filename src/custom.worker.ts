import { buildAttempt, validateBuild } from './custom-build-engine';
import type { BuildRequest } from './custom-build-engine';
self.onmessage = (event: MessageEvent<BuildRequest>) => {
  const request = event.data;
  const error = validateBuild(request);
  if (error) { self.postMessage({ error }); return; }
  let attempts = 0, unique = 0;
  let lastRating: number | undefined;
  const batch = (): void => {
    try {
      for (let i = 0; i < 3; i++) {
        attempts++;
        const attempt = buildAttempt(request);
        if (attempt.unique) { unique++; lastRating = attempt.rating; }
        if (attempt.result) { self.postMessage({ attempts, unique, result: attempt.result }); return; }
      }
      self.postMessage({ attempts, unique, lastRating });
      setTimeout(batch, 0);
    } catch (error) {
      self.postMessage({ attempts, error: error instanceof Error ? error.message : 'Unable to build a puzzle.' });
    }
  };
  batch();
};
