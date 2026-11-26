// Drawing helpers the themes share: the same motifs as the Python style packs (styles/*/*.py), for plugin parts.

export const num = (n, k, d = 0) => { const v = parseFloat(n.getAttribute(k)); return Number.isFinite(v) ? v : d }
export const set = (n, attrs) => { for (const [k, v] of Object.entries(attrs)) v == null ? n.removeAttribute(k) : n.setAttribute(k, String(v)); return n }
/** set() on a part and on what it holds that paints the same way (a group of grid lines, an axis and its ticks). */
export const paint = (n, attrs) => {
  set(n, attrs)
  for (const k of Object.keys(attrs)) for (const d of n.querySelectorAll(`[${k}]:not(text):not(tspan)`)) if (d.closest('[data-role]') === n) set(d, { [k]: attrs[k] })
  return n
}

/** Parallel strokes as a fill (davinci.hatch_lines): 45°, falling to the left as a left hand draws (sign -1). */
export function hatch(ctx, { step = 4.2, sign = -1, stroke, width = 0.55, opacity = 0.5 } = {}) {
  return ctx.def(`hatch-${step}-${sign}-${String(stroke).replace(/\W/g, '')}-${opacity}`, id => ctx.make('pattern',
    { id, patternUnits: 'userSpaceOnUse', width: step, height: step, patternTransform: `rotate(${sign < 0 ? 45 : -45})` },
    [ctx.make('path', { d: `M0 0V${step}`, stroke, 'stroke-width': width, opacity })]))
}

/** The hand's tremor (hand.wobble): displaces the strokes of what it is applied to by a fraction of a unit. */
export function tremor(ctx, scale = 0.8) {
  // the region in user space: a box's share is nothing for a straight line (its box has no height), and it would vanish
  return ctx.def(`tremor-${scale}`, id => ctx.make('filter', { id, filterUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, [
    ctx.make('feTurbulence', { type: 'turbulence', baseFrequency: '0.07', numOctaves: 2, seed: 9, result: 'n' }),
    ctx.make('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale, xChannelSelector: 'R', yChannelSelector: 'G' })]))
}

/** A copy of a shape over it, filled with `fill` (hatching on a wash): same geometry, no outline, not a part itself. */
export function overlay(part, ctx, fill, extra = {}) {
  const o = part.cloneNode(false)
  for (const k of ['data-role', 'class', 'id', 'stroke', 'stroke-width', 'opacity', 'fill-opacity']) o.removeAttribute(k)
  set(o, { fill, stroke: 'none', 'pointer-events': 'none', ...extra })
  part.after(o)
  return o
}

/** Text in the style: its font and ink; a halo (a stroke under the glyphs) in the page's ground, or none. */
export function letter(part, { font, fill, halo, size }) {
  set(part, { 'font-family': font, fill })
  if (size) set(part, { 'font-size': size })
  if (part.getAttribute('paint-order') === 'stroke' || part.getAttribute('stroke')) set(part, { stroke: halo || null, 'stroke-opacity': halo ? 0.85 : null })
  for (const t of part.querySelectorAll('tspan')) if (t.getAttribute('fill')) t.removeAttribute('fill')
}

/** One brush-rack peak (guyutu.hump), its foot at (x, y), and three texture strokes (guyutu.cun). */
export const hump = (x, y, h, w) => `M${x - w} ${y}C${x - w * 0.72} ${y - h * 0.45} ${x - w * 0.42} ${y - h} ${x} ${y - h}`
  + `C${x + w * 0.42} ${y - h} ${x + w * 0.72} ${y - h * 0.45} ${x + w} ${y}Z`
export const cun = (x, y, h, w) => `M${x - w * 0.12} ${y - h * 0.9}q${-w * 0.25} ${h * 0.35} ${-w * 0.32} ${h * 0.75}`
  + `M${x + w * 0.18} ${y - h * 0.85}q${-w * 0.08} ${h * 0.3} ${-w * 0.05} ${h * 0.6}`
  + `M${x - w * 0.5} ${y - h * 0.38}q${-w * 0.1} ${h * 0.15} ${-w * 0.18} ${h * 0.3}`

/** The box of a rect part. */
export const rectBox = r => ({ x: num(r, 'x'), y: num(r, 'y'), w: num(r, 'width'), h: num(r, 'height') })

/** A thin mark (a Sankey node, a tick of a bar): a rect under 14 units across one way. Filled marks a label may sit on
 *  are painted pale in a theme, so its ink reads; thin ones can stay dark. */
export const thin = p => p.tagName.toLowerCase() === 'rect' && Math.min(num(p, 'width', 99), num(p, 'height', 99)) < 14

/** A drawn line (its fill none): a river, a road, a connector — painted by its stroke. */
export const stroked = p => {
  const tag = p.tagName.toLowerCase(), fill = p.getAttribute('fill')
  // a <line> has nothing to fill; a path or polyline with a stroke and no fill of its own is a line too
  return tag === 'line' || fill === 'none' || (!fill && !!p.getAttribute('stroke') && (tag === 'path' || tag === 'polyline'))
}

/** A group of strokes (a line-art icon), not a filled shape. */
export const isGroup = p => p.tagName.toLowerCase() === 'g'

/** The colour a part is drawn in: its stroke when it is a stroked line, else its fill. */
// (a white-filled ring — a timeline's dot — is its stroke's colour: its white fill is the paper showing through)
const PALE = /^(#fff|#ffffff|white|#f[a-f0-9]f[a-f0-9]f[a-f0-9])$/
export const paintOf = p => {
  const s = p.getAttribute('stroke'), f = p.getAttribute('fill')
  return s && s !== 'none' && (f === 'none' || p.tagName.toLowerCase() === 'line' || PALE.test(String(f || '').trim().toLowerCase())) ? s : f || s
}

const rgb = c => {
  const s = String(c || '').trim().toLowerCase(), h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/), f = s.match(/^rgba?\(([^)]+)\)/)
  if (h) { const x = h[1].length === 3 ? [...h[1]].map(d => d + d).join('') : h[1]; return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)) }
  return f ? f[1].split(',').slice(0, 3).map(Number) : null
}
const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
/** A colour on a scale moved onto the theme's own scale (light → dark `stops`), by its lightness: the order of the
 *  values is kept, as a sequential ramp orders them by lightness. A colour that can't be read stays. */
export function onRamp(colour, stops) {
  const c = rgb(colour); if (!c) return colour
  const t = 1 - (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255, k = Math.min(stops.length - 1.0001, t * (stops.length - 1)), i = Math.floor(k), f = k - i
  const a = rgb(stops[i]), b = rgb(stops[i + 1])
  return hex(a.map((v, j) => v + (b[j] - v) * f))
}

/** Two colours mixed: k of the way from a to b. */
export const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return x && y ? hex(x.map((v, j) => v + (y[j] - v) * k)) : a }
/** A mark on a TWO-SIDED scale (role diverging) onto the theme's own [low, middle, high]: by its place, data-value
 *  −1 … 1 (0 the middle), so its side and its distance from the middle are kept. Null without a place. */
export function onDiverging(part, [lo, mid, hi]) {
  const v = parseFloat(part.getAttribute('data-value'))
  return Number.isFinite(v) ? mix(mid, v < 0 ? lo : hi, Math.min(1, Math.abs(v))) : null
}

const NAMED = { black: [0, 0, 0], white: [255, 255, 255], gray: [128, 128, 128], grey: [128, 128, 128] }
/** A plain ink — black, white or a grey — as an [0..1] lightness; null for a colour someone chose (or no colour). */
export function plainInk(colour) {
  const s = String(colour || '').trim().toLowerCase(), c = NAMED[s] || rgb(s)
  if (!c || c.some(v => !Number.isFinite(v)) || Math.max(...c) - Math.min(...c) > 24) return null
  return (c[0] + c[1] + c[2]) / 765
}

/** A shape of the editor's own, with no role (theme.native): its plain inks onto the theme's — a dark one its ink, a
 *  white one its paper (a fill) or its ink's light counterpart `light` (a stroke, on a dark paper), a grey `mid`
 *  when given — and a chosen colour left as it is. */
export function inks(p, { ink, ground, light = ground, mid = null }) {
  for (const k of ['fill', 'stroke']) {
    const L = plainInk(p.getAttribute(k))
    if (L == null) continue
    p.setAttribute(k, L < 0.35 ? ink : L > 0.9 ? (k === 'fill' ? ground : light) : mid || p.getAttribute(k))
  }
}
