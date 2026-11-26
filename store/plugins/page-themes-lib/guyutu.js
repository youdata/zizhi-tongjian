// The 古舆图 (a Ming map) as a page theme: ink and seal red on aged paper, 石青/石绿 washes, bars as brush-rack peaks,
// cards framed with a ruled inner line (栏). Tokens are styles/guyutu/guyutu.py's (test/test_themes.py checks them).
import { set, paint, letter, hump, cun, rectBox, thin, paintOf, onRamp, isGroup, stroked, inks, onDiverging, mix } from './marks.js'

export const tokens = {
  PAPER: '#e8d6ab', LAND: '#eddcb2', SEA: '#d3d2ae', CARD: '#f3e6c4', INK: '#2b2118', INK2: '#4e4030', MUTE: '#806c50', RED: '#a92c1c',
  RIVER: '#9fb7a8', GRID: '#7d6440', PEAK: ['#3e6a6b', '#7a9468', '#e6d4a4'],
  TITLE: "'書體坊顏體㊣', 'Noto Serif CJK TC', serif", DATA: "'Noto Serif CJK SC', 'Songti SC', serif",
}
const T = tokens
// series in turn: seal red, deep 石青, 石绿, ochre, ink — lines in them, fills as their washes
const SERIES = [T.RED, T.PEAK[0], T.PEAK[1], '#b39a62', T.INK2]

const peakFill = c => c.def('peak', id => c.make('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
  T.PEAK.map((colour, i) => c.make('stop', { offset: i / 2, 'stop-color': colour }))))

// a bar as mountains: one peak for an upright bar, a range for a lying one, its foot on the bar's base and its far
// end where the bar ended, so the value still reads
function mountains(p, c) {
  const { x, y, w, h } = rectBox(p)
  if (!(w > 0 && h > 0)) return null
  const g = c.make('g', { opacity: p.getAttribute('opacity') })
  const peak = (cx, foot, ph, half) => {
    g.appendChild(c.make('path', { d: hump(cx, foot, ph, half), fill: peakFill(c), stroke: T.INK, 'stroke-width': ph > 10 ? 1.1 : 0.8, 'stroke-linejoin': 'round' }))
    if (ph > 11) g.appendChild(c.make('path', { d: cun(cx, foot, ph, half), fill: 'none', stroke: T.INK, 'stroke-width': 0.7, opacity: 0.7 }))
  }
  if (h >= w) peak(x + w / 2, y + h, h, w * 0.55)
  else {
    const n = Math.max(1, Math.round(w / (h * 0.95))), half = w / n / 2
    for (let i = 0; i < n; i++) peak(x + half * (2 * i + 1), y + h, h * (i === n - 1 ? 1 : 0.82 + 0.12 * Math.sin(i * 2.1)), half * 1.12)
    g.appendChild(c.make('path', { d: `M${x} ${y + h}H${x + w}`, stroke: T.INK, 'stroke-width': 1 }))
  }
  return g
}

export const guyutu = {
  id: 'guyutu', label: '古舆图', tokens, series: SERIES, font: T.DATA, ground: T.CARD, fonts: ['書體坊顏體㊣'],
  native: p => inks(p, { ink: T.INK, ground: T.CARD, mid: T.INK2 }),
  roles: {
    band: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.38, stroke: T.INK2, 'stroke-width': 0.9, 'stroke-opacity': 0.8 }),
    area: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.25, opacity: null }),
    // a bar on a track is a reading on a scale, not a ranking: an ink wash, not mountains
    bar: (p, c) => p.previousElementSibling?.getAttribute('data-role') === 'track'
      ? set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.6, stroke: T.INK, 'stroke-width': 0.8, rx: 0, ry: 0 }) : mountains(p, c),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour })
      : set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.45, stroke: T.INK2, 'stroke-width': 0.6 }),
    // an icon in seal red, on a card-paper disc ringed like a seal
    icon: p => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.RED } : { fill: T.CARD, stroke: T.RED, 'stroke-width': 1.2 })
      if (isGroup(p)) return paint(p, { stroke: T.RED })
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.RED } : { fill: T.RED }) },
    marker: (p, c) => set(p, { fill: T.CARD, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.8 }),
    link: (p, c) => { const col = c.scale('link', paintOf(p), [T.INK2, T.RED, T.PEAK[0]]).colour; set(p, stroked(p) ? { stroke: col } : { fill: col, 'fill-opacity': 0.85 }) },
    rule: p => set(p, stroked(p) ? { stroke: T.RED } : { fill: T.RED }),
    // a map in the map's own colours: land and sea grounds, rivers in 石青, high ground in 石绿
    land: p => set(p, { fill: T.LAND, stroke: T.INK2, 'stroke-width': 0.8 }),
    water: p => set(p, stroked(p) ? { stroke: T.RIVER } : { fill: T.SEA, stroke: T.INK2, 'stroke-width': 0.5 }),
    relief: p => set(p, stroked(p) ? { stroke: T.PEAK[0], 'stroke-opacity': 0.6 } : { fill: T.PEAK[1], opacity: 0.35 }),
    track: p => isGroup(p) ? paint(p, { stroke: T.MUTE, 'stroke-opacity': 0.45 }) : set(p, { fill: T.CARD, stroke: T.INK2, 'stroke-width': 0.7, rx: 0, ry: 0 }),
    node: (p, c) => thin(p) ? set(p, { fill: T.INK2, stroke: T.INK, 'stroke-width': 1 })
      : set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.3, stroke: T.INK, 'stroke-width': 1.1 }),
    slice: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.42, stroke: T.INK2, 'stroke-width': 0.8 }),
    bubble: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.32, stroke: T.INK, 'stroke-width': 1.1 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; p.getAttribute('fill') && p.getAttribute('fill') !== 'none' ? set(p, { fill: col, 'fill-opacity': 0.55 }) : set(p, { stroke: col }) },
    // the ramp stops at 石绿 and a pale 石青: labels on the marks are set in ink
    // a value on a two-sided scale: the blue-green below the middle, cinnabar above
    diverging: p => { const fill = onDiverging(p, ['#6f9493', mix(T.CARD, T.MUTE, 0.22), T.RED]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.CARD, T.PEAK[1], '#6f9493']), stroke: T.INK, 'stroke-width': 0.4 }),
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.4, parseFloat(p.getAttribute('stroke-width')) || 1.6) }),
    point: (p, c) => set(p, { fill: T.CARD, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.6 }),
    surface: (p, c) => {
      // an outline the plugin left unfilled (a map's frame, drawn over the map) stays unfilled
      set(p, { fill: stroked(p) ? 'none' : T.CARD, 'fill-opacity': null, stroke: T.INK, 'stroke-width': 1, 'stroke-opacity': null, rx: 0, ry: 0 })
      const { x, y, w, h } = rectBox(p)
      if (p.tagName.toLowerCase() === 'rect' && w > 24 && h > 24)   // the ruled inner line of a frame (栏)
        p.after(c.make('rect', { x: x + 4, y: y + 4, width: w - 8, height: h - 8, fill: 'none', stroke: T.INK, 'stroke-width': 0.6, 'pointer-events': 'none' }))
    },
    grid: p => paint(p, { stroke: T.GRID, 'stroke-opacity': 0.35, 'stroke-width': 0.6 }),
    axis: p => paint(p, { stroke: T.INK }),
    swatch: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, stroke: T.INK, 'stroke-width': 0.6, rx: 0, ry: 0 }),
    guide: p => set(p, { stroke: T.RED }),
    leader: p => set(p, { stroke: T.INK2 }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), ['#cdb88a', T.RIVER, '#d9a48c']).colour, 'fill-opacity': null, opacity: 0.45 }),
    label: p => letter(p, { font: T.DATA, fill: T.INK2, halo: T.PAPER }),
    value: p => letter(p, { font: T.DATA, fill: T.RED, halo: T.PAPER }),
    tick: p => letter(p, { font: T.DATA, fill: T.MUTE, halo: T.PAPER }),
    title: p => letter(p, { font: T.TITLE, fill: T.INK }),
  },
}
