// youdata · 有数 — our own page theme: Japanese pigments from Sanzo Wada's Dictionary of Color Combinations, softened as
// if printed on washi; washes that bleed at a wet edge (水墨); and a da Vinci notebook over them — a sepia pencil line
// drawn a little off the paint, construction lines for the grid, hatching on alternate series, a hand for notes.
// Each series is a pigment, and every other one is hatched as well, so colour is never the only difference.
import { set, paint, hatch, tremor, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, onDiverging, mix } from './marks.js'

export const tokens = {
  PAPER: '#f2ece0',
  SUMI: '#26323a',
  NEZUMI: '#6b7477',
  SEPIA: '#7a5f3e',
  BENI: '#b8453f',
  AI: '#4f7f80',
  MIZU: '#cfdcd6',
  KOKE: '#86a68c',
  KICHA: '#c8ab6c',
  ARAISHU: '#d29f7c',
  FUJI: '#7d5a6c',
  DISPLAY: "'Fraunces', 'Ma Shan Zheng', serif",
  TEXT: "'Newsreader', 'Noto Serif SC', serif",
  HAND: "'Caveat', 'Long Cang', cursive",
}
const T = tokens
const SERIES = [T.AI, T.BENI, T.KICHA, T.KOKE, T.FUJI, T.SEPIA]

// pigment soaking into washi: the edge displaced by slow noise and softened (in user space, as tremor's)
const bleed = c => c.def('bleed', id => c.make('filter', { id, filterUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, [
  c.make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.04', numOctaves: 3, seed: 7, result: 'n' }),
  c.make('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.6, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
  c.make('feGaussianBlur', { in: 'd', stdDeviation: 0.4 })]))

// the sketch over the paint: the shape's outline again in sepia pencil, a little off its paint, trembling
function pencil(p, c, { dx = 1.8, dy = -1.4, width = 0.85, opacity = 0.85 } = {}) {
  const t = p.getAttribute('transform')
  return overlay(p, c, 'none', { stroke: T.SEPIA, 'stroke-width': width, 'stroke-opacity': opacity, 'stroke-linejoin': 'round',
    transform: `translate(${dx} ${dy})${t ? ' ' + t : ''}`, filter: tremor(c, 0.7) })
}

// a filled shape: a wash of its pigment with a wet edge, hatched on alternate series, the pencil over it
// `a`: how dense the wash; `sketch`: the pencil outline; a white box (the plugin's own) is the paper with a pencil edge
function wash(p, c, { a = 0.55, sketch = true, hatched = true } = {}) {
  const { colour, i, ground } = c.series(p.getAttribute('fill'))
  if (ground) { set(p, { fill: T.PAPER, 'fill-opacity': null, opacity: null, stroke: T.SEPIA, 'stroke-width': 0.7, 'stroke-opacity': 0.7, filter: tremor(c, 0.6) }); return }
  set(p, { fill: colour, 'fill-opacity': a, opacity: null, stroke: colour, 'stroke-width': 0.8, 'stroke-opacity': 0.5, filter: bleed(c) })
  if (hatched && i % 2 === 1) overlay(p, c, hatch(c, { step: 4.2, sign: i % 4 === 1 ? -1 : 1, stroke: T.SEPIA, opacity: 0.6, width: 0.6 }))
  if (sketch) pencil(p, c)
}

// diverging colours onto a 藍 ↔ 紅 ramp over the paper, as deep as they were
const diverge = col => {
  const m = String(col || '').trim().toLowerCase().match(/^#([0-9a-f]{6})$/)
  if (!m) return col
  const [r, , b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  return onRamp(col, [T.PAPER, r > b ? T.BENI : T.AI])
}

export const youdata = {
  id: 'youdata', label: 'youdata · 有数', tokens, series: SERIES, font: T.TEXT, ground: T.PAPER,
  fonts: ['Fraunces', 'Newsreader', 'Caveat', 'Noto Serif SC', 'Ma Shan Zheng', 'Long Cang'],
  // a shape drawn in the editor itself: indigo-black ink, white the washi, greys the grey ink
  native: p => inks(p, { ink: T.SUMI, ground: T.PAPER, mid: T.NEZUMI }),
  roles: {
    // values and shares: pigment washes, the pencil over them
    bar: (p, c) => p.previousElementSibling?.getAttribute('data-role') === 'track'
      ? (set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.72, rx: 0, ry: 0 }), pencil(p, c, { dx: 1.2, dy: -1 })) : wash(p, c, { a: 0.62 }),
    band: (p, c) => wash(p, c, { a: 0.36, sketch: false }),
    area: (p, c) => wash(p, c, { a: 0.26, sketch: false }),
    slice: (p, c) => wash(p, c, { a: 0.6 }),
    bubble: (p, c) => wash(p, c, { a: 0.42 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : wash(p, c, { a: 0.55, sketch: false }),
    heat: (p, c) => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, T.MIZU, T.AI]), stroke: T.PAPER, 'stroke-width': 0.6, filter: bleed(c) }),
    stripe: p => set(p, { fill: diverge(p.getAttribute('fill')) }),
    // a value on a two-sided scale: indigo below the middle, beni above, the grey ink's pale wash between
    diverging: p => { const fill = onDiverging(p, [T.AI, mix(T.PAPER, T.NEZUMI, 0.45), T.BENI]); if (fill) set(p, { fill }) },
    track: p => isGroup(p) ? paint(p, { stroke: T.MIZU }) : set(p, { fill: 'none', stroke: T.SEPIA, 'stroke-width': 0.6, 'stroke-opacity': 0.45, 'stroke-dasharray': '1 3', rx: 0, ry: 0 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) || !p.getAttribute('fill') ? set(p, { stroke: col, 'stroke-linecap': 'round' }) : set(p, { fill: col, 'fill-opacity': 0.5, filter: bleed(c) }) },
    // a line: its pigment as ink, round and steady
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.6, (parseFloat(p.getAttribute('stroke-width')) || 1.6) * 1.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    // a point: a dab of pigment ringed in ink
    point: (p, c) => set(p, { fill: c.series(paintOf(p)).colour, 'fill-opacity': 0.8, stroke: T.SUMI, 'stroke-width': 0.8 }),
    marker: (p, c) => set(p, { fill: T.PAPER, 'fill-opacity': null, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.5, filter: tremor(c, 0.5) }),
    // a diagram: boxes a pale wash with the pencil, connectors in sepia
    node: (p, c) => thin(p) ? set(p, { fill: T.SUMI, stroke: 'none' }) : wash(p, c, { a: 0.22, hatched: false }),
    link: (p, c) => { set(p, stroked(p) ? { stroke: T.SEPIA } : { fill: T.SEPIA, 'fill-opacity': 0.8 }); set(p, { filter: tremor(c, 0.6) }) },
    rule: (p, c) => set(p, stroked(p) ? { stroke: T.SEPIA, 'stroke-opacity': 0.8 } : { fill: T.SEPIA, 'fill-opacity': 0.6, filter: tremor(c, 0.5) }),
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.SEPIA } : { fill: T.MIZU, 'fill-opacity': 0.6, stroke: T.SEPIA, 'stroke-width': 0.6, filter: bleed(c) })
      if (isGroup(p)) return paint(p, { stroke: T.SUMI })
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.SUMI } : { fill: T.SUMI }) },
    // a card: the washi, a sepia hairline drawn by hand
    surface: (p, c) => set(p, { fill: stroked(p) ? 'none' : T.PAPER, 'fill-opacity': null, stroke: T.SEPIA, 'stroke-width': 0.7, 'stroke-opacity': 0.55, rx: 0, ry: 0, filter: tremor(c, 0.6) }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.MIZU, T.KICHA, T.KOKE]).colour, 'fill-opacity': null, opacity: 0.35 }),
    // a chart's furniture: the grid as sepia construction lines, the axis in grey ink
    grid: p => paint(p, { stroke: T.SEPIA, 'stroke-opacity': 0.4, 'stroke-width': 0.5, 'stroke-dasharray': '6 2 1 2' }),
    axis: (p, c) => { paint(p, { stroke: T.NEZUMI }); set(p, { filter: tremor(c, 0.4) }) },
    guide: p => set(p, { stroke: T.BENI, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.9 }),
    leader: p => set(p, { stroke: T.SEPIA, 'stroke-dasharray': null, 'stroke-width': 0.7 }),
    swatch: (p, c) => { const { colour, i } = c.series(paintOf(p))
      if (stroked(p)) return set(p, { stroke: colour })
      set(p, { fill: colour, 'fill-opacity': 0.7, stroke: T.SEPIA, 'stroke-width': 0.5, rx: 0, ry: 0 })
      if (i % 2 === 1) overlay(p, c, hatch(c, { step: 3.4, sign: -1, stroke: T.SEPIA, opacity: 0.5, width: 0.45 })) },
    // a map: washi land with moss, pale 水 water, relief hatched in sepia
    land: (p, c) => set(p, { fill: T.KOKE, 'fill-opacity': 0.22, stroke: T.SEPIA, 'stroke-width': 0.6, filter: tremor(c, 0.6) }),
    water: p => set(p, stroked(p) ? { stroke: T.AI } : { fill: T.MIZU, 'fill-opacity': 0.7, stroke: T.AI, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }),
    relief: (p, c) => { if (stroked(p)) return set(p, { stroke: T.SEPIA, 'stroke-opacity': 0.55 }); set(p, { fill: T.ARAISHU, opacity: 0.35, filter: bleed(c) }); overlay(p, c, hatch(c, { step: 3.6, sign: -1, stroke: T.SEPIA, opacity: 0.45, width: 0.45 })) },
    // the type: Fraunces / 马善政 for titles, Newsreader / 思源宋 for the rest, figures in 紅
    title: p => letter(p, { font: T.DISPLAY, fill: T.SUMI }),
    label: p => letter(p, { font: T.TEXT, fill: T.SUMI, halo: T.PAPER }),
    value: p => letter(p, { font: T.TEXT, fill: T.BENI, halo: T.PAPER }),
    tick: p => letter(p, { font: T.TEXT, fill: T.NEZUMI, halo: T.PAPER }),
  },
}

export default youdata
