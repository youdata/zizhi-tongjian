// Middle-earth as a page theme, after Tolkien's own maps: black and red ink on parchment, mountains drawn as line-art
// peaks shaded with hatching on one side, uncial lettering for titles with a red initial, places marked with red rings.
// Its fonts come from the font service (fontdex): Uncial Antiqua, IM Fell English. A document names them in
// meta['theme-font-family'] (use_theme does), since the renderer loads only the fonts a document names.
import { set, paint, overlay, letter, rectBox, thin, paintOf, onRamp, isGroup, stroked, tremor, inks, onDiverging, mix } from './marks.js'

export const tokens = {
  VELLUM: '#efe3c4',      // the parchment
  INK: '#2a2118', INK2: '#5a4a36', RED: '#9e2a1e',        // black ink, faded ink, red ink (Thror's map)
  GREEN: '#5b6b3a', OCHRE: '#a8803c', STREAM: '#4f6a7a',  // the coloured maps' woods, plains and waters
  TITLE: "'Uncial Antiqua', 'IM Fell English', 'Noto Serif CJK SC', serif",
  BOOK: "'IM Fell English', 'EB Garamond', 'Noto Serif CJK SC', serif",
}
const T = tokens
const SERIES = [T.INK2, T.RED, T.GREEN, T.OCHRE, T.STREAM]
const FONTS = ['Uncial Antiqua', 'IM Fell English']

// a filled shape as a light wash of its series' colour, edged in ink by a pen that trembles a little
function washed(p, c, { a = 0.26, edge = 0.9 } = {}) {
  const { colour, ground } = c.series(p.getAttribute('fill'))
  set(p, { fill: ground ? T.VELLUM : colour, 'fill-opacity': ground ? null : a, opacity: null, stroke: T.INK, 'stroke-width': edge || null, 'stroke-opacity': edge ? 0.85 : null, filter: tremor(c, 0.6) })
}

// a bar as a range of mountains in the maps' manner: each peak an outline, its right slope hatched; the range starts
// on the bar's base and its last slope ends where the bar ended
function range(p, c) {
  const { x, y, w, h } = rectBox(p)
  if (!(w > 0 && h > 0)) return null
  const col = c.series(p.getAttribute('fill')).colour
  const g = c.make('g', { opacity: p.getAttribute('opacity'), filter: tremor(c, 0.5) })
  const peak = (x0, x1, foot, ph) => {
    const ax = x0 + (x1 - x0) * 0.46, ay = foot - ph
    g.appendChild(c.make('path', { d: `M${x0} ${foot}L${ax} ${ay}L${x1} ${foot}`, fill: T.VELLUM, stroke: T.INK, 'stroke-width': ph > 12 ? 1.1 : 0.8, 'stroke-linejoin': 'round' }))
    const n = Math.max(2, Math.round(ph / 4)), d = []
    for (let i = 1; i < n; i++) {   // hatching down the shadowed (right) slope, short strokes falling to the left
      const t = i / n, sx = ax + (x1 - ax) * t, sy = ay + (foot - ay) * t
      d.push(`M${sx} ${sy}l${-(x1 - ax) * 0.22} ${(foot - ay) * 0.12}`)
    }
    g.appendChild(c.make('path', { d: d.join(''), stroke: col === T.INK2 ? T.INK : col, 'stroke-width': 0.6, fill: 'none' }))
  }
  if (h >= w) peak(x, x + w, y + h, h)
  else {
    const n = Math.max(1, Math.round(w / (h * 1.05))), step = w / n
    for (let i = 0; i < n; i++) peak(x + step * i - (i ? step * 0.15 : 0), x + step * (i + 1), y + h, h * (i === n - 1 ? 1 : 0.78 + 0.16 * Math.abs(Math.sin(i * 1.7))))
    g.appendChild(c.make('path', { d: `M${x} ${y + h}H${x + w}`, stroke: T.INK, 'stroke-width': 0.9 }))
  }
  return g
}

// a title with a red initial, as the maps letter their great names (only plain text: one with tspans keeps its own)
function initial(p) {
  if (p.querySelector('tspan') || p.textContent.trim().length < 3) return
  const s = p.textContent, i = s.search(/\S/)
  p.textContent = s.slice(0, i)
  const first = p.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'tspan')
  first.setAttribute('fill', T.RED); first.textContent = s[i]
  p.append(first, s.slice(i + 1))
}

const bigArc = p => { const m = /[Aa]\s*([\d.]+)/.exec(p.getAttribute('d') || ''); return !!m && +m[1] >= 30 }
const pale = col => { const m = /^#([0-9a-f]{6})$/i.exec(col || ''); if (!m) return false
  const v = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] > 0.6 }

export const middleearth = {
  id: 'middle-earth', label: 'Middle-earth', tokens, series: SERIES, font: T.BOOK, ground: T.VELLUM, fonts: FONTS,
  native: p => inks(p, { ink: T.INK, ground: T.VELLUM, mid: T.INK2 }),
  roles: {
    band: (p, c) => washed(p, c, { a: 0.24, edge: 0.6 }),
    area: (p, c) => washed(p, c, { a: 0.18, edge: 0 }),
    // a bar on a track is a reading on a scale: a red-ink wash; a bar alone is a range of mountains
    bar: (p, c) => p.previousElementSibling?.getAttribute('data-role') === 'track'
      ? set(p, { fill: c.series(p.getAttribute('fill')).colour, 'fill-opacity': 0.55, stroke: T.INK, 'stroke-width': 0.7, rx: 0, ry: 0 }) : range(p, c),
    node: (p, c) => thin(p) ? set(p, { fill: T.INK, stroke: 'none' }) : washed(p, c, { a: 0.16, edge: 1 }),
    slice: (p, c) => washed(p, c, { a: 0.34, edge: 0.7 }),
    bubble: (p, c) => washed(p, c, { a: 0.22, edge: 1 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : washed(p, c, { a: 0.42, edge: 0.5 }),
    // a value on a two-sided scale: the stream blue below the middle, red above
    diverging: p => { const fill = onDiverging(p, [T.STREAM, mix(T.VELLUM, T.INK2, 0.18), T.RED]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.VELLUM, '#d8bd85', '#b98b56']), stroke: T.INK2, 'stroke-width': 0.4 }),
    stripe: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.VELLUM, T.RED]) }),
    track: p => isGroup(p) ? paint(p, { stroke: T.INK2, 'stroke-opacity': 0.4 }) : set(p, { fill: 'none', stroke: T.INK2, 'stroke-width': 0.7, 'stroke-dasharray': '1 2', rx: 0, ry: 0 }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) || !p.getAttribute('fill') ? set(p, { stroke: col }) : set(p, { fill: col, 'fill-opacity': 0.5 }); set(p, { filter: tremor(c, 0.6) }) },
    line: (p, c) => set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.3, parseFloat(p.getAttribute('stroke-width')) || 1.6), 'stroke-linecap': 'round', filter: tremor(c, 0.7) }),
    point: (p, c) => set(p, { fill: T.VELLUM, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.3 }),
    // a place on the map: a red ring
    marker: (p, c) => set(p, { fill: T.VELLUM, 'fill-opacity': null, stroke: T.RED, 'stroke-width': 1.5, filter: tremor(c, 0.4) }),
    link: (p, c) => { set(p, stroked(p) ? { stroke: T.INK } : { fill: T.INK }); set(p, { filter: tremor(c, 0.7) }) },
    rule: p => set(p, stroked(p) ? { stroke: T.RED } : { fill: T.RED, 'fill-opacity': 0.8 }),
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'path' && !stroked(p) && bigArc(p))   // a big ring (a title banner's): a vellum band, its accent arc a red wash
        return !pale(paintOf(p)) && c.series(paintOf(p)).i !== 0 ? washed(p, c, { a: 0.6, edge: 1 })
          : set(p, { fill: T.VELLUM, stroke: T.INK, 'stroke-width': 1.2, filter: tremor(c, 0.4) })
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.RED } : { fill: T.VELLUM, stroke: T.RED, 'stroke-width': 1.1, filter: tremor(c, 0.4) })
      if (isGroup(p)) return paint(p, { stroke: T.INK })
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.INK } : { fill: T.INK }) },
    // a card as a map's cartouche: parchment, a fine line inside a heavier one
    surface: (p, c) => {
      set(p, { fill: stroked(p) ? 'none' : T.VELLUM, 'fill-opacity': null, stroke: T.INK, 'stroke-width': 1.4, 'stroke-opacity': null, rx: 0, ry: 0, filter: tremor(c, 0.5) })
      const { x, y, w, h } = rectBox(p)
      if (p.tagName.toLowerCase() === 'rect' && w > 30 && h > 30)
        p.after(c.make('rect', { x: x + 3.5, y: y + 3.5, width: w - 7, height: h - 7, fill: 'none', stroke: T.INK, 'stroke-width': 0.5, 'pointer-events': 'none' }))
    },
    grid: p => paint(p, { stroke: T.OCHRE, 'stroke-opacity': 0.45, 'stroke-width': 0.5, 'stroke-dasharray': '1 3' }),
    axis: (p, c) => { paint(p, { stroke: T.INK }); set(p, { filter: tremor(c, 0.6) }) },
    swatch: (p, c) => { const col = c.series(paintOf(p)).colour; stroked(p) ? set(p, { stroke: col }) : set(p, { fill: col, 'fill-opacity': 0.5, stroke: T.INK, 'stroke-width': 0.6, rx: 0, ry: 0 }) },
    guide: p => set(p, { stroke: T.RED, 'stroke-dasharray': '5 3' }),
    leader: p => set(p, { stroke: T.INK2, 'stroke-dasharray': null, 'stroke-width': 0.7 }),
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.OCHRE, T.GREEN, T.RED]).colour, 'fill-opacity': null, opacity: 0.16 }),
    land: (p, c) => set(p, { fill: T.VELLUM, stroke: T.INK, 'stroke-width': 0.7, filter: tremor(c, 0.5) }),
    water: p => set(p, stroked(p) ? { stroke: T.STREAM } : { fill: T.STREAM, 'fill-opacity': 0.25, stroke: T.INK2, 'stroke-width': 0.5 }),
    relief: (p, c) => stroked(p) ? set(p, { stroke: T.INK2, 'stroke-opacity': 0.55 }) : set(p, { fill: T.GREEN, opacity: 0.22 }),
    label: p => letter(p, { font: T.BOOK, fill: T.INK, halo: T.VELLUM }),
    value: p => letter(p, { font: T.BOOK, fill: T.RED, halo: T.VELLUM }),
    tick: p => letter(p, { font: T.BOOK, fill: T.INK2, halo: T.VELLUM }),
    // uncial only for a display title (a banner), and a little smaller: its letters are wide (the plugin fitted the line in its own
    // font) and its small t reads as c; a smaller title in the book's face. Both with a red initial.
    title: p => {
      const size = parseFloat(p.getAttribute('font-size')) || 0
      if (size >= 56) letter(p, { font: T.TITLE, fill: T.INK, size: Math.round(size * 0.86 * 10) / 10 })
      else letter(p, { font: T.BOOK, fill: T.INK })
      initial(p)
    },
  },
}
