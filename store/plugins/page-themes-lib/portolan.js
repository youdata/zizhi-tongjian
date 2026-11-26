// Portolan Sea Chart. Every data mark keeps its measured geometry.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,rectBox,onRamp,onDiverging} from './marks.js'
export const tokens = {
  PAPER: "#eee0b9",
  INK: "#352b25",
  MUTED: "#826f52",
  LIGHT: "#d8c79e",
  RED: "#a33e32",
  GREEN: "#50705b",
  BLUE: "#3d6473",
  GOLD: "#b58a3e",
  LAND: "#eadbb6",
  WATER: "#f3e8c8",
  HEAD: "'IM Fell English', 'Noto Serif CJK SC', serif",
  BODY: "'EB Garamond', 'Noto Serif CJK SC', serif",
  CJK: "'Noto Serif CJK SC', serif",
}
const T=tokens,SERIES=[T.RED,T.GREEN,T.BLUE,T.GOLD],OWN=new Set(Object.values(T).filter(v=>v.startsWith('#')))
function native(p){
 const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
 inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
 for(const [k,v] of keep)p.setAttribute(k,v)
}
function bearings(c,colour,i,pale){
 return c.def(`bearings-${i%4}-${pale}`,id=>c.make('pattern',{id,width:48,height:48,patternUnits:'userSpaceOnUse'},[
  c.make('path',{d:['M0 24H48M24 0V48M0 0L48 48M0 48L48 0','M0 12H48M0 36H48M0 0L24 48M24 0L48 48','M12 0V48M36 0V48M0 24H48','M0 0L48 48M-24 0L24 48M24 0L72 48'][i%4],
    fill:'none',stroke:pale?colour:T.PAPER,'stroke-width':.7,opacity:pale?.26:.48})]))
}
function mark(p,c,{pale=false}={}){
 const {colour,i,ground}=c.series(paintOf(p))
 if(stroked(p))return set(p,{fill:'none',stroke:colour})
 if(isGroup(p))return paint(p,{stroke:colour})
 set(p,{fill:ground||pale?T.PAPER:colour,stroke:T.INK,'stroke-width':.8,'fill-opacity':null,rx:0,ry:0})
 if(!ground)overlay(p,c,bearings(c,colour,i,pale))
}
// colours read: lightness, a pale tint, plain white, and a chosen colour's nearest chart ink by hue
const rgbOf=col=>{const m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(col||'').trim());if(!m)return null
 const h=m[1].length===3?[...m[1]].map(d=>d+d).join(''):m[1];return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)}
const lum=col=>{const v=rgbOf(col);return v?.2126*v[0]+.7152*v[1]+.0722*v[2]:null}
const pale=col=>(lum(col)??0)>.6
const white=col=>/^(#fff|#ffffff|white)$/i.test(String(col||'').trim())
function chartInk(col){
 const v=rgbOf(col);if(!v)return T.INK
 const mx=Math.max(...v),mn=Math.min(...v),d=mx-mn
 if(d<.12)return mx<.45?T.INK:T.MUTED
 let h=mx===v[0]?((v[1]-v[2])/d)%6:mx===v[1]?(v[2]-v[0])/d+2:(v[0]-v[1])/d+4;h=(h*60+360)%360
 return h<20||h>=300?T.RED:h<70?T.GOLD:h<170?T.GREEN:T.BLUE
}
function card(p,c){
 set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.INK,'stroke-width':1,rx:0,ry:0,'fill-opacity':null,opacity:null})
 if(p.tagName.toLowerCase()!=='rect')return
 const {x,y,w,h}=rectBox(p)
 if(w<90||h<45)return
 p.after(c.make('rect',{x:x+5,y:y+5,width:w-10,height:h-10,fill:'none',stroke:T.RED,'stroke-width':.55,'pointer-events':'none'}))
 // gilt studs at the corners, as on the charts' neat lines
 if(w>=140&&h>=70)p.after(c.make('path',{d:[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>`M${a-2.6} ${b}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0Z`).join(''),
  fill:T.GOLD,stroke:T.INK,'stroke-width':.6,'pointer-events':'none'}))
}
// a big filled arc (a title banner's ring): a vellum band with the bearings, its accent arc in a chart ink
const bigArc=p=>{const m=/[Aa]\s*([\d.]+)/.exec(p.getAttribute('d')||'');return !!m&&+m[1]>=30}
function ringArc(p,c){
 const col=paintOf(p)
 if(!pale(col)&&c.series(col).i!==0)return mark(p,c)
 set(p,{fill:T.PAPER,'fill-opacity':null,opacity:null,stroke:T.INK,'stroke-width':1})
 overlay(p,c,bearings(c,T.GOLD,0,true))
}
// an icon: a disc or plate behind a glyph goes to vellum, ringed in a chart ink (a rose's ring, with four gilt
// points between the winds); a glyph goes to ink, a pale one (a quote's marks) to red, a check or a cross to its ink
function icon(p,c){
 if(isGroup(p))return paint(p,{stroke:T.INK})
 const tag=p.tagName.toLowerCase(),col=paintOf(p)
 if(!stroked(p)&&bigArc(p))return ringArc(p,c)
 const heavy=n=>!!n&&(parseFloat(n.getAttribute('stroke-width'))||0)>=5
 // a pale mark drawn heavy (a quote's marks: a disc and its thick tail) is a rubric: red
 if(stroked(p))return set(p,{stroke:pale(col)&&heavy(p)?T.RED:white(col)||pale(col)?T.INK:chartInk(col)})
 if(pale(col)&&p.nextElementSibling?.getAttribute('stroke')===col&&heavy(p.nextElementSibling))return set(p,{fill:T.RED,stroke:'none'})
 if(/^(circle|rect|ellipse)$/.test(tag)){
  const pl=pale(col),ink=pl?chartInk(col):c.series(col).colour
  set(p,{fill:T.PAPER,stroke:white(col)?T.INK:ink,'stroke-width':pl?1:1.8,'fill-opacity':null,opacity:null})
  const r=parseFloat(p.getAttribute('r'))||0
  if(tag==='circle'&&!pl&&r>=12){
   const cx=parseFloat(p.getAttribute('cx'))||0,cy=parseFloat(p.getAttribute('cy'))||0,R=r+3.5
   p.after(c.make('g',{'pointer-events':'none'},[
    c.make('circle',{cx,cy,r:R,fill:'none',stroke:ink,'stroke-width':.7}),
    c.make('path',{d:[45,135,225,315].map(a=>{const t=a*Math.PI/180,u=Math.cos(t),v=Math.sin(t)
      return `M${cx+u*(R-2.5)} ${cy+v*(R-2.5)}L${cx+u*(R+4.5)-v*1.6} ${cy+v*(R+4.5)+u*1.6}L${cx+u*(R+4.5)+v*1.6} ${cy+v*(R+4.5)-u*1.6}Z`}).join(''),
     fill:T.GOLD,stroke:T.INK,'stroke-width':.4})]))
  }
  return
 }
 set(p,{fill:white(col)?T.INK:pale(col)?T.RED:chartInk(col),'fill-opacity':null,opacity:null})
}
// a page's display title: its first letter a red initial, as the charts rubricate
function initial(p){
 if(p.children.length||p.childNodes.length!==1)return
 const t=p.textContent;if(t.length<2||!/^[A-Za-z0-9]/.test(t))return
 const s=p.ownerDocument.createElementNS('http://www.w3.org/2000/svg','tspan')
 s.setAttribute('fill',T.RED);s.textContent=t[0]
 p.textContent='';p.append(s,t.slice(1))
}
function type(p,role){
 const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
 const heading=role==='title'&&(parseFloat(p.getAttribute('font-size'))||0)>=32
 letter(p,{font:cjk?T.CJK:heading?T.HEAD:T.BODY,fill:role==='value'?T.RED:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
 if(heading){set(p,{'font-weight':400});if(!cjk&&(parseFloat(p.getAttribute('font-size'))||0)>=48)initial(p)}
}
// a marker (a timeline's stop): a vellum disc with a four-pointed red star, a rose in small
function marker(p,c){
 set(p,{fill:T.PAPER,stroke:T.RED,'stroke-width':1.6})
 const r=parseFloat(p.getAttribute('r'))||0
 if(p.tagName.toLowerCase()!=='circle'||r<5)return
 const x=parseFloat(p.getAttribute('cx'))||0,y=parseFloat(p.getAttribute('cy'))||0,a=r*.78,b=r*.2
 // a numbered badge keeps its number: no star where a word or a figure sits on the disc
 let root=p;while(root.parentNode&&root.parentNode.nodeType===1)root=root.parentNode   // the drawing may be detached
 for(const t of root.querySelectorAll('text')){const tx=parseFloat(t.getAttribute('x')),ty=parseFloat(t.getAttribute('y'))
  if(Math.abs(tx-x)<=r&&ty>=y-r&&ty<=y+r*1.6)return}
 p.after(c.make('path',{d:`M${x} ${y-a}L${x+b} ${y-b}L${x+a} ${y}L${x+b} ${y+b}L${x} ${y+a}L${x-b} ${y+b}L${x-a} ${y}L${x-b} ${y-b}Z`,
  fill:T.RED,stroke:'none','pointer-events':'none'}))
}
// what no role covers: a figure's placeholder (a pale tint and its rule), drawn in chart colours
function after(node){
 for(const n of node.querySelectorAll('[fill],[stroke]')){
  if(n.closest('[data-role],defs,pattern,clipPath,mask'))continue
  for(const k of ['fill','stroke']){
   const v=(n.getAttribute(k)||'').trim().toLowerCase()
   if(!v||v==='none'||v.startsWith('url(')||OWN.has(v)||!rgbOf(v)||white(v))continue
   n.setAttribute(k,(lum(v)??0)>.85?(k==='fill'?T.WATER:T.LIGHT):pale(v)?(k==='fill'?T.LIGHT:T.MUTED):chartInk(v))
  }
 }
}
const line=(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linecap':'round','stroke-linejoin':'round'})
export const portolan={id: 'portolan', label: 'Portolan Sea Chart',tokens,ground:T.PAPER,font:T.BODY,
 fonts: ['IM Fell English', 'EB Garamond'],series:SERIES,native,after,
 roles:{bar:mark,band:mark,area:(p,c)=>mark(p,c,{pale:true}),slice:mark,bubble:(p,c)=>mark(p,c,{pale:true}),
  cell:mark,node:(p,c)=>mark(p,c,{pale:true}),range:mark,line,
  point:(p,c)=>set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.6}),
  marker,
  link:p=>set(p,stroked(p)?{stroke:T.INK,'stroke-width':1.2}:{fill:T.INK}),
  track:p=>paint(p,{fill:'none',stroke:T.LIGHT,'stroke-width':1}),
  rule:p=>set(p,stroked(p)?{stroke:T.RED,'stroke-width':1}:{fill:T.RED}),surface:card,
  swatch:mark,icon,
  // a value on a two-sided scale: blue below the middle, red above
  diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
  heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.WATER,T.LIGHT,T.GREEN,T.INK]),...(white(p.getAttribute('stroke'))?{stroke:T.PAPER}:{})}),
  stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.RED])}),
  span:p=>set(p,{fill:T.LIGHT,opacity:.3,...(p.getAttribute('stroke')&&p.getAttribute('stroke')!=='none'?{stroke:T.LIGHT}:{})}),grid:p=>paint(p,{stroke:T.MUTED,'stroke-opacity':.25,'stroke-width':.6}),
  axis:p=>{paint(p,{stroke:T.INK,'stroke-width':1});for(const n of [p,...p.querySelectorAll('[fill]')])if(!/^(none|url)/.test(n.getAttribute('fill')||'none')&&n.tagName.toLowerCase()!=='text')n.setAttribute('fill',T.INK)},guide:p=>set(p,{stroke:T.GREEN,'stroke-dasharray':'5 4'}),
  leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
  land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.INK,'stroke-width':1}),
  water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:T.BLUE}),relief:(p,c)=>mark(p,c,{pale:true}),
  title:p=>type(p,'title'),label:p=>type(p,'label'),value:p=>type(p,'value'),tick:p=>type(p,'tick')}
}
export default portolan
