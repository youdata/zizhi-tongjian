// Ukiyo-e: flat colour plates, indigo keylines, textile patterns, bokashi grading and the publisher's seal.
// Pattern overlays clone data marks exactly; they never displace measured geometry.
import { set, paint, overlay, letter, thin, paintOf, onRamp, isGroup, stroked, inks, rectBox ,onDiverging,mix} from './marks.js'

export const tokens = {
  PAPER: '#f6ebd2', INK: '#1e3551', MUTED: '#526c7c', LIGHT: '#86afbf',
  RED: '#bc4938', GREEN: '#526c5a', WATER: '#bed2cf', INDIGO: '#2c5d86',
  OCHRE: '#c3a052', LAND: '#e3d3ab',
  // a Meiji-cut Mincho for titles and text; Chinese in Noto Serif CJK
  HEAD: "'Shippori Mincho B1', 'Noto Serif CJK SC', serif",
  MINCHO: "'Shippori Mincho', 'Noto Serif CJK SC', serif",
  CJK: "'Noto Serif CJK SC', serif",
  BODY: "'Noto Serif CJK SC', 'Shippori Mincho', serif",   // the pack's page font (Chinese first); words here go by script
}
const T = tokens
const SERIES = [T.INDIGO, T.RED, T.GREEN, T.OCHRE]
// the map pack's land plates (ukiyoe.py PLATES) are its own inks too: a grey-green high plate is not an editor grey
const PLATES = ['#e3d3ab', '#d9c896', '#c8c08e', '#b0b68d', '#97a789', '#7f967f']
const OWN_INKS = new Set([...Object.values(T).filter(v => v.startsWith('#')), ...PLATES])
function native(p) {
  const keep = ['fill','stroke'].map(k => [k,p.getAttribute(k)])
    .filter(([,v]) => OWN_INKS.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for (const [k,v] of keep) p.setAttribute(k,v)
}
// the four kimono patterns of the prints, one a series: seigaiha (overlapping waves), shippō (linked rings),
// asa-no-ha (hemp leaf) and kikkō (tortoiseshell hexagons)
const PATTERNS = [
  ['M-12 12a12 12 0 0 1 24 0a12 12 0 0 1 24 0M0 24a12 12 0 0 1 24 0M-8 12a8 8 0 0 1 16 0M16 12a8 8 0 0 1 16 0M4 24a8 8 0 0 1 16 0'
    + 'M-4 12a4 4 0 0 1 8 0M20 12a4 4 0 0 1 8 0M8 24a4 4 0 0 1 8 0',24,24],
  ['M0 10a10 10 0 1 0 20 0a10 10 0 1 0-20 0M-10 0a10 10 0 1 0 20 0M10 0a10 10 0 1 0 20 0M-10 20a10 10 0 1 0 20 0M10 20a10 10 0 1 0 20 0',20,20],
  ['M0 0L12 7L24 0M0 21L12 14L24 21M12 7V14M0 0V21M24 0V21M0 0L12 14M24 0L12 14M0 21L12 7M24 21L12 7',24,21],
  ['M7 0L14 4V12L7 16L0 12V4ZM7 16V24M14 4L21 0M0 4L-7 0',14,24],
]
function wave(c, colour, i, pale = false) {
  return c.def(`wave-${i % 4}-${colour.replace('#','')}-${pale}`, id => {
    const [d,width,height] = PATTERNS[i % 4]
    return c.make('pattern',{id,width,height,patternUnits:'userSpaceOnUse'},[
      c.make('path',{d,fill:'none',stroke:pale ? colour : T.PAPER,'stroke-width':pale ? .7 : .9,
        opacity:pale ? .24 : .45}),
    ])
  })
}
// ichimonji bokashi: a plate printed darker along its top and graded out — on the colour blocks, a dark lip
function lip(c) {
  return c.def('lip',id=>c.make('linearGradient',{id,x1:0,y1:0,x2:0,y2:1},[
    c.make('stop',{offset:0,'stop-color':T.INK,'stop-opacity':.42}),
    c.make('stop',{offset:.5,'stop-color':T.INK,'stop-opacity':0})]))
}
function plate(p,c,{light=false,edge=1.1}={}) {
  const {colour,i,ground} = c.series(paintOf(p))
  if (stroked(p)) return set(p,{fill:'none',stroke:ground ? T.INK : colour,'stroke-width':edge || 1.1})
  set(p,{fill:ground || light ? T.PAPER : colour,stroke:edge ? T.INK : 'none',
    'stroke-width':edge || null,'fill-opacity':null,opacity:null,rx:0,ry:0})
  if (ground) return
  if (!light) overlay(p,c,lip(c))   // each overlay goes straight after the mark: the lip, added first, prints over the pattern
  overlay(p,c,wave(c,colour,i,light))
}
// bokashi (ぼかし): a plate's colour graded out to the paper, the print's own gradient — for areas under a line
function bokashi(c,colour) {
  return c.def(`bokashi-${colour.replace('#','')}`,id=>c.make('linearGradient',{id,x1:0,y1:0,x2:0,y2:1},[
    c.make('stop',{offset:0,'stop-color':colour,'stop-opacity':.62}),
    c.make('stop',{offset:.55,'stop-color':colour,'stop-opacity':.22}),
    c.make('stop',{offset:1,'stop-color':colour,'stop-opacity':0})]))
}
function graded(p,c) {
  const {colour,ground} = c.series(paintOf(p))
  if (stroked(p)) return set(p,{stroke:colour})
  set(p,{fill:ground ? T.PAPER : bokashi(c,colour),stroke:'none','fill-opacity':null,opacity:null})
}
// a big filled arc (a title banner's ring) is a colour plate, not an icon: pale water with waves, or the accent plate
const bigArc = p => { const m=/[Aa]\s*([\d.]+)/.exec(p.getAttribute('d')||''); return !!m && +m[1]>=30 }
const lum = col => {
  const s=String(col||'').trim().toLowerCase()
  if (s==='white') return 1
  const m3=/^#([0-9a-f]{3})$/.exec(s), h=m3?[...m3[1]].map(d=>d+d).join(''):(/^#([0-9a-f]{6})$/.exec(s)||[])[1]
  if (!h) return null
  const v=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255); return .2126*v[0]+.7152*v[1]+.0722*v[2]
}
const pale = col => (lum(col) ?? 0) > .6
function plateArc(p,c) {
  if (!pale(paintOf(p)) && c.series(paintOf(p)).i!==0) return plate(p,c,{edge:1})   // the accent arc; the ring itself pale
  set(p,{fill:T.WATER,stroke:T.INK,'stroke-width':1,'fill-opacity':null,opacity:null})
  overlay(p,c,wave(c,T.INDIGO,0,true))
}
// a line printed over a paper keyline, so it reads on patterned plates
function keyLine(p,c) {
  set(p,{stroke:c.series(paintOf(p)).colour,'stroke-width':Math.max(2.4,parseFloat(p.getAttribute('stroke-width'))||2),
    'stroke-linejoin':'round','stroke-linecap':'round'})
  if (isGroup(p)) return
  const k=p.cloneNode(false)
  for (const a of ['data-role','id','class','marker-start','marker-end','marker-mid']) k.removeAttribute(a)
  set(k,{fill:'none',stroke:T.PAPER,'stroke-width':(parseFloat(p.getAttribute('stroke-width'))||2.4)+4,'pointer-events':'none'})
  p.before(k)
}
// the sky of a Hiroshige print: indigo graded down from the top edge (ichimonji bokashi)
function sky(c) {
  return c.def('sky',id=>c.make('linearGradient',{id,x1:0,y1:0,x2:0,y2:1},[
    c.make('stop',{offset:0,'stop-color':T.INDIGO,'stop-opacity':.95}),
    c.make('stop',{offset:.35,'stop-color':T.INDIGO,'stop-opacity':.55}),
    c.make('stop',{offset:1,'stop-color':T.INDIGO,'stop-opacity':0})]))
}
// a card: paper inside an indigo keyline, the sky graded down its top; a large one (700 × 150 and up, a title's
// panel) carries the publisher's seal
// (a red block with its paper border) in the corner of its foot, as a print does
function card(p,c) {
  set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.INK,'stroke-width':1.2,rx:0,ry:0,'fill-opacity':null,opacity:null})
  if (p.tagName.toLowerCase()!=='rect' || stroked(p)) return
  const {x,y,w,h}=rectBox(p), add=[]
  if (w>120 && h>60) add.push(c.make('rect',{x:x+.6,y:y+.6,width:w-1.2,height:Math.min(16,h*.16),fill:sky(c),'pointer-events':'none'}))
  if (w>=700 && h>=150) add.push(c.make('g',{'pointer-events':'none'},[
    c.make('rect',{x:x+w-22,y:y+h-26,width:13,height:17,fill:T.RED,rx:1.2}),
    c.make('rect',{x:x+w-20.2,y:y+h-24.2,width:9.4,height:13.4,fill:'none',stroke:T.PAPER,'stroke-width':.8}),
    c.make('path',{d:`M${x+w-17.6} ${y+h-21}h4.2M${x+w-15.5} ${y+h-21}v8M${x+w-17.6} ${y+h-15.5}h4.2`,
      fill:'none',stroke:T.PAPER,'stroke-width':.9})]))
  p.after(...add)
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
// type: Mincho for titles and text, Chinese in Noto Serif CJK. A word on a plate is printed on a paper slip (or,
// with no room for one, in paper with an indigo rim); every other word is indigo ink with a paper rim.
const CJK = /[\u2e80-\u9fff\uac00-\ud7af]/u
function lettering(p,role,c) {
  const size=parseFloat(p.getAttribute('font-size'))||0, cjk=CJK.test(p.textContent||'')
  letter(p,{font:cjk ? T.CJK : role==='title' ? T.HEAD : T.MINCHO,
    fill:role==='value' ? T.RED : role==='tick' ? T.MUTED : T.INK,halo:T.PAPER})
  if (role==='value' && size>=28) set(p,{'font-size':+(size*.9).toFixed(1)})   // the Mincho figures run wide
  if (role==='title' || role==='value') set(p,{'font-weight':'700'})
  const block=onBlock(p)
  if (block && slip(p,block,c,{fill:T.PAPER,stroke:T.INK,'stroke-width':.7}))
    return set(p,{stroke:null,'stroke-width':null,'paint-order':null})
  if (block) return set(p,{fill:T.PAPER,stroke:T.INK,'stroke-width':3.6,'stroke-opacity':.9,'paint-order':'stroke','stroke-linejoin':'round'})
  if (role!=='title') set(p,{stroke:T.PAPER,'stroke-width':2.6,'paint-order':'stroke','stroke-linejoin':'round'})
}
export const ukiyoe = {
  id: 'ukiyoe', label: 'Ukiyo-e · 浮世絵', tokens, series: SERIES, font: T.MINCHO,
  ground:T.PAPER, fonts: ['Shippori Mincho B1', 'Shippori Mincho'],
  native,
  roles:{
    bar:(p,c)=>plate(p,c), band:(p,c)=>plate(p,c,{edge:.65}),
    area:graded, slice:(p,c)=>plate(p,c),
    bubble:(p,c)=>plate(p,c,{light:true}),
    cell:(p,c)=>isGroup(p) ? paint(p,{stroke:c.series(paintOf(p)).colour}) : plate(p,c,{edge:.6}),
    node:(p,c)=>thin(p) ? set(p,{fill:c.series(paintOf(p)).colour,stroke:T.INK}) : plate(p,c,{light:true,edge:1.5}),
    track:p=>isGroup(p) ? paint(p,{stroke:T.LIGHT}) : set(p,{fill:'none',stroke:T.LIGHT,'stroke-width':1}),
    range:(p,c)=>set(p,stroked(p)?{stroke:c.series(paintOf(p)).colour,'stroke-width':2}:{fill:c.series(paintOf(p)).colour}),
    line:keyLine,
    point:(p,c)=>set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':2}),
    marker:p=>set(p,{fill:T.RED,stroke:T.PAPER,'stroke-width':1.6}),
    link:p=>set(p,stroked(p)?{stroke:T.INK,'stroke-width':1.6}:{fill:T.INK}),
    rule:p=>set(p,stroked(p)?{stroke:T.INK,'stroke-width':2}:{fill:T.INK}),
    surface:card,
    icon:(p,c)=>!isGroup(p)&&!stroked(p)&&bigArc(p)?plateArc(p,c):isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:/^(circle|rect)$/i.test(p.tagName)?T.PAPER:T.INK,stroke:T.INK}),
    // a value on a two-sided scale: indigo below the middle, red above
    diverging:p=>{const fill=onDiverging(p,[T.INDIGO,mix(T.PAPER,T.MUTED,0.25),T.RED]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.WATER,T.LIGHT,T.INDIGO,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.INDIGO])}),
    span:p=>set(p,{fill:T.LIGHT,opacity:.25}),
    grid:p=>paint(p,{stroke:T.LIGHT,'stroke-width':.6,'stroke-dasharray':'2 5'}),
    axis:p=>paint(p,{stroke:T.INK,'stroke-width':1.2}),
    guide:p=>set(p,{stroke:T.RED,'stroke-width':1.5,'stroke-dasharray':'5 4'}),
    leader:p=>set(p,{stroke:T.MUTED,'stroke-width':1,'stroke-dasharray':null}),
    swatch:(p,c)=>plate(p,c,{edge:.6}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.INK,'stroke-width':1.2}),
    water:(p,c)=>stroked(p)?set(p,{stroke:T.INDIGO,'stroke-width':1.5}):plate(p,c,{light:true,edge:.8}),
    relief:(p,c)=>plate(p,c,{light:true,edge:0}),
    title:(p,c)=>lettering(p,'title',c),label:(p,c)=>lettering(p,'label',c),
    value:(p,c)=>lettering(p,'value',c),tick:(p,c)=>lettering(p,'tick',c),
  },
}
export default ukiyoe
