// Celestial Atlas: light marks on midnight blue, with geometry-preserving engraved star fills.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,plainInk,rectBox,onRamp,onDiverging} from './marks.js'
export const tokens = {
  PAPER: '#101c32', DEEP: '#0b1426', INK: '#f3e5c1', MUTED: '#a5b1c8', LIGHT: '#344663',
  GOLD: '#d5af61', BLUE: '#84b8d2', LILAC: '#b7a0d7', ROSE: '#d18b89',
  SEA: '#0a1322', WATERLINE: '#2b4064', HEAT: '#4a6489',
  LANDS: ['#1a2a46', '#1e304f', '#233758', '#283e61', '#2e456a', '#354d74', '#3d567e'],
  HEAD: "'Cormorant Upright', 'Noto Serif CJK SC', serif",
  BODY: "'EB Garamond', 'Noto Serif CJK SC', serif",
  CJK: "'Noto Serif CJK SC', serif",
}
const T=tokens,SERIES=[T.GOLD,T.BLUE,T.LILAC,T.ROSE],OWN=new Set([...Object.values(T).filter(v=>typeof v==='string'&&v.startsWith('#')),...T.LANDS])
function native(p){
 const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
 if(/^(text|tspan)$/i.test(p.tagName)){
  if(plainInk(p.getAttribute('fill'))!=null)set(p,{fill:T.INK})
  if(plainInk(p.getAttribute('stroke'))!=null)set(p,{stroke:T.PAPER})
 }else inks(p,{ink:T.INK,ground:T.PAPER,light:T.INK,mid:T.MUTED})
 for(const [k,v] of keep)p.setAttribute(k,v)
}
function stars(c,colour,i,pale){
 return c.def(`stars-${i%4}-${pale}`,id=>c.make('pattern',{id,width:24,height:24,patternUnits:'userSpaceOnUse'},[
  c.make('path',{d:['M12 7V17M7 12H17','M4 4L8 8M4 8L8 4M16 16L20 20M16 20L20 16','M0 12H24M12 0V24','M0 24L24 0M-12 24L12 0M12 24L36 0'][i%4],fill:'none',stroke:pale?colour:T.PAPER,'stroke-width':.65,opacity:pale?.48:.55}),
  c.make('circle',{cx:3,cy:19,r:.8,fill:pale?colour:T.PAPER,opacity:.65})]))
}
function mark(p,c,{pale=false}={}){
 const {colour,i,ground}=c.series(paintOf(p))
 if(stroked(p))return set(p,{fill:'none',stroke:colour})
 if(isGroup(p))return paint(p,{stroke:colour})
 set(p,{fill:ground||pale?T.DEEP:colour,stroke:ground?T.LIGHT:colour,'stroke-width':.9,'fill-opacity':null,rx:0,ry:0})
 if(!ground)overlay(p,c,stars(c,colour,i,pale))
}
function card(p,c){
 set(p,{fill:stroked(p)?'none':T.DEEP,stroke:T.GOLD,'stroke-width':.9,'fill-opacity':null,rx:0,ry:0})
 if(p.tagName.toLowerCase()!=='rect')return
 const {x,y,w,h}=rectBox(p);if(w<100||h<55)return
 p.after(c.make('rect',{x:x+5,y:y+5,width:w-10,height:h-10,fill:'none',stroke:T.LIGHT,'stroke-width':.7,'pointer-events':'none'}))
}
function type(p,role,c){
 const cjk=/[\u2e80-\u9fff\uac00-\ud7af]/u.test(p.textContent||'')
 const heading=role==='title'&&(parseFloat(p.getAttribute('font-size'))||0)>=32
 letter(p,{font:cjk?T.CJK:heading?T.HEAD:T.BODY,fill:role==='value'||heading?T.GOLD:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
 if(heading)set(p,{'font-weight':400})
 const block=c&&onBlock(p)
 if(block&&!block.heat&&slip(p,block,c))return set(p,{fill:T.INK,stroke:null,'stroke-width':null,'paint-order':null})
 if(block)set(p,{fill:T.INK,stroke:T.DEEP,'stroke-width':3.2,'stroke-opacity':.9,'paint-order':'stroke','stroke-linejoin':'round'})
}
// colour sense: a plugin's own colour goes to the nearest of the theme's inks by hue — reds and pinks rose, greens,
// teals and blues blue, violets lilac, yellows and oranges gold; a pale tint stays a tint (a midnight surface)
const rgbOf=col=>{const m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(col||'').trim());if(!m)return null
 const h=m[1].length===3?[...m[1]].map(x=>x+x).join(''):m[1];return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)}
const lum=col=>{const v=rgbOf(col);return v?.2126*v[0]+.7152*v[1]+.0722*v[2]:null}
const pale=col=>(lum(col)??0)>.6
function chartInk(col){
 const v=rgbOf(col);if(!v)return T.INK
 const [r,g,b]=v,mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<.08)return mx>.5?T.INK:T.MUTED
 let h=mx===r?((g-b)/(mx-mn))%6:mx===g?(b-r)/(mx-mn)+2:(r-g)/(mx-mn)+4;h=(h*60+360)%360
 return h<20||h>=320?T.ROSE:h<70?T.GOLD:h<255?T.BLUE:T.LILAC
}
// an icon: a disc or plate behind a glyph becomes a midnight medallion ringed in the matching ink; a glyph on it is
// ivory, a coloured glyph its ink; a pale heavy mark (a quote's marks) gold
function icon(p,c){
 if(isGroup(p))return paint(p,{stroke:T.INK})
 const tag=p.tagName.toLowerCase(),col=paintOf(p),plain=plainInk(col)
 const heavy=n=>!!n&&(parseFloat(n.getAttribute('stroke-width'))||0)>=5
 if(stroked(p))return set(p,{stroke:plain!=null?T.INK:pale(col)&&heavy(p)?T.GOLD:pale(col)?T.MUTED:chartInk(col)})
 if(pale(col)&&plain==null&&p.nextElementSibling?.getAttribute('stroke')===col&&heavy(p.nextElementSibling))return set(p,{fill:T.GOLD,stroke:'none'})
 if(/^(circle|rect|ellipse)$/.test(tag)){
  const ring=plain!=null?T.GOLD:chartInk(col)
  return set(p,{fill:T.DEEP,stroke:ring,'stroke-width':pale(col)?1:1.5,'fill-opacity':null,opacity:null})
 }
 set(p,{fill:plain!=null?T.INK:pale(col)?T.GOLD:chartInk(col),'fill-opacity':null,opacity:null})
}
// a word printed on a coloured block (a stacked bar's share, a treemap's cell): a midnight slip with a gold rule
// under it when it fits, else (and on a heat cell, whose tiles would carry slips unevenly) ivory with a dark rim
const central=p=>/^(middle|central)$/.test(p.getAttribute('dominant-baseline')||'')
const BLOCKS=new Set(['bar','cell','band','swatch','slice','heat'])
const guess=(txt,size)=>[...txt].reduce((w,ch)=>w+size*(/[⺀-鿿가-힯]/u.test(ch)?1:/[0-9A-Z%]/.test(ch)?.62:/[\s.,·:;'’]/.test(ch)?.3:.52),0)
function onBlock(p){
 const x=parseFloat(p.getAttribute('x')),size=parseFloat(p.getAttribute('font-size'))||12
 const y=parseFloat(p.getAttribute('y'))-(central(p)?0:size*.35)
 if(!Number.isFinite(x)||!Number.isFinite(y))return null
 for(const scope of [p.parentNode,p.parentNode?.parentNode]){
  if(!scope?.querySelectorAll)continue
  for(const r of scope.querySelectorAll('rect[data-role]')){
   if(!BLOCKS.has(r.getAttribute('data-role')))continue
   const rx=parseFloat(r.getAttribute('x'))||0,ry=parseFloat(r.getAttribute('y'))||0,rw=parseFloat(r.getAttribute('width'))||0,rh=parseFloat(r.getAttribute('height'))||0
   if(x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh)return (lum(r.getAttribute('fill'))??0)<.3?null:{x:rx,y:ry,w:rw,h:rh,heat:r.getAttribute('data-role')==='heat'}   // a midnight cell: no block
  }
 }
 return null
}
function slip(p,block,c){
 const size=parseFloat(p.getAttribute('font-size'))||12,w=guess(p.textContent||'',size)+size*.7,h=size*1.3
 if(w>block.w-4||h>block.h-2)return false
 const anchor=p.getAttribute('text-anchor'),x=parseFloat(p.getAttribute('x')),y=parseFloat(p.getAttribute('y'))
 const left=anchor==='middle'?x-w/2:anchor==='end'?x-w+size*.35:x-size*.35,top=central(p)?y-h/2:y-size
 p.before(c.make('rect',{x:+left.toFixed(1),y:+top.toFixed(1),width:+w.toFixed(1),height:+h.toFixed(1),fill:T.DEEP,stroke:T.GOLD,'stroke-width':.8,'pointer-events':'none'}))
 return true
}
const line=(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linecap':'round','stroke-linejoin':'round'})
export const celestialatlas={
 id: 'celestial-atlas', label: 'Celestial Atlas',tokens,ground:T.PAPER,font:T.BODY,
 fonts: ['Cormorant Upright', 'EB Garamond'],series:SERIES,native,
 roles:{bar:mark,band:mark,area:(p,c)=>mark(p,c,{pale:true}),slice:mark,bubble:(p,c)=>mark(p,c,{pale:true}),
  cell:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),range:mark,line,
  point:(p,c)=>set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.6}),
  marker:p=>set(p,{fill:T.PAPER,stroke:T.GOLD,'stroke-width':1.5}),
  link:p=>set(p,stroked(p)?{stroke:T.BLUE,'stroke-width':1.3}:{fill:T.BLUE}),
  track:p=>paint(p,{fill:'none',stroke:T.LIGHT,'stroke-width':1}),
  rule:p=>set(p,stroked(p)?{stroke:T.GOLD,'stroke-width':.9}:{fill:T.GOLD}),surface:card,
  swatch:mark,icon,
  // a value on a two-sided scale: star blue below the middle, rose above
  diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.ROSE]);if(fill)set(p,{fill})},
  heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.DEEP,T.LIGHT,T.HEAT]),...(p.getAttribute('stroke')&&p.getAttribute('stroke')!=='none'?{stroke:T.PAPER}:{})}),
  stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.DEEP,T.ROSE])}),
  span:p=>set(p,{fill:T.LIGHT,opacity:.45,...(stroked(p)||p.getAttribute('stroke')?{stroke:T.LIGHT}:{})}),grid:p=>paint(p,{stroke:T.MUTED,'stroke-opacity':.28,'stroke-width':.6}),
  axis:p=>{paint(p,{stroke:T.MUTED,'stroke-width':1});if(!stroked(p)&&p.getAttribute('fill'))set(p,{fill:T.MUTED})},guide:p=>set(p,{stroke:T.LILAC,'stroke-dasharray':'5 4'}),
  leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
  land:p=>set(p,{fill:stroked(p)?'none':T.DEEP,stroke:T.MUTED}),
  water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.PAPER,stroke:T.BLUE}),relief:(p,c)=>mark(p,c,{pale:true}),
  title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c)},
 // what no role covers (a figure's placeholder: a pale tint and its rule): its plain inks, then any foreign colour —
 // a tint a midnight surface, its rule the grid's blue, a colour the matching ink
 after(node){for(const p of node.querySelectorAll('[fill],[stroke]')){
  if(p.closest('[data-role],defs,image,svg svg,clipPath,mask,pattern'))continue
  native(p)
  for(const k of ['fill','stroke']){
   const v=(p.getAttribute(k)||'').trim().toLowerCase()
   if(!v||v==='none'||v.startsWith('url(')||OWN.has(v)||!rgbOf(v)||plainInk(v)!=null)continue
   p.setAttribute(k,pale(v)?(k==='fill'?T.DEEP:T.LIGHT):chartInk(v))
  }
 }}
}
export default celestialatlas
