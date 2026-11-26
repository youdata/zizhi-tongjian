// 水墨 (ink wash) as a page theme: ink in five tones on xuan paper, washes that bleed at their edges, bars as brush
// strokes that break into 飞白 (dry brush) at their end, 朱砂 vermilion only for figures and marks of note.
// No hue tells series apart: each takes a tone and a texture (a plain wash, dry-brush streaks, dots, fine lines).
import { set, paint, overlay, letter, rectBox, thin, paintOf, onRamp, isGroup, stroked, inks, onDiverging } from './marks.js'

export const tokens = {
  XUAN: '#f3efe4',                                                   // xuan paper
  JIAO: '#1d1d1b', NONG: '#3b3a36', ZHONG: '#5f5d57', DAN: '#8f8c84', QING: '#c9c5ba',   // 焦 浓 重 淡 清: the five inks
  ZHU: '#b2392b',                                                    // 朱砂, the seal's red
  // a calligraphic serif for Latin (TW-Kai's own Latin is monospaced), then 楷 for Chinese
  KAI: "'Alegreya', 'TW-Kai', 'AR PL UKai CN', 'KaiTi', 'STKaiti', serif",
}
const T = tokens
const SERIES = [T.NONG, T.DAN, T.ZHONG, '#a8a49a', T.JIAO]

// ink soaking into paper: the edge displaced by noise and softened (its region in user space, as tremor's: a level or
// upright line's box has no height or width, and a region relative to it would hide the line)
const bleed = c => c.def('bleed', id => c.make('filter', { id, filterUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, [
  c.make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.045', numOctaves: 3, seed: 3, result: 'n' }),
  c.make('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 3, xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' }),
  c.make('feGaussianBlur', { in: 'd', stdDeviation: 0.45 })]))
// a brush line's uneven edge (in user space: a straight line's box has no height)
const brushed = (c, scale = 1.4) => c.def(`brush-${scale}`, id => c.make('filter', { id, filterUnits: 'userSpaceOnUse', x: -1e5, y: -1e5, width: 2e5, height: 2e5 }, [
  c.make('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.09', numOctaves: 2, seed: 5, result: 'n' }),
  c.make('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale, xChannelSelector: 'R', yChannelSelector: 'G' })]))

// a series' texture over its wash: none, dry-brush streaks, dots (点苔), fine lines
function texture(c, i) {
  const k = ((i % 4) + 4) % 4
  if (k === 0) return null
  return c.def(`tex-${k}`, id => c.make('pattern', { id, patternUnits: 'userSpaceOnUse', width: k === 1 ? 23 : 6, height: k === 1 ? 5 : 6 },
    k === 1 ? [c.make('path', { d: 'M0 1.2h14M17 1.2h6M3 3.6h9M15 3.6h8', stroke: T.XUAN, 'stroke-width': 0.9, opacity: 0.85 })]
      : k === 2 ? [c.make('circle', { cx: 1.5, cy: 1.5, r: 0.75, fill: T.JIAO, opacity: 0.45 }), c.make('circle', { cx: 4.5, cy: 4.5, r: 0.6, fill: T.JIAO, opacity: 0.35 })]
        : [c.make('path', { d: 'M0 6L6 0', stroke: T.JIAO, 'stroke-width': 0.45, opacity: 0.45 })]))
}

// a filled shape as a wash of its series' tone, bleeding at its edge, its texture over it
function wash(p, c, { a = 0.3, edge = 0.5 } = {}) {
  const { colour, i, ground } = c.series(p.getAttribute('fill'))
  // a white box (the plugin's or the page's own) is the paper itself: an ink outline, no wash
  if (ground) return set(p, { fill: T.XUAN, 'fill-opacity': null, opacity: null, stroke: T.ZHONG, 'stroke-width': Math.max(1, edge * 1.6), 'stroke-opacity': 0.85, filter: bleed(c) })
  set(p, { fill: colour, 'fill-opacity': a, opacity: null, stroke: edge ? colour : 'none', 'stroke-width': edge || null, 'stroke-opacity': edge ? 0.55 : null, filter: bleed(c) })
  const t = texture(c, i)
  if (t) overlay(p, c, t, { filter: null })
}

// a bar as one brush stroke: heavy where the brush comes down (its base), lighter along it, breaking into 飞白 at its
// end. The rect keeps its box, so the value still reads.
function stroke(p, c) {
  const { w, h } = rectBox(p)
  if (!(w > 0 && h > 0)) return
  const { colour } = c.series(p.getAttribute('fill')), across = w >= h
  const run = { x1: 0, y1: across ? 0 : 1, x2: across ? 1 : 0, y2: 0 }    // from the base: the left, or the foot
  const ink = c.def(`stroke-${colour.slice(1)}-${across}`, id => c.make('linearGradient', { id, ...run },
    [[0, 0.66], [0.6, 0.46], [1, 0.22]].map(([offset, o]) => c.make('stop', { offset, 'stop-color': colour, 'stop-opacity': o }))))
  set(p, { fill: ink, 'fill-opacity': null, opacity: null, stroke: colour, 'stroke-width': 0.6, 'stroke-opacity': 0.45, rx: 0, ry: 0, filter: bleed(c) })
  // 飞白: paper-coloured streaks along the stroke, shown only toward its end
  const dry = c.def(`dry-${across}`, id => c.make('pattern', { id, patternUnits: 'userSpaceOnUse', width: 31, height: 5, patternTransform: across ? null : 'rotate(90)' },
    [c.make('path', { d: 'M0 1h19M23 1h8M4 3.2h12M19 3.2h12M0 4.4h6', stroke: T.XUAN, 'stroke-width': 1.1 })]))
  const fade = c.def(`dry-fade-${across}`, id => c.make('linearGradient', { id, ...run },
    [[0, '#000'], [0.55, '#000'], [1, '#fff']].map(([offset, s]) => c.make('stop', { offset, 'stop-color': s }))))
  const mask = c.def(`dry-mask-${across}`, id => c.make('mask', { id, maskContentUnits: 'objectBoundingBox' },
    [c.make('rect', { x: 0, y: 0, width: 1, height: 1, fill: fade })]))
  overlay(p, c, dry, { mask, filter: null })
}

// warming stripes and other diverging colours: the cool side in ink, the warm side in vermilion, as deep as it was
const diverge = col => {
  const m = String(col || '').trim().toLowerCase().match(/^#([0-9a-f]{6})$/)
  if (!m) return col
  const [r, , b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))
  return onRamp(col, [T.XUAN, r > b ? T.ZHU : T.NONG])
}

export const shuimo = {
  id: 'shuimo', label: '水墨', tokens, series: SERIES, font: T.KAI, ground: T.XUAN, fonts: ['Alegreya'],
  native: p => inks(p, { ink: T.JIAO, ground: T.XUAN, mid: T.ZHONG }),
  roles: {
    band: (p, c) => wash(p, c, { a: 0.22, edge: 0.5 }),
    area: (p, c) => wash(p, c, { a: 0.16, edge: 0 }),
    // a bar on a track is a reading on a scale: a plain wash; a bar alone is a brush stroke
    bar: (p, c) => p.previousElementSibling?.getAttribute('data-role') === 'track'
      ? set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.5, rx: 0, ry: 0, filter: bleed(c) }) : stroke(p, c),
    node: (p, c) => thin(p) ? set(p, { fill: T.NONG, stroke: 'none', filter: bleed(c) }) : wash(p, c, { a: 0.14, edge: 0.8 }),
    slice: (p, c) => wash(p, c, { a: 0.34, edge: 0.6 }),
    bubble: (p, c) => wash(p, c, { a: 0.24, edge: 1.4 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : wash(p, c, { a: 0.4, edge: 0.4 }),
    // a value on a scale: paper to light ink (labels sit on the marks in ink)
    // a value on a two-sided scale: ink below the middle, vermilion above, the pale grey between
    diverging: p => { const fill = onDiverging(p, [T.NONG, T.QING, T.ZHU]); if (fill) set(p, { fill }) },
    heat: (p, c) => set(p, { fill: onRamp(p.getAttribute('fill'), [T.XUAN, '#d8d3c6', T.DAN]), stroke: T.ZHONG, 'stroke-width': 0.3, 'stroke-opacity': 0.5, filter: bleed(c) }),
    stripe: p => set(p, { fill: diverge(p.getAttribute('fill')) }),
    track: p => isGroup(p) ? paint(p, { stroke: T.QING }) : set(p, { fill: 'none', stroke: T.QING, 'stroke-width': 0.8, rx: 0, ry: 0 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) || !p.getAttribute('fill') ? set(p, { stroke: col }) : set(p, { fill: col, 'fill-opacity': 0.45 }); set(p, { filter: brushed(c) }) },
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.6, (parseFloat(p.getAttribute('stroke-width')) || 1.6) * 1.15), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: brushed(c) }),
    point: (p, c) => set(p, { fill: T.XUAN, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.4 }),
    marker: (p, c) => set(p, { fill: T.XUAN, 'fill-opacity': null, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.3, filter: brushed(c, 1) }),
    link: (p, c) => { set(p, stroked(p) ? { stroke: T.ZHONG } : { fill: T.ZHONG, 'fill-opacity': 0.85 }); set(p, { filter: brushed(c) }) },
    rule: (p, c) => set(p, stroked(p) ? { stroke: T.DAN } : { fill: T.ZHONG, 'fill-opacity': 0.55, filter: bleed(c) }),
    // an icon's disc in pale ink, its strokes in dark ink (a picked picture, an <svg>, keeps its colours)
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.ZHONG } : { fill: T.QING, 'fill-opacity': 0.35, stroke: T.DAN, 'stroke-width': 0.6, filter: bleed(c) })
      if (isGroup(p)) return paint(p, { stroke: T.NONG })
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.NONG } : { fill: T.NONG }) },
    // a card is the paper itself, edged in faint ink
    surface: (p, c) => set(p, { fill: stroked(p) ? 'none' : T.XUAN, 'fill-opacity': null, stroke: T.DAN, 'stroke-width': 0.7, 'stroke-opacity': 0.55, rx: 0, ry: 0, filter: brushed(c, 1) }),
    grid: p => paint(p, { stroke: T.QING, 'stroke-opacity': 0.7, 'stroke-width': 0.5 }),
    axis: (p, c) => { paint(p, { stroke: T.ZHONG }); set(p, { filter: brushed(c, 1) }) },
    swatch: (p, c) => { const { colour, i } = c.series(paintOf(p)); stroked(p) ? set(p, { stroke: colour }) : (set(p, { fill: colour, 'fill-opacity': 0.5, stroke: colour, 'stroke-width': 0.6, rx: 0, ry: 0 }), texture(c, i) && overlay(p, c, texture(c, i))) },
    guide: p => set(p, { stroke: T.ZHU, 'stroke-opacity': 0.85 }),
    leader: p => set(p, { stroke: T.DAN, 'stroke-dasharray': null, 'stroke-width': 0.8 }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.QING, T.DAN, '#a9a59a']).colour, 'fill-opacity': null, opacity: 0.3 }),
    // a map: paper land, pale-ink water, high ground dotted (点苔)
    land: (p, c) => set(p, { fill: T.XUAN, stroke: T.ZHONG, 'stroke-width': 0.6, filter: brushed(c, 1) }),
    water: p => set(p, stroked(p) ? { stroke: T.DAN } : { fill: T.QING, 'fill-opacity': 0.45, stroke: T.DAN, 'stroke-width': 0.5 }),
    relief: (p, c) => { if (stroked(p)) return set(p, { stroke: T.ZHONG, 'stroke-opacity': 0.5 }); set(p, { fill: T.DAN, opacity: 0.25 }); overlay(p, c, texture(c, 2), { opacity: 0.8 }) },
    label: p => letter(p, { font: T.KAI, fill: T.NONG, halo: T.XUAN }),
    value: p => letter(p, { font: T.KAI, fill: T.ZHU, halo: T.XUAN }),
    tick: p => letter(p, { font: T.KAI, fill: T.DAN, halo: T.XUAN }),
    title: p => letter(p, { font: T.KAI, fill: T.JIAO }),
  },
}
