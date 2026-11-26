// Art Deco: charcoal, antique-gold keylines, jewel inks and geometric fan screens.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,onRamp,rectBox,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#161b22', PLATE: '#1e252e', INK: '#f3e8ca', MUTED: '#b7ad99', LIGHT: '#49515a',
  GOLD: '#c4a36a', TEAL: '#5b9e9b', RUBY: '#c57889', JADE: '#8cae91',
  DARK_GOLD: '#302c26', DARK_TEAL: '#203638', DARK_RUBY: '#392831', DARK_JADE: '#2b3830',
  WATER: '#20343d', LAND: '#292f32', LIT: '#5a4f38', SHADOW: '#25231f',
  HEAD: "'Poiret One', 'Noto Sans SC', sans-serif",
  BODY: "'Jost', 'Noto Sans SC', sans-serif",
  CJK: "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif",
}
const T=tokens,SERIES=[T.GOLD,T.TEAL,T.RUBY,T.JADE],DARK=[T.DARK_GOLD,T.DARK_TEAL,T.DARK_RUBY,T.DARK_JADE]
// the map pack's lowland and terraces (styles/art-deco/artdeco.py LOWLAND, TERRACES): its own inks, kept as drawn
const TERRACES=['#272826','#2d2e2b','#353430','#3e3b33','#494235','#554b36','#625538','#71603b']
const OWN=new Set([...Object.values(T).filter(v=>v.startsWith('#')),...TERRACES])
const hollow=p=>['none','transparent'].includes(String(p.getAttribute('fill')).trim().toLowerCase())||p.getAttribute('fill-opacity')==='0'
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,light:T.GOLD,mid:T.MUTED})
  for(const[k,v]of keep)p.setAttribute(k,v)
}
function seriesOf(p,c){
  const raw=String(paintOf(p)||'').toLowerCase(),i=c.native?SERIES.indexOf(raw):-1
  return i>=0?{colour:SERIES[i],i,ground:false}:c.series(paintOf(p))
}
function screen(c,colour,i,dark){
  const k=((i%4)+4)%4
  return c.def(`deco-screen-${k}-${dark}`,id=>{
    const ink=dark?colour:T.PAPER,stroke={fill:'none',stroke:ink,'stroke-width':.55,opacity:dark?.22:.15}
    const d=[
      'M0 24A24 24 0 0 1 48 24M8 24A16 16 0 0 1 40 24M16 24A8 8 0 0 1 32 24M24 24L7 7M24 24V0M24 24L41 7',
      'M0 0L12 12L24 0M0 12L12 24L24 12M0 24L12 36L24 24',
      'M0 12L12 0L24 12L12 24ZM6 12L12 6L18 12L12 18Z',
      'M0 24V16H8V8H16V0M8 24V20H20V8H24',
    ][k]
    return c.make('pattern',{id,patternUnits:'userSpaceOnUse',width:k===0?48:24,height:24,'data-label':'decorative Art Deco screen'},[c.make('path',{...stroke,d})])
  })
}
function mark(p,c,{dark=false,texture=true}={}){
  const{colour,i,ground}=seriesOf(p,c)
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p)||hollow(p))return set(p,{stroke:colour})
  set(p,{fill:ground?T.PAPER:dark?DARK[i%4]:colour,stroke:dark?colour:T.PAPER,'stroke-width':dark?.85:.6,'fill-opacity':null})
  if(texture&&!ground)overlay(p,c,screen(c,colour,i,dark))
}
const lum=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return v[0]*.2126+v[1]*.7152+v[2]*.0722
}
function type(p,role,c){
  if(c?.native&&p.getAttribute('data-artdeco-type')==='authored')return
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  letter(p,{font:cjk?T.CJK:role==='title'?T.HEAD:T.BODY,fill:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='title')set(p,{'font-weight':400,'letter-spacing':'1.1'})
  if(role==='value'||role==='tick')set(p,{'font-variant-numeric':'tabular-nums'})
  let previous=p.previousElementSibling
  while(previous&&(!previous.hasAttribute('data-role')||/^(label|value)$/.test(previous.getAttribute('data-role'))))previous=previous.previousElementSibling
  if(previous?.tagName.toLowerCase()==='rect'&&/^(bar|cell|heat)$/.test(previous.getAttribute('data-role'))){
    const num=k=>parseFloat(previous.getAttribute(k))||0,x=parseFloat(p.getAttribute('x')),y=parseFloat(p.getAttribute('y'))
    if(x>=num('x')&&x<=num('x')+num('width')&&y>=num('y')&&y<=num('y')+num('height')){
      const bg=lum(previous.getAttribute('fill')),contrast=col=>{const fg=lum(col);return(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)}
      const chosen=contrast(T.PAPER)>=contrast(T.INK)?T.PAPER:T.INK;set(p,{fill:chosen})
      if(contrast(chosen)<4.5)set(p,{fill:T.INK,stroke:T.PAPER,'stroke-width':2,'paint-order':'stroke','stroke-linejoin':'round'})
    }
  }
}
function surface(p,c){
  set(p,{fill:stroked(p)?'none':T.PLATE,stroke:T.GOLD,'stroke-width':.8,'fill-opacity':null,rx:0,ry:0})
  if(p.tagName.toLowerCase()!=='rect')return
  const{x,y,w,h}=rectBox(p)
  if(w<150||h<75)return
  const s=7,k=9,a=x+s,b=y+s,r=x+w-s,d=y+h-s
  p.after(c.make('path',{d:`M${a+k} ${b}H${r-k}V${b+k}H${r}V${d-k}H${r-k}V${d}H${a+k}V${d-k}H${a}V${b+k}H${a+k}Z`,fill:'none',stroke:T.GOLD,'stroke-width':.45,opacity:.65,'pointer-events':'none'}))
}
function rule(p){
  set(p,stroked(p)?{stroke:T.GOLD,'stroke-width':.8}:{fill:T.GOLD})
  if(!stroked(p)||p.tagName.toLowerCase()!=='path')return
  const d=p.getAttribute('d')||'',commands=d.match(/[a-df-z]/gi)||[]
  if(commands.filter(k=>k==='M').length!==1||commands.some(k=>!['M','L','C','Q','S','T'].includes(k)))return
  const xy=(d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number)
  if(xy.length<4)return
  const[x,y]=xy,[ex,ey]=xy.slice(-2)
  if(Math.abs(ex-x)>=200&&Math.abs(ey-y)<.5)set(p,{d:`M${x} ${y}L${ex} ${ey}`})
}
function icon(p){
  if(isGroup(p))return paint(p,{stroke:T.GOLD})
  if(stroked(p))return set(p,{stroke:T.GOLD,'stroke-width':1})
  const plate=/^(rect|circle|ellipse)$/i.test(p.tagName),arc=/[Aa]\s*([\d.]+)/.exec(p.getAttribute('d')||'')
  set(p,{fill:plate?T.PLATE:arc?T.PAPER:T.INK,stroke:plate?T.GOLD:arc?T.LIGHT:'none','stroke-width':plate?.8:arc?.6:null,'fill-opacity':null})
}
function after(node,c){
  // The infographic's empty figure slots have no surface role. Keep their explanatory text readable.
  const slots=[...node.querySelectorAll('[data-ig-placeholder] > rect')]
  slots.push(...node.querySelectorAll('rect[fill="#eef2ff"][stroke="#c7d2fe"]'))
  for(const p of slots)set(p,{fill:T.PLATE,stroke:T.LIGHT})
  // A chart's unmarked axis caption uses this stock muted ink; it needs a light counterpart here.
  for(const p of node.querySelectorAll('text:not([data-role])'))if(!p.closest('[data-role]')&&p.getAttribute('fill')==='#64748b')set(p,{fill:T.MUTED})
}
export const artdeco = {id: 'art-deco', label: 'Art Deco',tokens,ground:T.PAPER,font:T.BODY,
  fonts: ['Poiret One','Jost','Noto Sans SC'],series:SERIES,native,after,
  roles:{
    bar:mark,cell:mark,band:(p,c)=>mark(p,c,{dark:true}),slice:(p,c)=>mark(p,c,{dark:true}),area:(p,c)=>mark(p,c,{dark:true}),
    bubble:(p,c)=>mark(p,c,{dark:true}),node:(p,c)=>mark(p,c,{dark:true}),range:(p,c)=>mark(p,c,{dark:true}),
    line:(p,c)=>set(p,{stroke:seriesOf(p,c).colour,'stroke-linecap':'square','stroke-linejoin':'miter'}),
    point:(p,c)=>set(p,{fill:T.PAPER,stroke:seriesOf(p,c).colour,'stroke-width':1.5}),
    marker:p=>set(p,{fill:T.GOLD,stroke:T.PAPER,'stroke-width':.8,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.LIGHT}:{fill:T.LIGHT,...(p.hasAttribute('stroke')?{stroke:T.LIGHT}:{})}),
    rule,surface,icon,swatch:(p,c)=>mark(p,c),
    // a value on a two-sided scale: teal below the middle, ruby above
    diverging:p=>{const fill=onDiverging(p,[T.TEAL,T.LIGHT,T.RUBY]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PLATE,T.DARK_TEAL,T.TEAL,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.RUBY,T.INK])}),
    // a span drawn as a broad stroke (a life cycle's ring, a flow's band) takes the dark inks too
    span:(p,c)=>stroked(p)?set(p,{stroke:c.scale('span',p.getAttribute('stroke'),[T.DARK_TEAL,T.DARK_RUBY]).colour}):set(p,{fill:c.scale('span',p.getAttribute('fill'),[T.DARK_TEAL,T.DARK_RUBY]).colour,opacity:.65,...(p.hasAttribute('stroke')&&p.getAttribute('stroke')!=='none'?{stroke:T.LIGHT}:{})}),
    grid:p=>paint(p,{stroke:T.LIGHT,'stroke-width':.5,'stroke-opacity':.8}),axis:p=>{paint(p,{stroke:T.GOLD,'stroke-width':.8});if(!isGroup(p)&&!hollow(p)&&p.hasAttribute('fill'))set(p,{fill:T.GOLD})},
    guide:p=>set(p,{stroke:T.TEAL,'stroke-dasharray':p.getAttribute('stroke-dasharray')||'5 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.7}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.GOLD,'stroke-width':.65}),
    water:p=>set(p,stroked(p)?{stroke:T.TEAL}:{fill:T.WATER,stroke:T.TEAL}),
    relief:p=>set(p,stroked(p)?{stroke:T.GOLD}:{fill:T.DARK_GOLD}),
    title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c),
  }
}
export default artdeco
