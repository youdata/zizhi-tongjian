// A blueprint as a page theme: white lines on a deep blue ground, shapes as outlines with hatching, a drafting hand,
// a yellow pencil for figures and targets, corner marks on frames. The test of a DARK ground: every theme before it
// assumed light paper, dark ink and pale fills, and this one turns them over (white is ink here; the ground is blue).
import { set, paint, overlay, letter, rectBox, thin, paintOf, onRamp, isGroup, stroked, hatch, inks, onDiverging, mix } from './marks.js'

export const tokens = {
  BLUE: '#1f4f8a',        // the ground
  DEEP: '#183f70',        // a filled shape's ground, a shade under the page
  LINE: '#eef5fd',        // the white of the lines and the lettering
  FAINT: '#9dbfe3',       // construction lines: grids, tracks, frames
  MID: '#6c98cc',
  CYAN: '#a9dcff', CHALK: '#ffe28a', SALMON: '#ffb4a2',   // coloured pencils, sparingly
  HAND: "'Liberation Sans Narrow', 'Nimbus Sans Narrow', 'Arial Narrow', 'Noto Sans CJK SC', sans-serif",
  TITLE: "'Oswald', 'Liberation Sans Narrow', 'Noto Sans CJK SC', sans-serif",
}
const T = tokens
// series: white, cyan, yellow, salmon, and each its own hatching angle, so colour is never the only difference
const SERIES = [T.LINE, T.CYAN, T.CHALK, T.SALMON, T.FAINT]
const ANGLE = [45, -45, 0, 90]

// a filled shape as the draughtsman draws it: an outline in its series' colour, hatched inside at its own angle
function drawn(p, c, { a = 0.12, step = 4.5, edge = 1 } = {}) {
  const { colour, i, ground } = c.series(p.getAttribute('fill'))
  // the plugin's white is the ground here: a blue plate edged in white, not hatched
  if (ground) return set(p, { fill: T.BLUE, 'fill-opacity': null, opacity: null, stroke: T.LINE, 'stroke-width': edge || 0.8 })
  set(p, { fill: colour, 'fill-opacity': a, opacity: null, stroke: colour, 'stroke-width': edge, 'stroke-opacity': 0.9 })
  const ang = ANGLE[((i % 4) + 4) % 4]
  overlay(p, c, c.def(`bp-hatch-${step}-${ang}-${colour.slice(1)}`, id => c.make('pattern',
    { id, patternUnits: 'userSpaceOnUse', width: step, height: step, patternTransform: `rotate(${ang})` },
    [c.make('path', { d: `M0 0V${step}`, stroke: colour, 'stroke-width': 0.6, opacity: 0.55 })])))
}

// four corner marks on a frame, as on a drawing sheet
function corners(p, c) {
  const { x, y, w, h } = rectBox(p), k = Math.min(10, w / 6, h / 6)
  if (p.tagName.toLowerCase() !== 'rect' || !(w > 30 && h > 30)) return
  const d = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]
    .map(([px, py, sx, sy]) => `M${px + sx * 3} ${py + sy * (3 + k)}V${py + sy * 3}H${px + sx * (3 + k)}`).join('')
  p.after(c.make('path', { d, fill: 'none', stroke: T.LINE, 'stroke-width': 0.9, 'pointer-events': 'none' }))
}

// colours of the theme itself: what a sweep must not turn again
const OWN = new Set([...Object.values(T), ...SERIES].filter(v => v.startsWith('#')).map(v => v.toLowerCase()))
const lum = col => {
  const s = String(col || '').trim().toLowerCase(), h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (!h) return null
  const x = h[1].length === 3 ? [...h[1]].map(d => d + d).join('') : h[1]
  const [r, g, b] = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// a light-paper colour turned over for the blue ground: lettering white, pale plates the ground, dark lines white, the
// rest a middle blue (the theme's own colours, and what isn't a plain colour, kept)
function turn(n, k) {
  const v = n.getAttribute(k)?.trim().toLowerCase(), L = lum(v)
  if (L == null || OWN.has(v) || n.closest('image, svg svg')) return
  const text = /^(text|tspan)$/i.test(n.tagName)
  n.setAttribute(k, text ? (k === 'fill' ? T.LINE : T.BLUE) : L > 0.82 ? T.BLUE : L < 0.35 ? T.LINE : T.MID)
}

// cool colours to the blues, warm ones to salmon; the deeper, the brighter (on a dark ground light is "more")
const diverge = col => {
  const m = String(col || '').trim().toLowerCase().match(/^#([0-9a-f]{6})$/)
  if (!m) return col
  const [r, , b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  return onRamp(col, [T.BLUE, r > b ? T.SALMON : T.CYAN])
}

export const blueprint = {
  id: 'blueprint', label: 'Blueprint', tokens, series: SERIES, font: T.HAND, ground: T.BLUE, fonts: ['Oswald'],
  // a shape drawn in the editor itself, turned over: dark lines white, white plates the ground, greys the middle blue
  native: p => inks(p, { ink: T.LINE, ground: T.BLUE, light: T.LINE, mid: T.MID }),
  roles: {
    band: (p, c) => drawn(p, c, { a: 0.14, step: 6, edge: 0.8 }),
    area: (p, c) => drawn(p, c, { a: 0.1, step: 6, edge: 0 }),
    bar: (p, c) => { set(p, { rx: 0, ry: 0 }); drawn(p, c, { a: 0.14, step: 4, edge: 1 }) },
    // a box: a white one is a plate a shade under the page; a coloured one keeps its series, outlined and hatched
    node: (p, c) => thin(p) ? set(p, { fill: T.LINE, stroke: 'none' })
      : c.series(p.getAttribute('fill')).ground ? set(p, { fill: T.DEEP, 'fill-opacity': null, opacity: null, stroke: T.LINE, 'stroke-width': 1.1 })
        : drawn(p, c, { a: 0.12, step: 6, edge: 1 }),
    slice: (p, c) => drawn(p, c, { a: 0.16, step: 4.5, edge: 0.9 }),
    bubble: (p, c) => drawn(p, c, { a: 0.1, step: 5, edge: 1.2 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : drawn(p, c, { a: 0.3, step: 3.5, edge: 0.7 }),
    // a value on a scale: deep blue to pale, stopping short of white so white lettering still reads on the top step
    // a value on a two-sided scale: cyan chalk below the middle, salmon above, a faint chalk wash between
    diverging: p => { const fill = onDiverging(p, [T.CYAN, mix(T.BLUE, T.LINE, 0.22), T.SALMON]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), ['#234f86', '#5389c8', '#93bce8']), stroke: T.FAINT, 'stroke-width': 0.4 }),
    stripe: p => set(p, { fill: diverge(p.getAttribute('fill')) }),
    track: p => isGroup(p) ? paint(p, { stroke: T.FAINT, 'stroke-dasharray': '2 2' }) : set(p, { fill: 'none', stroke: T.FAINT, 'stroke-width': 0.8, 'stroke-dasharray': '3 2', rx: 0, ry: 0 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) || !p.getAttribute('fill') ? set(p, { stroke: col }) : set(p, { fill: col, 'fill-opacity': 0.4 }) },
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.4, parseFloat(p.getAttribute('stroke-width')) || 1.6) }),
    point: (p, c) => set(p, { fill: T.BLUE, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.4 }),
    marker: (p, c) => set(p, { fill: T.BLUE, 'fill-opacity': null, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.2 }),
    link: p => set(p, stroked(p) ? { stroke: T.LINE } : { fill: T.LINE }),
    rule: p => set(p, stroked(p) ? { stroke: T.FAINT } : { fill: T.FAINT, 'fill-opacity': 0.6 }),
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.FAINT } : { fill: T.DEEP, 'fill-opacity': null, stroke: T.FAINT, 'stroke-width': 0.8 })
      // a pictogram drawn as a group (a server, a PC): its lines white, its own fills turned over as after() turns them
      if (isGroup(p)) { paint(p, { stroke: T.LINE }); for (const n of p.querySelectorAll('[fill]')) turn(n, 'fill'); return }
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.LINE } : { fill: T.LINE }) },
    surface: (p, c) => { set(p, { fill: stroked(p) ? 'none' : T.BLUE, 'fill-opacity': null, stroke: T.FAINT, 'stroke-width': 0.8, 'stroke-opacity': 0.8, rx: 0, ry: 0, opacity: null }); corners(p, c) },
    grid: p => paint(p, { stroke: T.FAINT, 'stroke-opacity': 0.35, 'stroke-width': 0.5 }),
    axis: p => paint(p, { stroke: T.LINE }),
    swatch: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) ? set(p, { stroke: col }) : set(p, { fill: col, 'fill-opacity': 0.55, stroke: col, 'stroke-width': 0.8, rx: 0, ry: 0 }) },
    guide: p => set(p, { stroke: T.CHALK, 'stroke-dasharray': '6 3' }),
    leader: p => set(p, { stroke: T.FAINT, 'stroke-dasharray': null, 'stroke-width': 0.8 }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.MID, T.CYAN, T.FAINT]).colour, 'fill-opacity': null, opacity: 0.22 }),
    land: p => set(p, { fill: T.DEEP, stroke: T.LINE, 'stroke-width': 0.6 }),
    water: p => set(p, stroked(p) ? { stroke: T.CYAN } : { fill: T.BLUE, stroke: T.FAINT, 'stroke-width': 0.5 }),
    relief: (p, c) => { if (stroked(p)) return set(p, { stroke: T.FAINT, 'stroke-opacity': 0.6 }); set(p, { fill: 'none' }); overlay(p, c, hatch(c, { step: 3.5, sign: 1, stroke: T.FAINT, opacity: 0.6 })) },
    label: p => letter(p, { font: T.HAND, fill: T.LINE, halo: T.BLUE }),
    value: p => letter(p, { font: T.HAND, fill: T.CHALK, halo: T.BLUE }),
    tick: p => letter(p, { font: T.HAND, fill: T.FAINT, halo: T.BLUE }),
    title: p => letter(p, { font: T.TITLE, fill: T.LINE }),
  },
  // what no role covers keeps the plugin's light-paper colours, which on blue read inverted: lettering becomes white,
  // pale plates the ground, dark strokes white, the rest a middle blue (a picked picture keeps its own)
  after(node) {
    for (const n of node.querySelectorAll('[fill], [stroke]')) {
      if (n.closest('[data-role], defs, image, svg svg, clipPath, mask, pattern')) continue
      for (const k of ['fill', 'stroke']) turn(n, k)
    }
  },
}
