// Transit Wayfinding: route inks, station rings, precise signs; supplied geometry stays exact.
import {set,paint,letter,paintOf,stroked,isGroup,inks,onRamp,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#ffffff', INK: '#162b3a', MUTED: '#52636e', LIGHT: '#e3e9ed',
  BLUE: '#1464b4', RED: '#c8423a', TEAL: '#007f78', PURPLE: '#7354a5',
  PALE_BLUE: '#e4effa', PALE_RED: '#fae9e6', PALE_TEAL: '#e0f1ee', PALE_PURPLE: '#eee9f5',
  WATER: '#dceef5', LAND: '#f5f6f4',
  // the map's geography layer (the Python pack's map calls): the water's edge, rivers, high ground, spot heights
  COAST: '#8fbfd6', RIVER: '#a9d3e6', HIGH_1: '#eceeea', HIGH_2: '#e2e6e0', SPOT: '#8a979f',
  HEAD: "'Inter', 'Noto Sans SC', sans-serif",
  BODY: "'Inter', 'Noto Sans SC', sans-serif",
  CJK: "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif",
}
const T=tokens,SERIES=[T.BLUE,T.RED,T.TEAL,T.PURPLE],PALE=[T.PALE_BLUE,T.PALE_RED,T.PALE_TEAL,T.PALE_PURPLE]
const OWN=new Set(Object.values(T).filter(v=>v.startsWith('#')))
const hollow=p=>['none','transparent'].includes(String(p.getAttribute('fill')).trim().toLowerCase())||p.getAttribute('fill-opacity')==='0'
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function mark(p,c,{pale=false}={}){
  const {colour,i,ground}=c.series(paintOf(p))
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p)||hollow(p))return set(p,{stroke:colour})
  set(p,{fill:ground?T.PAPER:pale?PALE[i%PALE.length]:colour,
    stroke:pale&&!ground?colour:'none','stroke-width':pale?1.5:null,'fill-opacity':null})
  // Measured rectangles keep their complete envelope, including zero-length bars.
  if(p.tagName.toLowerCase()==='rect')set(p,{rx:0,ry:0})
}
function route(p,c){
  const colour=c.series(paintOf(p)).colour
  if(isGroup(p))return paint(p,{stroke:colour,'stroke-linecap':'round','stroke-linejoin':'round'})
  return set(p,stroked(p)?{stroke:colour,'stroke-linecap':'round','stroke-linejoin':'round'}:{fill:colour})
}
// A chart's series line is drawn as a route: at least 3.5 wide, as a network map's lines are bold.
function line(p,c){
  route(p,c)
  for(const n of isGroup(p)?p.querySelectorAll('path,polyline,line'):[p])
    if(stroked(n))set(n,{'stroke-width':Math.max(parseFloat(n.getAttribute('stroke-width'))||2,3.5)})
}
function station(p,c){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  // No invented ring/radius: a circle remains a circle; an authored diamond remains a diamond.
  set(p,{fill:hollow(p)?p.getAttribute('fill'):T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':2.5})
}
function rule(p){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  set(p,stroked(p)?{stroke:T.INK,'stroke-width':2}:{fill:T.INK})
  if(!stroked(p)||p.tagName.toLowerCase()!=='path')return
  const d=p.getAttribute('d')||'',commands=d.match(/[a-df-z]/gi)||[]
  if(commands.filter(k=>k==='M').length!==1||commands.some(k=>!['M','L','C','Q','S','T'].includes(k)))return
  const xy=(d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number)
  if(xy.length<4)return
  const [x,y]=xy,[ex,ey]=xy.slice(-2)
  // Decorative rules alone may straighten, with their endpoints kept. Never a data/guide/link path.
  if(Math.abs(ex-x)>=200&&Math.abs(ey-y)<.5)set(p,{d:`M${x} ${y}L${ex} ${ey}`})
}
function after(node,c){
  // Known empty infographic figure slots are neutral furniture; supplied pictures are untouched.
  const slots=[...node.querySelectorAll('[data-ig-placeholder] > rect')]
  if(c.el?.tagName==='nx-infographic')slots.push(...node.querySelectorAll('rect[fill="#eef2ff"][stroke="#c7d2fe"]'))
  for(const p of slots)set(p,{fill:T.LAND,stroke:T.LIGHT})
  for(const p of node.querySelectorAll('text:not([data-role])')){
    if(p.closest('[data-role]'))continue
    if(p.getAttribute('fill')==='#64748b')set(p,{fill:T.MUTED})
  }
  // A collision label's card was measured in the CJK face it was given; Inter's figures are wider and run out of it.
  for(const p of node.querySelectorAll('text.nx-label-text'))
    if(/[⺀-鿿가-힯]/u.test(p.textContent||''))set(p,{'font-family':T.CJK})
}
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const a=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return a[0]*.2126+a[1]*.7152+a[2]*.0722
}
function type(p,role,c){
  if(c?.native&&p.getAttribute('data-transit-type')==='authored')return
  letter(p,{font:/[⺀-鿿가-힯]/u.test(p.textContent||'')?T.CJK:T.BODY,fill:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  // Labels and ticks keep the weight they were measured at: a heavier one runs out of its box or label.
  if(role==='title'||role==='value')set(p,{'font-weight':role==='title'?750:700})
  if(role==='value'||role==='tick')set(p,{'font-variant-numeric':'tabular-nums'})
  // Embedded values need readable text over solid route inks and intermediate heat colours.
  let prev=p.previousElementSibling
  while(prev&&(!prev.hasAttribute('data-role')||/^(label|value)$/.test(prev.getAttribute('data-role'))))prev=prev.previousElementSibling
  if(prev?.tagName.toLowerCase()!=='rect'||! /^(bar|cell|heat|node|slice)$/.test(prev.getAttribute('data-role')))return
  const n=k=>parseFloat(prev.getAttribute(k))||0,x=parseFloat(p.getAttribute('x')),y=parseFloat(p.getAttribute('y'))
  if(!(x>=n('x')&&x<=n('x')+n('width')&&y>=n('y')&&y<=n('y')+n('height')))return
  const bg=luminance(prev.getAttribute('fill'))
  const contrast=col=>{const v=luminance(col);return(Math.max(bg,v)+.05)/(Math.min(bg,v)+.05)}
  const chosen=contrast(T.PAPER)>contrast(T.INK)?T.PAPER:T.INK
  set(p,{fill:chosen})
  if(contrast(chosen)<4.5)set(p,{fill:T.INK,stroke:T.PAPER,'stroke-width':2,'paint-order':'stroke','stroke-linejoin':'round'})
}
export const transitwayfinding={id: 'transit-wayfinding', label: 'Transit Wayfinding',tokens,
  ground:T.PAPER,font:T.BODY,fonts: ['Inter', 'Noto Sans SC'],series:SERIES,native,after,
  roles:{
    bar:(p,c)=>mark(p,c),cell:(p,c)=>mark(p,c),
    band:(p,c)=>mark(p,c,{pale:true}),area:(p,c)=>mark(p,c,{pale:true}),slice:(p,c)=>mark(p,c,{pale:true}),
    bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),range:(p,c)=>mark(p,c,{pale:true}),
    line,link:route,point:station,marker:station,
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.LIGHT}:{fill:T.LIGHT,stroke:'none'}),
    surface:p=>set(p,{fill:hollow(p)?p.getAttribute('fill'):T.PAPER,stroke:T.INK,'stroke-width':1.2,rx:0,ry:0}),
    rule,
    icon:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.PAPER,stroke:T.INK,'stroke-width':1.5}),
    swatch:(p,c)=>mark(p,c),
    // a value on a two-sided scale: line blue below the middle, line red above
    diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.PALE_BLUE,T.BLUE,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.PALE_BLUE,T.BLUE,T.INK])}),
    span:(p,c)=>{
      const colour=c.scale('span',p.getAttribute('fill'),PALE).colour
      return set(p,{fill:colour,stroke:p.getAttribute('stroke')&&p.getAttribute('stroke')!=='none'?colour:null,opacity:.6})
    },
    grid:p=>paint(p,{stroke:T.LIGHT,'stroke-width':.7}),axis:p=>{paint(p,{stroke:T.MUTED,'stroke-width':1});if(!stroked(p)&&p.getAttribute('fill'))set(p,{fill:T.MUTED})},
    guide:p=>set(p,{stroke:T.RED,'stroke-dasharray':p.getAttribute('stroke-dasharray')||'6 4'}),
    leader:p=>set(p,{stroke:T.MUTED,'stroke-width':1}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.LIGHT}),
    water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:'none'}),
    relief:p=>set(p,stroked(p)?{stroke:T.MUTED}:{fill:T.LIGHT}),
    title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c),
  },
}
export default transitwayfinding
