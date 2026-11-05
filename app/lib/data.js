// The static files the site reads. Each is fetched once, when a page first needs it.

/**
 * Fetch a gzipped file. The dev server may hand it over already decoded, so the magic bytes decide
 * whether anything is left to decompress.
 * @param {URL} url
 * @returns {Promise<Uint8Array>}
 */
async function readGz(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url.pathname}: ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** The Unicode records and the stroke codes. @returns {Promise<import('./index.js').Records>} */
export const loadRecords = async () => JSON.parse(new TextDecoder().decode(await readGz(new URL('../data/jurchen.json.gz', import.meta.url))))

/** @type {Promise<Uint8Array> | null} */
let shapes = null
/** The pen lines the drawing pad compares with. */
export const loadShapes = () => (shapes ??= readGz(new URL('../data/jurchen-shapes.bin.gz', import.meta.url)))
