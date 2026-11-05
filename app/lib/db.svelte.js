// Whether the records have arrived. The indexes themselves are plain objects in index.js.
import { loadRecords } from './data.js'
import { fill } from './index.js'

export const db = $state({ /** @type {'loading' | 'ready' | 'failed'} */ status: 'loading' })

export async function load() {
  try {
    fill(await loadRecords())
    db.status = 'ready'
  } catch (error) {
    console.error(error)
    db.status = 'failed'
  }
}
