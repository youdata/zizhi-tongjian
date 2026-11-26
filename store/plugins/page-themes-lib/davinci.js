// The da Vinci notebook as a page theme: iron-gall ink and sanguine on parchment, hatching for tone, a hand's tremor.
// Tokens are styles/davinci/davinci.py's (test/test_themes.py checks they agree).
import { set, paint, hatch, tremor, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, onDiverging, mix } from './marks.js'

export const tokens = {
  PARCH: '#e8d9b5', INK: '#47301f', INK2: '#6b4f36', SANG: '#a3462a', WASH: '#8b5e34', WATER: '#5f7f78',
  RIV: '#3e4d45', SEA: '#d9d3b4', LAKE: '#b9c3a8',
  KAI: "slideyouran, 'AR PL UKai CN', 'TW-Kai', 'KaiTi', serif",
  LATIN: "'Alegreya', slideyouran, 'AR PL UKai CN', 'TW-Kai', 'KaiTi', serif",
}
const T = tokens
// series in turn: sanguine, water, ink, ochre — and a hatching direction each, so colour is never the only difference
const SERIES = [T.SANG, T.WATER, T.INK2, T.WASH]

// a filled shape: a pale wash of its series' colour, hatched over (each series its own direction), an inked edge
function washed(part, ctx, { wash = 0.16, step = 4.6, edge = 0.7 } = {}) {
  const { colour, i } = ctx.series(part.getAttribute('fill'))
  set(part, { fill: colour, 'fill-opacity': wash, opacity: null, stroke: edge ? T.INK : 'none', 'stroke-width': edge, 'stroke-opacity': 0.75, filter: tremor(ctx, 0.6) })
  overlay(part, ctx, hatch(ctx, { step, sign: i % 2 ? 1 : -1, stroke: T.INK, opacity: 0.45 }))
}

// text: Latin in Alegreya italic, as the notebooks' cursive; Chinese upright in 悠然小楷 (an italic would only slant it).
// Bold stays upright: there is no Alegreya bold italic, and a browser's made-up one breaks letters (a grey q).
const CJK = /[\u3000-\u9fff\uff00-\uffef]/
const bold = p => /^(bold|[6-9]00)$/.test(p.getAttribute('font-weight') || '')
const hand = (p, ink, halo) => { letter(p, { font: T.LATIN, fill: ink, halo }); set(p, { 'font-style': CJK.test(p.textContent) || bold(p) ? null : 'italic' }) }

export const davinci = {
  id: 'davinci', label: 'da Vinci notebook', tokens, series: SERIES, font: T.LATIN, ground: T.PARCH, fonts: ['Alegreya', 'slideyouran'],
  // a shape drawn in the editor itself: black and greys in iron-gall ink, white the parchment
  native: p => inks(p, { ink: T.INK, ground: T.PARCH, mid: T.INK2 }),
  roles: {
    band: (p, c) => washed(p, c, { wash: 0.14, step: 5.5, edge: 0.6 }),
    area: (p, c) => washed(p, c, { wash: 0.12, step: 6, edge: 0 }),
    bar: (p, c) => { set(p, { rx: 0, ry: 0 }); washed(p, c, { wash: 0.22, step: 4.2, edge: 0.9 }) },
    node: (p, c) => thin(p) ? set(p, { fill: T.INK, 'fill-opacity': 0.85, stroke: T.INK, 'stroke-width': 0.8, filter: tremor(c, 0.5) })
      : washed(p, c, { wash: 0.12, step: 6, edge: 1 }),
    slice: (p, c) => washed(p, c, { wash: 0.2, step: 4.6, edge: 0.7 }),
    bubble: (p, c) => washed(p, c, { wash: 0.16, step: 5, edge: 0.9 }),
    cell: (p, c) => isGroup(p) ? paint(p, { stroke: c.series(p.getAttribute('stroke')).colour }) : washed(p, c, { wash: 0.3, step: 4.2, edge: 0.5 }),
    // an icon's disc or tile: a sanguine wash ringed in ink; its strokes and glyphs in ink (a picked picture, an <svg>, keeps its own colours)
    icon: (p, c) => { const tag = p.tagName.toLowerCase()
      if (tag === 'circle' || tag === 'rect') return set(p, stroked(p) ? { stroke: T.INK2, filter: tremor(c, 0.5) } : { fill: T.SANG, 'fill-opacity': 0.1, stroke: T.INK2, 'stroke-width': 0.7, filter: tremor(c, 0.5) })
      if (isGroup(p)) return paint(p, { stroke: T.INK })
      if (tag === 'path') set(p, stroked(p) ? { stroke: T.INK } : { fill: T.INK }) },
    // a marker carries an ink number, and may sit on a photograph: an opaque parchment disc ringed in its series' colour
    marker: (p, c) => set(p, { fill: T.PARCH, 'fill-opacity': null, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.6, filter: tremor(c, 0.5) }),
    // connectors in ink; a diagram's kinds of link (a colour each) kept apart
    link: (p, c) => { const col = c.scale('link', paintOf(p), [T.INK2, T.SANG, T.WATER]).colour; set(p, stroked(p) ? { stroke: col } : { fill: col, 'fill-opacity': 0.8 }); set(p, { filter: tremor(c, 0.7) }) },
    rule: p => set(p, stroked(p) ? { stroke: T.SANG } : { fill: T.SANG, 'fill-opacity': 0.7 }),
    // a map: the parchment for land, the notebook's sea and lakes, rivers in river ink, high ground hatched
    land: (p, c) => set(p, { fill: T.PARCH, stroke: T.INK2, 'stroke-width': 0.6, filter: tremor(c, 0.5) }),
    water: p => set(p, stroked(p) ? { stroke: T.RIV, 'stroke-opacity': 0.8 } : { fill: T.SEA, stroke: T.WATER, 'stroke-width': 0.5 }),
    relief: (p, c) => { if (stroked(p)) return set(p, { stroke: T.WASH, 'stroke-opacity': 0.55 }); set(p, { fill: T.WASH, opacity: 0.18 }); overlay(p, c, hatch(c, { step: 4.2, sign: -1, stroke: T.INK, opacity: 0.5 })) },
    track: (p, c) => isGroup(p) ? paint(p, { stroke: T.INK2, 'stroke-opacity': 0.35 }) : set(p, { fill: 'none', stroke: T.INK2, 'stroke-width': 0.6, 'stroke-opacity': 0.6, rx: 0, ry: 0, filter: tremor(c, 0.4) }),
    range: (p, c) => { const col = c.series(paintOf(p)).colour; p.getAttribute('fill') && p.getAttribute('fill') !== 'none' ? set(p, { fill: col, 'fill-opacity': 0.5 }) : set(p, { stroke: col }); set(p, { filter: tremor(c, 0.6) }) },
    // the ramp stops at sanguine, not ink: labels on the marks are set in ink
    // a value on a two-sided scale: the water wash below the middle, sanguine above
    diverging: p => { const fill = onDiverging(p, [T.WATER, mix(T.PARCH, T.INK2, 0.18), T.SANG]); if (fill) set(p, { fill }) },
    heat: p => set(p, { fill: onRamp(p.getAttribute('fill'), [T.PARCH, T.SANG]), stroke: T.INK, 'stroke-width': 0.4, 'stroke-opacity': 0.6 }),
    line: (p, c) => {
      set(p, { stroke: c.series(p.getAttribute('stroke')).colour, 'stroke-width': Math.max(1.2, parseFloat(p.getAttribute('stroke-width')) || 1.6), 'stroke-linecap': 'round', filter: tremor(c, 0.8) })
    },
    point: (p, c) => set(p, { fill: T.PARCH, stroke: c.series(paintOf(p)).colour, 'stroke-width': 1.4 }),
    surface: (p, c) => {
      // a white plate or card becomes the parchment itself, ruled in faded ink — opaque, so a plate under a label still
      // hides the line it sits on (a link's label); an outline the plugin left unfilled stays unfilled
      set(p, { fill: stroked(p) ? 'none' : T.PARCH, 'fill-opacity': null, stroke: T.INK2, 'stroke-width': 0.8, 'stroke-opacity': 0.6, rx: p.getAttribute('rx') ? 2 : null, filter: tremor(c, 0.4) })
    },
    grid: p => { paint(p, { stroke: T.INK2, 'stroke-opacity': 0.28, 'stroke-dasharray': '1 3' }) },
    axis: (p, c) => { paint(p, { stroke: T.INK }); set(p, { filter: tremor(c, 0.6) }) },
    swatch: (p, c) => set(p, { fill: c.series(p.getAttribute('fill')).colour, stroke: T.INK, 'stroke-width': 0.6, rx: 0, ry: 0 }),
    guide: p => set(p, { stroke: T.SANG, 'stroke-opacity': 0.8 }),
    leader: p => set(p, { stroke: T.SANG, 'stroke-dasharray': null, 'stroke-width': 0.8 }),
    // shaded ranges: each colour the plugin used for them (a gauge's zones, rows) one of the theme's, faint
    span: (p, c) => set(p, { fill: c.scale('span', p.getAttribute('fill'), [T.WASH, T.WATER, T.SANG]).colour, 'fill-opacity': null, opacity: 0.16 }),
    label: p => hand(p, T.INK, T.PARCH),
    value: p => hand(p, T.SANG, T.PARCH),
    tick: p => hand(p, T.INK2, T.PARCH),
    title: p => hand(p, T.INK),
  },
}
