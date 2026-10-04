// Fetches pictures before they are needed, so they are there when the reader scrolls to
// them. It waits until the pictures in view under root have loaded, then asks for the list
// (so it can start from where the reader is by then) and fetches them one at a time. Each
// is fetched with the same srcset and sizes as the page uses, so the browser picks the
// same file and the page finds it in the cache. Returns a function that stops it.
export interface PreloadPicture {
  src: string
  srcset?: string | undefined
  sizes?: string | undefined
}

export function preloadPictures(root: HTMLElement, pictures: () => PreloadPicture[]) {
  let stopped = false
  // Kept so the browser holds on to the files until the page has used them.
  const held: HTMLImageElement[] = []
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return () => {}

  async function run() {
    // A frame first, so the page has been laid out and scrolled to where the reader is.
    await new Promise(requestAnimationFrame)
    await picturesInView(root)
    if (stopped) return
    for (const picture of pictures()) {
      if (stopped) return
      await fetchPicture(picture, held)
    }
  }

  void run()
  return () => {
    stopped = true
    held.length = 0
  }
}

function picturesInView(root: HTMLElement) {
  const pending = [...root.querySelectorAll('img')].filter((img) => {
    if (img.complete) return false
    const rect = img.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight
  })
  return Promise.all(pending.map(settled))
}

function fetchPicture(picture: PreloadPicture, held: HTMLImageElement[]) {
  const img = new Image()
  img.decoding = 'async'
  img.fetchPriority = 'low'
  if (picture.sizes) img.sizes = picture.sizes
  if (picture.srcset) img.srcset = picture.srcset
  img.src = picture.src
  held.push(img)
  return settled(img)
}

function settled(img: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
  })
}
