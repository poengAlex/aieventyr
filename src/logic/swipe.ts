import type { Directive } from 'vue'

// A sideways swipe with a finger: `v-swipe="(direction) => …"` gets 1 for a swipe to the
// left (on to the next) and -1 for a swipe to the right (back). The element follows the
// finger a little while it moves, so the swipe is felt. Up and down are left to the
// browser, so the page still scrolls, and a mouse is left alone (it has buttons and keys).
// A swipe never counts as a click, so swiping a link does not follow it.
type SwipeHandler = (direction: 1 | -1) => void

interface SwipeState {
  handler: SwipeHandler
  id: number | null
  x: number
  y: number
  time: number
  dragging: boolean
  swallowClick: boolean
  cleanup: () => void
}

const states = new WeakMap<HTMLElement, SwipeState>()
const DISTANCE = 50 // px to count as a swipe
const FLICK = 0.4 // px/ms: a quick flick counts even when shorter
const FOLLOW = 0.35 // how far the element follows the finger

function settle(el: HTMLElement) {
  el.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out'
  el.style.transform = ''
  el.style.opacity = ''
  window.setTimeout(() => (el.style.transition = ''), 220)
}

export const vSwipe: Directive<HTMLElement, SwipeHandler> = {
  mounted(el, binding) {
    const state: SwipeState = {
      handler: binding.value,
      id: null,
      x: 0,
      y: 0,
      time: 0,
      dragging: false,
      swallowClick: false,
      cleanup: () => {},
    }

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || state.id !== null) return
      state.id = event.pointerId
      state.x = event.clientX
      state.y = event.clientY
      state.time = event.timeStamp
      state.dragging = false
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== state.id) return
      const dx = event.clientX - state.x
      const dy = event.clientY - state.y
      if (!state.dragging) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        state.dragging = true
        el.style.transition = ''
      }
      el.style.transform = `translateX(${dx * FOLLOW}px)`
      el.style.opacity = String(Math.max(0.5, 1 - Math.abs(dx) / 600))
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== state.id) return
      state.id = null
      if (!state.dragging) return
      state.dragging = false
      const dx = event.clientX - state.x
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - state.time)
      settle(el)
      // The click the browser may send after the finger lifts is not a tap.
      state.swallowClick = true
      window.setTimeout(() => (state.swallowClick = false), 400)
      if (Math.abs(dx) >= DISTANCE || (Math.abs(dx) >= 20 && speed >= FLICK)) {
        state.handler(dx < 0 ? 1 : -1)
      }
    }
    const cancel = (event: PointerEvent) => {
      if (event.pointerId !== state.id) return
      state.id = null
      if (state.dragging) settle(el)
      state.dragging = false
    }
    const click = (event: MouseEvent) => {
      if (!state.swallowClick) return
      state.swallowClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    el.style.touchAction = 'pan-y pinch-zoom'
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    el.addEventListener('click', click, true)
    state.cleanup = () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
      el.removeEventListener('click', click, true)
    }
    states.set(el, state)
  },
  updated(el, binding) {
    const state = states.get(el)
    if (state) state.handler = binding.value
  },
  unmounted(el) {
    states.get(el)?.cleanup()
    states.delete(el)
  },
}
