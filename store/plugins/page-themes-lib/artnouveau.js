// Art Nouveau: flat poster colour inside fine contours, botanical rhythms, whiplash curls and curved framing.
// Data marks retain their original bounds, radii and path geometry; ornament is added beside them, never instead.
import { set, paint, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, rectBox, onDiverging } from './marks.js'

export const tokens = {
  PAPER: '#f3ecd8', INK: '#253f36', MUTED: '#61766b', LIGHT: '#ddd8b8',
  GREEN: '#718b68', GOLD: '#a9803c', PLUM: '#87586a', TEAL: '#497f7b',
  WATER: '#b4d2cf', LAND: '#ece5c5', SHADE: '#5f7a63', LIT: '#dfe0bd',
  HEAD: "'Federant', 'Noto Serif CJK SC', serif",
  BODY: "'EB Garamond', 'Noto Serif CJK SC', serif",
  CJK: "'Noto Serif CJK SC', serif",
}
const T = tokens
// the map pack's relief plates (artnouveau.PLATES): kept as drawn, like the tokens
const PLATES = ['#e2dfba', '#d3d6a9', '#c0c897', '#aab686', '#97a67c', '#869875', '#788b6f']
const SERIES = [T.GREEN, T.GOLD, T.PLUM, T.TEAL]
const OWN = new Set([...Object.values(T).filter(v => v.startsWith('#')), ...PLATES])
function native(p) {
  const keep = ['fill', 'stroke'].map(k => [k, p.getAttribute(k)]).filter(([, v]) => OWN.has(String(v).toLowerCase()))
  inks(p, { ink: T.INK, ground: T.PAPER, mid: T.MUTED })
  for (const [k, v] of keep) p.setAttribute(k, v)
}

// a mark's inner pattern: a vine (a wavy stem with a leaf at each crest) in paper over the colour, or in the colour
// over paper for pale marks; four variants, one per series, so series differ by pattern as well as by ink
function vine(c, colour, i, pale = false) {
  return c.def(`veins-${i % 4}-${colour.replace('#', '')}-${pale}`, id => {
    const leafAt = (x, y, a) => `M${x} ${y}c${-3 * a} -2 ${-3 * a} -7 0 -9c${3 * a} 2 ${3 * a} 7 0 9Z`
    const motifs = [
      [`M0 14C6 6 12 6 18 14S30 22 36 14${leafAt(9, 9, 1)}${leafAt(27, 27, -1)}`, 36, 28],
      ['M-12 24Q12-8 36 24M-12 32Q12 0 36 32', 24, 32],
      [`M8 28C2 18 14 10 8 0M22 28C28 18 16 10 22 0${leafAt(8, 15, -1)}${leafAt(22, 24, 1)}`, 30, 28],
      ['M0 24C0 4 24 20 24 0M-12 24C-12 4 12 20 12 0', 24, 24],
    ]
    const [d, width, height] = motifs[i % 4]
    return c.make('pattern', { id, width, height, patternUnits: 'userSpaceOnUse' }, [
      c.make('path', { d, fill: 'none', stroke: pale ? colour : T.PAPER, 'stroke-width': 0.9, opacity: pale ? 0.28 : 0.5 }),
    ])
  })
}
function leafMark(p, c, { pale = false, edge = .9 } = {}) {
  const { colour, i, ground } = c.series(paintOf(p))
  if (stroked(p)) return set(p, { fill: 'none', stroke: ground ? T.INK : colour, 'stroke-width': edge || 1 })
  set(p, { fill: ground || pale ? T.PAPER : colour, stroke: edge ? T.INK : 'none', 'stroke-width': edge || null,
    'fill-opacity': null, opacity: null, rx: 0, ry: 0 })
  if (!ground) overlay(p, c, vine(c, colour, i, pale))
}

// a big filled arc (a title banner's ring): a nimbus, not a fat dark donut — the ring pale with a gold rule, the
// accent arc in its series colour with the vine over it
const bigArc = p => { const m = /[Aa]\s*([\d.]+)/.exec(p.getAttribute('d') || ''); return !!m && +m[1] >= 30 }
const pale = col => { const m = /^#([0-9a-f]{6})$/i.exec(col || ''); if (!m) return false
  const v = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] > 0.6 }
function nimbusArc(p, c) {
  if (!pale(paintOf(p)) && c.series(paintOf(p)).i !== 0) return leafMark(p, c, { edge: 1.1 })
  set(p, { fill: T.LIGHT, 'fill-opacity': null, opacity: null, stroke: T.GOLD, 'stroke-width': 1.3 })
}

// the whiplash at a card's corner: a curve along the inner corner that turns into a curl
const curlD = (x, y, s, sx, sy) => {
  const P = (a, b) => `${(x + sx * a).toFixed(1)} ${(y + sy * b).toFixed(1)}`
  return `M${P(0, s * 1.6)}C${P(0, s * .5)} ${P(s * .3, 0)} ${P(s * 1.4, 0)}C${P(s * 2.1, 0)} ${P(s * 2.2, s * .62)} ${P(s * 1.75, s * .66)}`
    + `C${P(s * 1.42, s * .68)} ${P(s * 1.42, s * .35)} ${P(s * 1.7, s * .38)}`
}
function card(p, c) {
  set(p, { fill: stroked(p) ? 'none' : T.PAPER, stroke: T.INK, 'stroke-width': 1.1, 'fill-opacity': null, opacity: null, rx: 16, ry: 16 })
  if (p.tagName.toLowerCase() !== 'rect') return
  const { x, y, w, h } = rectBox(p)
  if (w > 130 && h > 70) {
    const s = Math.min(14, h / 7)
    p.after(c.make('path', { d: curlD(x + 10, y + 10, s, 1, 1) + curlD(x + w - 10, y + h - 10, s, -1, -1),
      fill: 'none', stroke: T.GOLD, 'stroke-width': 1.3, 'stroke-linecap': 'round', 'pointer-events': 'none' }))
    p.after(c.make('rect', { x: x + 5, y: y + 5, width: w - 10, height: h - 10, rx: 12, ry: 12,
      fill: 'none', stroke: T.GOLD, 'stroke-width': .6, 'pointer-events': 'none' }))
  } else if (w > 40 && h > 40) {
    p.after(c.make('path', { d: curlD(x + 7, y + 7, Math.min(8, h / 6), 1, 1),
      fill: 'none', stroke: T.GOLD, 'stroke-width': 1, 'stroke-linecap': 'round', 'pointer-events': 'none' }))
  }
}
// a long horizontal rule (a footer's, a banner's): drawn straight, with a gap in the middle for a rosette between two
// curls (the pack's divider()); a short or slanted rule only takes the gold
function rosette(c, x, y, r) {
  const petal = `M0 0C${-r * .55} ${-r * .35} ${-r * .45} ${-r} 0 ${-r}C${r * .45} ${-r} ${r * .55} ${-r * .35} 0 0Z`
  return c.make('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, 'pointer-events': 'none' }, [
    ...[0, 90, 180, 270].map(a => c.make('path', { d: petal, fill: T.GOLD, stroke: T.INK, 'stroke-width': .7, transform: `rotate(${a})` })),
    c.make('circle', { cx: 0, cy: 0, r: r * .24, fill: T.PLUM, stroke: T.INK, 'stroke-width': .6 })])
}
function rule(p, c) {
  if (!stroked(p)) return set(p, { fill: T.GOLD })
  set(p, { stroke: T.GOLD, 'stroke-width': 1.4 })
  const n = (p.getAttribute('d') || '').match(/-?[\d.]+/g)?.map(Number)
  if (p.tagName.toLowerCase() !== 'path' || !n || n.length < 4) return
  const [x1, y1] = n, [x2, y2] = n.slice(-2)
  if (Math.abs(x2 - x1) < 300 || Math.abs(y2 - y1) > 2) return
  const m = (x1 + x2) / 2, y = (y1 + y2) / 2, s = 20
  set(p, { d: `M${x1} ${y}H${m - 40}M${m + 40} ${y}H${x2}` })
  p.after(rosette(c, m, y, 10))
  p.after(c.make('path', { d: curlD(m - 14, y, s * .45, -1, -1) + curlD(m + 14, y, s * .45, 1, -1), fill: 'none', stroke: T.INK,
    'stroke-width': 1.1, 'stroke-linecap': 'round', 'pointer-events': 'none' }))
}
// a point on a line: a ringed seed in its series colour
function seed(p, c) {
  set(p, { fill: T.PAPER, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.8 })
}
function lettering(p, role, c) {
  // the page's own text in the theme's faces (the pack's text(), display()) keeps its face and ink: the editor calls
  // any native text of 24 px and up a title, and a paragraph set at 28 px is not one
  if (c?.native && /Federant|EB Garamond|Noto Serif CJK/.test(p.getAttribute('font-family') || '')) {
    if (!OWN.has(String(p.getAttribute('fill')).toLowerCase())) set(p, { fill: T.INK })
    return
  }
  const cjk = /[⺀-鿿가-힯]/u.test(p.textContent || '')
  const display = role === 'title' && (parseFloat(p.getAttribute('font-size')) || 0) >= 26
  letter(p, { font: cjk ? T.CJK : display ? T.HEAD : T.BODY, fill: role === 'value' ? T.PLUM : role === 'tick' ? T.MUTED : T.INK, halo: T.PAPER })
  if (display) set(p, { 'font-weight': 400 })
  else set(p, { stroke: T.PAPER, 'stroke-width': 2.2, 'paint-order': 'stroke', 'stroke-linejoin': 'round' })
}
// what no role covers: a figure's placeholder (a pale tint, a grey rule) takes the paper's light tone and the muted
// ink; a saturated colour (an illustration's) is left as drawn
function after(node) {
  for (const n of node.querySelectorAll('[fill],[stroke]')) {
    if (n.closest('[data-role],defs,pattern,clipPath,mask')) continue
    for (const k of ['fill', 'stroke']) {
      const v = (n.getAttribute(k) || '').trim().toLowerCase(), m = /^#([0-9a-f]{6})$/.exec(v)
      if (!m || OWN.has(v) || /^#f{6}$/.test(v)) continue
      const rgb = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
      if (Math.max(...rgb) - Math.min(...rgb) > 40 && !pale(v)) continue
      n.setAttribute(k, k === 'fill' ? (pale(v) ? '#ebe5cc' : T.MUTED) : pale(v) ? T.LIGHT : T.MUTED)
    }
  }
}
export const artnouveau = {
  id: 'art-nouveau', label: 'Art Nouveau', tokens, series: SERIES, font: T.BODY, ground: T.PAPER,
  fonts: ['Federant', 'EB Garamond'], native, after,
  roles: {
    bar: (p, c) => leafMark(p, c), band: (p, c) => leafMark(p, c, { edge: .6 }),
    area: (p, c) => leafMark(p, c, { pale: true, edge: 0 }),
    slice: (p, c) => !stroked(p) && bigArc(p) ? nimbusArc(p, c) : leafMark(p, c),
    bubble: (p, c) => leafMark(p, c, { pale: true }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(paintOf(p)).colour }) : leafMark(p, c, { edge: .5 }),
    node: (p, c) => thin(p) ? set(p, { fill: c.series(paintOf(p)).colour, stroke: T.INK }) : leafMark(p, c, { pale: true, edge: 1.3 }),
    track: p => isGroup(p) ? paint(p, { stroke: T.LIGHT }) : set(p, { fill: stroked(p) ? 'none' : T.LIGHT, stroke: T.MUTED, 'stroke-width': .7 }),
    range: (p, c) => set(p, stroked(p) ? { stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.7 } : { fill: c.series(paintOf(p)).colour }),
    line: (p, c) => set(p, { stroke: c.series(paintOf(p)).colour, 'stroke-width': Math.max(2.2, parseFloat(p.getAttribute('stroke-width')) || 2),
      'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    point: seed,
    marker: p => set(p, { fill: T.GOLD, stroke: T.INK, 'stroke-width': 1.2 }),
    link: p => set(p, stroked(p) ? { stroke: T.INK, 'stroke-width': 1.4, 'stroke-linecap': 'round' } : { fill: T.INK }),
    rule,
    surface: card,
    icon: (p, c) => !isGroup(p) && !stroked(p) && bigArc(p) ? nimbusArc(p, c) : isGroup(p) ? paint(p, { stroke: T.INK })
      : set(p, stroked(p) ? { stroke: T.INK } : { fill: /^(circle|rect)$/i.test(p.tagName) ? T.PAPER : T.GREEN, stroke: T.INK, 'stroke-width': .8 }),
    // a value on a two-sided scale: teal below the middle, plum above
    diverging: p => { const fill = onDiverging(p, [T.TEAL, T.LIGHT, T.PLUM]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, T.LIGHT, T.GREEN, T.INK]) }),
    stripe: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PAPER, T.PLUM]) }),
    span: p => set(p, { fill: T.LIGHT, opacity: .3 }),
    grid: p => paint(p, { stroke: T.MUTED, 'stroke-opacity': .3, 'stroke-width': .6, 'stroke-dasharray': '1 5' }),
    axis: p => paint(p, { stroke: T.INK, 'stroke-width': 1 }),
    guide: p => set(p, { stroke: T.PLUM, 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }),
    leader: p => set(p, { stroke: T.MUTED, 'stroke-width': .9, 'stroke-dasharray': null }),
    swatch: (p, c) => leafMark(p, c, { edge: .5 }),
    land: p => set(p, { fill: stroked(p) ? 'none' : T.LAND, stroke: T.INK, 'stroke-width': 1 }),
    water: p => set(p, stroked(p) ? { stroke: T.TEAL, 'stroke-width': 1.5 } : { fill: T.WATER, stroke: T.TEAL, 'stroke-width': .8 }),
    relief: (p, c) => leafMark(p, c, { pale: true, edge: 0 }),
    title: (p, c) => lettering(p, 'title', c), label: (p, c) => lettering(p, 'label', c), value: (p, c) => lettering(p, 'value', c),
    tick: (p, c) => lettering(p, 'tick', c),
  },
}
export default artnouveau
