import type { Directive } from 'vue'

// Keeps a picture hidden until it has loaded and decoded, then lets the CSS fade it in
// (see .fade-image in app.scss). A picture already in the cache shows at once.
function reveal(img: HTMLImageElement) {
  const show = () => img.classList.add('is-loaded')
  if (!img.complete) return
  if (!img.naturalWidth) return show()
  img.decode().then(show, show)
}

export const vFadeIn: Directive<HTMLImageElement> = {
  mounted(img) {
    img.classList.add('fade-image')
    if (img.complete) img.classList.add('is-loaded')
    img.addEventListener('load', () => reveal(img))
    img.addEventListener('error', () => img.classList.add('is-loaded'))
  },
  updated(img) {
    // A new source hides the old picture until the new one is ready.
    if (!img.complete) img.classList.remove('is-loaded')
  },
}
