const partNames = [
  '00','01','02','03','04','05','06','07-0','07-1','08','09','10','11','12',
];

const buffers = await Promise.all(partNames.map(async name => {
  const url = new URL(`./gzparts/simulation-${name}.gzpart`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load simulation renderer segment: ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}));

const byteLength = buffers.reduce((sum, part) => sum + part.byteLength, 0);
const gzip = new Uint8Array(byteLength);
let offset = 0;
for (const part of buffers) {
  gzip.set(part, offset);
  offset += part.byteLength;
}

const decompressed = new Response(
  new Blob([gzip]).stream().pipeThrough(new DecompressionStream('gzip')),
);
let source = await decompressed.text();

// Blob-backed ES modules have no useful relative filesystem base, so point the
// data import at its absolute GitHub Pages URL before executing the renderer.
const dataUrl = new URL('./data.js', import.meta.url).href;
source = source.replace("from './data.js';", `from ${JSON.stringify(dataUrl)};`);

const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try {
  await import(moduleUrl);
} finally {
  URL.revokeObjectURL(moduleUrl);
}
