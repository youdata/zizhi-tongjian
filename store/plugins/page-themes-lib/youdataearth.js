// youdata earth · 有数·稼穑 — the house style for the third of the five elements (土爰稼穑, "earth sows and reaps"): a sheet
// the colour of ivory clay, the ink a deep umber, the pen raw sienna. Series: TSUCHI, KOKE, ARAISHU, AI, FUJI, SEPIA.
// Palette mixtures and source SHA-256: styles/youdata-earth/palette.json.
import { set, paint, hatch, tremor, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, plainInk, onDiverging, mix } from './marks.js'

export const tokens = {
  PAPER: '#efe5c1',
  PLATE: '#fbf7eb',
  SUMI: '#433002',
  NEZUMI: '#675526',
  SEPIA: '#8b4f0c',
  BENI: '#ae2613',
  TSUCHI: '#d2af3b',
  AI: '#658f87',
  MIZU: '#e0e5d4',
  KOKE: '#677e36',
  KICHA: '#e7b567',
  ARAISHU: '#ba795e',
  FUJI: '#773a24',
  DISPLAY: "'Fraunces', 'Ma Shan Zheng', serif",
  TEXT: "'Newsreader', 'Noto Serif SC', serif",
  HAND: "'Caveat', 'Long Cang', cursive",
}
const T = tokens
const SERIES = [T.TSUCHI, T.KOKE, T.ARAISHU, T.AI, T.FUJI, T.SEPIA]

// pigment soaking into washi: the edge displaced by slow noise and softened (in user space, as tremor's)
const bleed = c => c.def('bleed', id => c.make('filter', { id, x: '-4%', y: '-8%', width: '108%', height: '116%' }, [
  c.make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.04', numOctaves: 2, seed: 7, result: 'n' }),
  c.make('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 2.6, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
  c.make('feGaussianBlur', { in: 'd', stdDeviation: 0.4 })]))

// the sketch over the paint: the shape's outline again in sepia pencil, a little off its paint, trembling
function pencil(p, c, { dx = 1.8, dy = -1.4, width = 0.85, opacity = 0.85 } = {}) {
  const t = p.getAttribute('transform')
  return overlay(p, c, 'none', { stroke: T.SEPIA, 'stroke-width': width, 'stroke-opacity': opacity, 'stroke-linejoin': 'round',
    transform: `translate(${dx} ${dy})${t ? ' ' + t : ''}` })
}

// a filled shape: a wash of its pigment with a wet edge, hatched on alternate series, the pencil over it
// `a`: how dense the wash; `sketch`: the pencil outline; a white box (the plugin's own) is the paper with a pencil edge
function wash(p, c, { a = 0.55, sketch = true, hatched = true } = {}) {
  if (isGroup(p)) return paint(p, { stroke: T.SEPIA })
  if (stroked(p)) return set(p, { fill: 'none', stroke: c.series(paintOf(p)).colour })
  const { colour, i, ground } = c.series(p.getAttribute('fill'))
  if (ground) { set(p, { fill: T.PAPER, 'fill-opacity': null, opacity: null, stroke: T.SEPIA, 'stroke-width': 0.7, 'stroke-opacity': 0.7 }); return }
  set(p, { fill: colour, 'fill-opacity': a, opacity: null, stroke: colour, 'stroke-width': 0.8, 'stroke-opacity': 0.5, filter: bleed(c) })
  if (hatched && i % 2 === 1) overlay(p, c, hatch(c, { step: 6.2, sign: i % 4 === 1 ? -1 : 1, stroke: T.SEPIA, opacity: 0.45, width: 0.65 }))
  if (sketch) pencil(p, c)
}

// diverging colours onto a 藍 ↔ 紅 ramp over the paper, as deep as they were
const diverge = col => {
  const m = String(col || '').trim().toLowerCase().match(/^#([0-9a-f]{6})$/)
  if (!m) return col
  const [r, , b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  return onRamp(col, [T.PAPER, r > b ? T.BENI : T.AI])
}


// Preserve authored pigments when the core themes native SVG shapes.
const OWN = new Set(Object.values(T).filter(v => v.startsWith('#')))
function native(p) {
  const keep = ['fill', 'stroke'].map(k => [k, p.getAttribute(k)]).filter(([, v]) => OWN.has(v))
  if (/^(text|tspan)$/i.test(p.tagName)) {
    if (plainInk(p.getAttribute('fill')) != null) set(p, { fill: T.SUMI })
    if (plainInk(p.getAttribute('stroke')) != null) set(p, { stroke: T.PAPER })
  } else inks(p, { ink: T.SUMI, ground: T.PAPER, mid: T.NEZUMI })
  for (const [key, value] of keep) p.setAttribute(key, value)
}
function type(p, role, c) {
  if (c?.native && p.getAttribute('data-youdata-type') === 'authored') return
  const hand = /Caveat|Long Cang/.test(p.getAttribute('font-family') || '')
  const font = hand ? T.HAND : role === 'title' ? T.DISPLAY : T.TEXT
  const fill = role === 'value' ? T.BENI : role === 'tick' ? T.NEZUMI : T.SUMI
  letter(p, { font, fill, halo: T.PAPER })
  if (role !== 'title') set(p, { stroke: T.PAPER, 'stroke-width': 2.5, 'stroke-opacity': .9, 'paint-order': 'stroke', 'stroke-linejoin': 'round' })
}
function after(node) {
  // Unmarked placeholder plates and stock captions take the sheet's counterparts too.
  for (const p of node.querySelectorAll('[fill], [stroke]')) {
    if (p.closest('[data-role], defs, clipPath, mask, pattern')) continue
    const original = Object.fromEntries(['fill', 'stroke'].map(key => [key, (p.getAttribute(key) || '').toLowerCase()]))
    native(p)
    for (const key of ['fill', 'stroke']) {
      const value = original[key]
      if (['#eef2ff', '#f1f5f9', '#e2e8f0', '#f8fafc'].includes(value)) set(p, { [key]: key === 'fill' ? T.PLATE : T.AI })
      if (['#64748b', '#475569', '#334155', '#0f172a', '#111827', '#1f2937'].includes(value)) set(p, { [key]: T.NEZUMI })
    }
  }
  for (const p of node.querySelectorAll('text:not([data-role])')) {
    if (!p.closest('[data-role]') && !p.hasAttribute('fill') && !p.parentElement?.closest('[fill]')) set(p, { fill: T.SUMI })
  }
}

export const youdataearth = {
  id: 'youdata-earth', label: 'youdata earth · 有数·稼穑', tokens, series: SERIES, font: T.TEXT, ground: T.PAPER,
  fonts: ['Fraunces', 'Newsreader', 'Caveat', 'Noto Serif SC', 'Ma Shan Zheng', 'Long Cang'],
  // a shape drawn in the editor itself: dark ink the season's ink, white the sheet, greys the muted ink
  native, after,
  roles: {
    // values and shares: pigment washes, the pencil over them
    bar: (p, c) => p.previousElementSibling?.getAttribute('data-role') === 'track'
      ? (set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.72, rx: 0, ry: 0 }), pencil(p, c, { dx: 1.2, dy: -1 })) : wash(p, c, { a: 0.62 }),
    band: (p, c) => wash(p, c, { a: 0.36, sketch: false }),
    area: (p, c) => wash(p, c, { a: 0.26, sketch: false }),
    slice: (p, c) => wash(p, c, { a: 0.6 }),
    bubble: (p, c) => wash(p, c, { a: 0.42 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : wash(p, c, { a: 0.55, sketch: false }),
    heat: (p, c) => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, T.KICHA, T.FUJI]), stroke: T.PAPER, 'stroke-width': 0.6, filter: bleed(c) }),
    stripe: p => set(p, { fill: diverge(p.getAttribute('fill')) }),
    // a value on a two-sided scale: indigo below the middle, beni above, the grey ink's pale wash between
    diverging: p => { const fill = onDiverging(p, [T.AI, mix(T.PAPER, T.NEZUMI, 0.45), T.BENI]); if (fill) set(p, { fill }) },
    track: p => isGroup(p) ? paint(p, { stroke: T.MIZU }) : set(p, { fill: 'none', stroke: T.SEPIA, 'stroke-width': 0.6, 'stroke-opacity': 0.45, 'stroke-dasharray': '1 3', rx: 0, ry: 0 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) || !p.getAttribute('fill') ? set(p, { stroke: col, 'stroke-linecap': 'round' }) : set(p, { fill: col, 'fill-opacity': 0.5, filter: bleed(c) }) },
    // a line: its pigment as ink, round and steady
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.6, (parseFloat(p.getAttribute('stroke-width')) || 1.6) * 1.1), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    // a point: a dab of pigment ringed in ink
    point: (p, c) => set(p, { fill: c.series(paintOf(p)).colour, 'fill-opacity': 0.8, stroke: T.SUMI, 'stroke-width': 0.8 }),
    marker: (p, c) => set(p, { fill: T.PAPER, 'fill-opacity': null, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.5 }),
    // a diagram: boxes a pale wash with the pencil, connectors in sepia
    node: (p, c) => thin(p) ? set(p, { fill: T.SUMI, stroke: 'none' }) : wash(p, c, { a: 0.22, hatched: false }),
    link: (p, c) => { set(p, stroked(p) ? { stroke: T.SEPIA } : { fill: T.SEPIA, 'fill-opacity': 0.8 }); set(p, { 'stroke-linecap': 'round' }) },
    // a rule: a pencil hairline — a plugin's heavy decorative rule (a footer's 3 px swash) reads as a stray stroke on
    // the sheet
    rule: (p, c) => set(p, stroked(p) ? { stroke: T.SEPIA, 'stroke-opacity': 0.55, 'stroke-width': Math.min(1, parseFloat(p.getAttribute('stroke-width')) || 1) }
      : { fill: T.SEPIA, 'fill-opacity': 0.6 }),
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.SEPIA } : { fill: T.MIZU, 'fill-opacity': 0.6, stroke: T.SEPIA, 'stroke-width': 0.6, filter: bleed(c) })
      if (isGroup(p)) return paint(p, { stroke: T.SUMI })
      if (tag === 'path') {
        const arc = /[Aa]\s*([\d.]+)/.exec(p.getAttribute('d') || '')
        if (!stroked(p) && arc && +arc[1] >= 60) return set(p, { fill: T.AI, 'fill-opacity': .16, stroke: T.SEPIA, 'stroke-width': .7, 'stroke-opacity': .35 })
        set(p, stroked(p) ? { stroke: T.SUMI } : { fill: T.SUMI })
      } },
    // a card: a paler sheet laid on the page, a hairline in the pen
    surface: (p, c) => set(p, { fill: stroked(p) ? 'none' : T.PLATE, 'fill-opacity': null, stroke: T.SEPIA, 'stroke-width': 0.7, 'stroke-opacity': 0.55, rx: 0, ry: 0 }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.MIZU, T.KICHA, T.KOKE]).colour, 'fill-opacity': null, opacity: 0.35 }),
    // a chart's furniture: the grid as sepia construction lines, the axis in grey ink
    grid: p => paint(p, { stroke: T.SEPIA, 'stroke-opacity': 0.4, 'stroke-width': 0.5, 'stroke-dasharray': '6 2 1 2' }),
    axis: (p, c) => { paint(p, { stroke: T.NEZUMI }); set(p, { 'stroke-linecap': 'round' }) },
    guide: p => set(p, { stroke: T.BENI, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.9 }),
    leader: p => set(p, { stroke: T.SEPIA, 'stroke-dasharray': null, 'stroke-width': 0.7 }),
    swatch: (p, c) => { const { colour, i } = c.series(paintOf(p))
      if (stroked(p)) return set(p, { stroke: colour })
      set(p, { fill: colour, 'fill-opacity': 0.7, stroke: T.SEPIA, 'stroke-width': 0.5, rx: 0, ry: 0 })
      if (i % 2 === 1) overlay(p, c, hatch(c, { step: 3.4, sign: -1, stroke: T.SEPIA, opacity: 0.5, width: 0.45 })) },
    // a map: moss land, pale 水 water, relief in salmon hatched in the pen
    land: (p, c) => set(p, { fill: T.KOKE, 'fill-opacity': 0.22, stroke: T.SEPIA, 'stroke-width': 0.6 }),
    water: p => set(p, stroked(p) ? { stroke: T.AI } : { fill: T.MIZU, 'fill-opacity': 0.7, stroke: T.AI, 'stroke-width': 0.5, 'stroke-opacity': 0.6 }),
    relief: (p, c) => { if (stroked(p)) return set(p, { stroke: T.SEPIA, 'stroke-opacity': 0.55 }); set(p, { fill: T.ARAISHU, opacity: 0.35, filter: bleed(c) }); overlay(p, c, hatch(c, { step: 3.6, sign: -1, stroke: T.SEPIA, opacity: 0.45, width: 0.45 })) },
    // the type: Fraunces / 马善政 for titles, Newsreader / 思源宋 for the rest, figures in 紅
    title: (p, c) => type(p, 'title', c),
    label: (p, c) => type(p, 'label', c),
    value: (p, c) => type(p, 'value', c),
    tick: (p, c) => type(p, 'tick', c),
  },
}

export default youdataearth
