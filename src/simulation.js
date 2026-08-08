const chunkUrls = Array.from({ length: 6 }, (_, index) =>
  new URL(`./chunks/simulation-${index}.b64`, import.meta.url),
);

const encodedParts = await Promise.all(chunkUrls.map(async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load simulation source chunk: ${url}`);
  return (await response.text()).trim();
}));

const binary = atob(encodedParts.join(''));
const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
let source = new TextDecoder().decode(bytes);

// Blob-backed ES modules have no useful relative filesystem base, so point the
// original data import at its absolute GitHub Pages URL before executing it.
const dataUrl = new URL('./data.js', import.meta.url).href;
source = source.replace("from './data.js';", `from ${JSON.stringify(dataUrl)};`);

const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try {
  await import(moduleUrl);
} finally {
  URL.revokeObjectURL(moduleUrl);
}
