type WorkerRequest =
  | { type: 'init'; seed: string }
  | { type: 'advance'; steps: number; stepSeconds: number };

let seed = 'chaisson-734221';
let ageSeconds = 1e-12;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    seed = message.seed;
    ageSeconds = 1e-12;
    self.postMessage({ type: 'ready', seed, ageSeconds });
    return;
  }

  ageSeconds += message.steps * message.stepSeconds;
  self.postMessage({ type: 'state', seed, ageSeconds });
};

export {};
