// Woodblock Print: opaque ink, gouge cuts in the paper colour, carved borders and registration marks.
// Decorations stay inside the original data marks. No noise, blur or geometry displacement.
import { set, paint, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, rectBox, onDiverging } from './marks.js'

export const tokens = {
  PAPER: '#f0e2c4', INK: '#25251f', MUTED: '#776b54', LIGHT: '#c5b594',
  RED: '#a43c2b', GREEN: '#53604b', WATER: '#ded2b3',
  // woodtype: a carved slab for display, a lighter slab for the rest; Chinese in a heavy Song (宋体) cut
  HEAD: "'Alfa Slab One', 'Noto Serif CJK SC', serif",
  SLAB: "'Zilla Slab', 'Noto Serif CJK SC', serif",
  CJK: "'Noto Serif CJK SC', serif",
  BODY: "'Noto Serif CJK SC', 'Zilla Slab', serif",   // the pack's page font (Chinese first); words here go by script
}
const T = tokens
const SERIES = [T.INK, T.RED, T.GREEN, T.MUTED]

// a gouge: a lens of paper, long and tapered as the knife leaves the block
const lens = (x, y, l, a = 0, w = 1.3) => {
  const r = a * Math.PI / 180, dx = Math.cos(r) * l, dy = Math.sin(r) * l, nx = -Math.sin(r) * w, ny = Math.cos(r) * w
  const f = v => +v.toFixed(2)
  return `M${x} ${y}Q${f(x + dx / 2 + nx)} ${f(y + dy / 2 + ny)} ${f(x + dx)} ${f(y + dy)}Q${f(x + dx / 2 - nx)} ${f(y + dy / 2 - ny)} ${x} ${y}Z`
}
// four cuttings, one a series: staggered flat-knife runs, steep V-gouge strokes, chevrons and round-gouge pecks
const CUTS = [
  [[lens(0, 3, 13), lens(17, 3, 8), lens(6, 10, 9), lens(19, 10, 11), lens(1, 17, 6), lens(11, 17, 14), lens(-4, 24, 9),
    lens(9, 24, 7), lens(20, 24, 9)].join(''), 30, 28],
  [[lens(2, 14, 13, -62), lens(9, 15, 9, -62), lens(15, 14, 13, -62), lens(22, 16, 8, -62)].join(''), 26, 14],
  ['M1 9L6 3L11 9L13 7L6 0L-1 7ZM14 19L19 13L24 19L26 17L19 10L12 17Z', 26, 20],
  ['M2.2 4a1.8 1.4 0 1 0 3.6 0a1.8 1.4 0 1 0-3.6 0M11.4 9a1.6 1.3 0 1 0 3.2 0a1.6 1.3 0 1 0-3.2 0'
    + 'M4.1 15a1.9 1.4 0 1 0 3.8 0a1.9 1.4 0 1 0-3.8 0M13.5 19a1.5 1.2 0 1 0 3 0a1.5 1.2 0 1 0-3 0', 18, 22],
]
function cuts(c, colour, i, light = false) {
  const k = ((i % 4) + 4) % 4
  return c.def(`cut-${k}-${colour.replace('#', '')}-${light}`, id => {
    const [d, width, height] = CUTS[k]
    return c.make('pattern', { id, width, height, patternUnits: 'userSpaceOnUse' }, [
      c.make('path', { d, fill: light ? colour : T.PAPER, stroke: 'none', opacity: light ? 0.3 : 0.88 }),
    ])
  })
}

function carved(p, c, { edge = 1.4, light = false } = {}) {
  const { colour, i, ground } = c.series(paintOf(p))
  if (stroked(p)) return set(p, { fill: 'none', stroke: ground ? T.INK : colour, 'stroke-width': edge || 1.4 })
  if (ground) return set(p, { fill: T.PAPER, 'fill-opacity': null, opacity: null, stroke: T.INK,
    'stroke-width': edge || 1.4, rx: 0, ry: 0 })
  set(p, { fill: light ? T.PAPER : colour, 'fill-opacity': null, opacity: null,
    stroke: edge ? T.INK : 'none', 'stroke-width': edge || null, rx: 0, ry: 0 })
  overlay(p, c, cuts(c, colour, i, light))
}

// an area: its colour block printed thin (a second, lighter pass) with the cuts in paper, so stacked layers keep apart
function tinted(p, c) {
  const { colour, i, ground } = c.series(paintOf(p))
  if (stroked(p)) return set(p, { stroke: ground ? T.INK : colour })
  if (ground) return set(p, { fill: T.PAPER, stroke: 'none', 'fill-opacity': null, opacity: null })
  set(p, { fill: colour, 'fill-opacity': 0.5, opacity: null, stroke: 'none' })
  overlay(p, c, cuts(c, colour, i))
}

// a card: a double rule as cut in the block; a page's title panel (700 × 150 and up) gets a carved border — a broad
// ink band with a broken paper gouge run along it; a card of some size, the kentō (the printer's registration corner
// and bar) outside its foot
function frame(p, c) {
  set(p, { fill: stroked(p) ? 'none' : T.PAPER, stroke: T.INK, 'stroke-width': 1.8,
    'fill-opacity': null, opacity: null, rx: 0, ry: 0 })
  if (p.tagName.toLowerCase() !== 'rect') return
  const { x, y, w, h } = rectBox(p), add = []
  if (w > 40 && h > 40) add.push(c.make('rect', { x: x + 5, y: y + 6, width: w - 11, height: h - 13, fill: 'none',
    stroke: T.INK, 'stroke-width': 0.65, 'pointer-events': 'none' }))
  if (w >= 700 && h >= 150) {   // a page's title panel, not every card
    set(p, { 'stroke-width': 6 })
    add.push(c.make('rect', { x, y, width: w, height: h, fill: 'none', stroke: T.PAPER, 'stroke-width': 1.1,
      'stroke-dasharray': '23 4 9 3 31 5 14 4', 'pointer-events': 'none' }))
  }
  if (w > 140 && h > 80) add.push(c.make('path', { d: `M${x + w - 14} ${y + h + 5}H${x + w + 5}V${y + h - 14}`
    + `M${x} ${y + h + 5}h22`, fill: 'none', stroke: T.INK, 'stroke-width': 1.6, 'stroke-linecap': 'square',
    'pointer-events': 'none' }))
  p.after(...add)
}

// a big filled arc (a title banner's ring): a decorative plate, not an icon's line art — printed as a carved block
// (paper with gouge lines where it was pale, the colour with paper cuts where it was coloured), never solid ink
const bigArc = p => { const m = /[Aa]\s*([\d.]+)/.exec(p.getAttribute('d') || ''); return !!m && +m[1] >= 30 }
const lum = col => {
  const s = String(col || '').trim().toLowerCase()
  if (s === 'white') return 1
  const m3 = /^#([0-9a-f]{3})$/.exec(s), h = m3 ? [...m3[1]].map(d => d + d).join('') : (/^#([0-9a-f]{6})$/.exec(s) || [])[1]
  if (!h) return null
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}
const pale = col => (lum(col) ?? 0) > 0.6
function plateArc(p, c) {
  if (!pale(paintOf(p)) && c.series(paintOf(p)).i !== 0) return carved(p, c, { edge: 1.2 })   // the accent arc; the ring itself pale
  set(p, { fill: T.PAPER, 'fill-opacity': null, opacity: null, stroke: T.INK, 'stroke-width': 1.4 })
  overlay(p, c, cuts(c, T.INK, 0, true))
}
// a printed line: thick ink with a fine paper gouge down its middle (a double cut), so it reads as carved
function cutLine(p, c) {
  const w = Math.max(3, (parseFloat(p.getAttribute('stroke-width')) || 2) * 1.5)
  set(p, { stroke: c.series(paintOf(p)).colour, 'stroke-width': w, 'stroke-linecap': 'square', 'stroke-linejoin': 'bevel' })
  if (p.tagName.toLowerCase() === 'g') return
  const g = p.cloneNode(false)
  for (const k of ['data-role', 'id', 'class', 'marker-start', 'marker-end', 'marker-mid']) g.removeAttribute(k)
  set(g, { fill: 'none', stroke: T.PAPER, 'stroke-width': Math.max(0.8, w * 0.26), opacity: 0.9, 'pointer-events': 'none' })
  p.after(g)
}
// the theme's own inks stay as chosen (an olive swatch is olive); other colours go to ink, paper or the mid tone
const OWN_INKS = new Set(Object.values(T).filter(v => v.startsWith('#')))
function native(p) {
  const keep = ['fill', 'stroke'].map(k => [k, p.getAttribute(k)]).filter(([, v]) => OWN_INKS.has(String(v).toLowerCase()))
  inks(p, { ink: T.INK, ground: T.PAPER, mid: T.MUTED })
  for (const [k, v] of keep) p.setAttribute(k, v)
}

// is a word printed on a block? Under its middle lies a data mark the theme prints in colour (a stacked bar's
// segment, a treemap's cell, a dark tile of a tile map) — not a card or a pale plate, which stay paper
const central = p => /^(middle|central)$/.test(p.getAttribute('dominant-baseline') || '')
const BLOCKS = new Set(['bar', 'cell', 'band', 'swatch', 'slice', 'heat'])
function onBlock(p) {
  const x = parseFloat(p.getAttribute('x')), size = parseFloat(p.getAttribute('font-size')) || 12
  const y = parseFloat(p.getAttribute('y')) - (central(p) ? 0 : size * 0.35)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  for (const scope of [p.parentNode, p.parentNode?.parentNode]) {
    if (!scope?.querySelectorAll) continue
    for (const r of scope.querySelectorAll('rect[data-role]')) {
      if (!BLOCKS.has(r.getAttribute('data-role'))) continue
      const rx = parseFloat(r.getAttribute('x')) || 0, ry = parseFloat(r.getAttribute('y')) || 0
      const rw = parseFloat(r.getAttribute('width')) || 0, rh = parseFloat(r.getAttribute('height')) || 0
      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return (lum(r.getAttribute('fill')) ?? 0) > 0.8 ? null : { x: rx, y: ry, w: rw, h: rh }   // paper, or near it: no block
    }
  }
  return null
}
// the width a word will take, guessed from its letters (no layout here): CJK square, figures and capitals wider
const guess = (txt, size) => [...txt].reduce((w, ch) => w + size * (/[\u2e80-\u9fff\uac00-\ud7af]/u.test(ch) ? 1
  : /[0-9A-Z%]/.test(ch) ? 0.62 : /[\s.,·:;'’]/.test(ch) ? 0.3 : 0.52), 0)
// a slip of paper under a word printed on a dark block, when it fits there; else the word keeps a dark rim
function slip(p, block, c, look) {
  const size = parseFloat(p.getAttribute('font-size')) || 12, w = guess(p.textContent || '', size) + size * 0.7, h = size * 1.3
  if (w > block.w - 4 || h > block.h - 2) return false
  const anchor = p.getAttribute('text-anchor'), x = parseFloat(p.getAttribute('x')), y = parseFloat(p.getAttribute('y'))
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w + size * 0.35 : x - size * 0.35
  const top = central(p) ? y - h / 2 : y - size * 1.0
  p.before(c.make('rect', { x: +left.toFixed(1), y: +top.toFixed(1), width: +w.toFixed(1), height: +h.toFixed(1),
    'pointer-events': 'none', ...look }))
  return true
}
// type: carved slab for titles, the lighter slab for the rest, Chinese in Song. A word on a block is printed on a
// paper slip (or, with no room for one, in paper with an ink rim); every other word is ink with a paper rim.
const CJK = /[\u2e80-\u9fff\uac00-\ud7af]/u
function lettering(p, role, c) {
  const size = parseFloat(p.getAttribute('font-size')) || 0
  const cjk = CJK.test(p.textContent || ''), display = role === 'title' && size >= 26
  letter(p, { font: cjk ? T.CJK : display ? T.HEAD : T.SLAB,
    fill: role === 'value' ? T.RED : role === 'tick' ? T.MUTED : T.INK, halo: T.PAPER })
  // a big figure in the slab runs wider than the plugin's own face: a tenth smaller, so what follows it keeps its room
  if (role === 'value' && size >= 28) set(p, { 'font-size': +(size * 0.9).toFixed(1) })
  if (role === 'title') set(p, { 'font-weight': display && !cjk ? '400' : '700' })
  else if (role === 'value') set(p, { 'font-weight': '700' })
  const block = onBlock(p)
  if (block && slip(p, block, c, { fill: T.PAPER, stroke: T.INK, 'stroke-width': 1.1 }))
    return set(p, { stroke: null, 'stroke-width': null, 'paint-order': null })
  if (block) return set(p, { fill: T.PAPER, stroke: T.INK, 'stroke-width': 3.6, 'stroke-opacity': 0.9,
    'paint-order': 'stroke', 'stroke-linejoin': 'round' })
  if (role !== 'title') set(p, { stroke: T.PAPER, 'stroke-width': 2.4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' })
}

export const woodblock = {
  id: 'woodblock', label: 'Woodblock Print · 木刻', tokens, series: SERIES, font: T.SLAB,
  ground: T.PAPER, fonts: ['Alfa Slab One', 'Zilla Slab'],
  native,
  roles: {
    bar: (p, c) => carved(p, c),
    band: (p, c) => carved(p, c, { edge: 0.7 }),
    area: tinted,
    slice: (p, c) => carved(p, c, { edge: 1 }),
    bubble: (p, c) => carved(p, c, { light: true }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(paintOf(p)).colour }) : carved(p, c, { edge: 0.6 }),
    node: (p, c) => thin(p) ? set(p, { fill: c.series(paintOf(p)).colour, stroke: T.INK })
      : carved(p, c, { edge: 1.8, light: true }),
    track: p => isGroup(p) ? paint(p, { stroke: T.LIGHT }) : set(p, { fill: 'none', stroke: T.MUTED, 'stroke-width': 0.8, rx: 0, ry: 0 }),
    range: (p, c) => set(p, stroked(p) ? { stroke: c.series(paintOf(p)).colour, 'stroke-width': 2 }
      : { fill: c.series(paintOf(p)).colour }),
    line: cutLine,
    point: (p, c) => set(p, { fill: T.PAPER, stroke: c.series(paintOf(p)).colour, 'stroke-width': 2.2 }),
    marker: p => set(p, { fill: T.PAPER, stroke: T.INK, 'stroke-width': 2.2 }),
    link: p => set(p, stroked(p) ? { stroke: T.INK, 'stroke-width': 1.8 } : { fill: T.INK }),
    rule: p => set(p, stroked(p) ? { stroke: T.INK, 'stroke-width': 2.8 } : { fill: T.INK }),
    surface: frame,
    icon: (p, c) => !isGroup(p) && !stroked(p) && bigArc(p) ? plateArc(p, c) : isGroup(p) ? paint(p, { stroke: T.INK }) : set(p, stroked(p)
      ? { stroke: T.INK } : { fill: /^(circle|rect)$/i.test(p.tagName) ? T.PAPER : T.INK, stroke: T.INK, 'stroke-width': 1.2 }),
    // a value on a two-sided scale: green below the middle, red above
    diverging: p => { const fill = onDiverging(p, [T.GREEN, T.LIGHT, T.RED]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, T.LIGHT, T.MUTED, T.INK]) }),
    stripe: p => {
      const m = String(p.getAttribute('fill') || '').match(/^#([0-9a-f]{6})$/i)
      const warm = m && parseInt(m[1].slice(0, 2), 16) > parseInt(m[1].slice(4, 6), 16)
      set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, warm ? T.RED : T.GREEN]) })
    },
    span: p => set(p, { fill: T.LIGHT, opacity: 0.27 }),
    grid: p => paint(p, { stroke: T.LIGHT, 'stroke-width': 0.65, 'stroke-dasharray': '2 5' }),
    axis: p => paint(p, { stroke: T.INK, 'stroke-width': 1.6 }),
    guide: p => set(p, { stroke: T.RED, 'stroke-width': 1.6, 'stroke-dasharray': '6 3' }),
    leader: p => set(p, { stroke: T.MUTED, 'stroke-width': 1, 'stroke-dasharray': null }),
    swatch: (p, c) => carved(p, c, { edge: 0.6 }),
    land: p => set(p, { fill: stroked(p) ? 'none' : T.PAPER, stroke: T.INK, 'stroke-width': 1.7 }),
    water: (p, c) => stroked(p) ? set(p, { stroke: T.INK, 'stroke-width': 1.8 }) : carved(p, c, { edge: 0.8, light: true }),
    relief: (p, c) => carved(p, c, { edge: 0, light: true }),
    title: (p, c) => lettering(p, 'title', c), label: (p, c) => lettering(p, 'label', c),
    value: (p, c) => lettering(p, 'value', c), tick: (p, c) => lettering(p, 'tick', c),
  },
}

export default woodblock
