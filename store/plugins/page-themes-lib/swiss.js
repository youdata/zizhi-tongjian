// Swiss / International: sans-serif hierarchy, flat measured marks and quiet rules on white.
import {set,paint,letter,paintOf,stroked,isGroup,inks,onRamp,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#ffffff', INK: '#111111', MUTED: '#595959', LIGHT: '#e5e5e5',
  RED: '#d62828', BLUE: '#255d85', GREY: '#666666', WATER: '#d9e7f1', LAND: '#ffffff',
  PALE_INK: '#e6e6e6', PALE_RED: '#f6d4d4', PALE_BLUE: '#d5e2eb', PALE_GREY: '#ededed',
  HEAD: "'Inter', 'Noto Sans SC', sans-serif",
  BODY: "'Inter', 'Noto Sans SC', sans-serif",
  CJK: "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif",
}
const T=tokens,SERIES=[T.INK,T.RED,T.BLUE,T.GREY],PALE=[T.PALE_INK,T.PALE_RED,T.PALE_BLUE,T.PALE_GREY]
const OWN=new Set(Object.values(T).filter(v=>v.startsWith('#')))
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function mark(p,c,{pale=false,edge=true}={}){
  const {colour,i,ground}=c.series(paintOf(p))
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p))return set(p,{fill:'none',stroke:colour})
  set(p,{fill:ground?T.PAPER:pale?PALE[i%4]:colour,
    stroke:edge&&!ground?colour:'none','stroke-width':edge?.7:null,'fill-opacity':null,rx:0,ry:0})
}
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function type(p,role,c){
  if(c?.native&&p.getAttribute('data-swiss-type')==='authored')return
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  letter(p,{font:cjk?T.CJK:T.BODY,fill:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='title')set(p,{'font-weight':700})
  else if(role==='value'){
    set(p,{'font-weight':650,'font-variant-numeric':'tabular-nums'})
    // Inter's figures run wider than the plugins' default face: a large value would meet its delta in a KPI card
    const size=parseFloat(p.getAttribute('font-size'))
    if(size>=28&&!p.hasAttribute('data-swiss-fit'))set(p,{'font-size':+(size*.9).toFixed(1),'data-swiss-fit':'1'})
  }
  else if(role==='tick')set(p,{'font-weight':400,'font-variant-numeric':'tabular-nums'})
  let prev=p.previousElementSibling
  while(prev&&(!prev.hasAttribute('data-role')||/^(label|value)$/.test(prev.getAttribute('data-role'))))prev=prev.previousElementSibling
  if(prev?.tagName.toLowerCase()==='rect'&&/^(cell|heat|bar)$/.test(prev.getAttribute('data-role'))){
    const n=k=>parseFloat(prev.getAttribute(k))||0,tx=parseFloat(p.getAttribute('x')),ty=parseFloat(p.getAttribute('y'))
    if(tx>=n('x')&&tx<=n('x')+n('width')&&ty>=n('y')&&ty<=n('y')+n('height')){
      const bg=luminance(prev.getAttribute('fill')),fg=luminance(p.getAttribute('fill'))
      const contrast=col=>{const v=luminance(col);return (Math.max(bg,v)+.05)/(Math.min(bg,v)+.05)}
      if((Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)<4.5){
        const chosen=contrast(T.PAPER)>contrast(T.INK)?T.PAPER:T.INK
        set(p,{fill:chosen})
        if(contrast(chosen)<4.5)set(p,{fill:T.INK,stroke:T.PAPER,'stroke-width':2,'paint-order':'stroke','stroke-linejoin':'round'})
      }
    }
  }
}
function icon(p){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  if(stroked(p))return set(p,{stroke:T.INK})
  const arc=/[Aa]\s*([\d.]+)/.exec(p.getAttribute('d')||'')
  if(arc&&+arc[1]>=30)return set(p,{fill:T.PAPER,stroke:T.LIGHT,'stroke-width':.8,'fill-opacity':null})
  const plate=/^(circle|rect|ellipse)$/i.test(p.tagName)
  set(p,{fill:plate?T.PAPER:T.INK,stroke:plate?T.INK:'none','stroke-width':plate?1:null,'fill-opacity':null})
}
function rule(p){
  set(p,stroked(p)?{stroke:T.INK,'stroke-width':1}:{fill:T.INK})
  if(!stroked(p)||p.tagName.toLowerCase()!=='path')return
  const d=p.getAttribute('d')||'',commands=d.match(/[a-df-z]/gi)||[]
  // Only long, open, absolute decorative dividers with level endpoints. Data roles never use this path.
  if(commands.filter(k=>k==='M').length!==1||commands.some(k=>!['M','L','C','Q','S','T'].includes(k)))return
  const coordinates=(d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number)
  if(coordinates.length<4)return
  const [x,y]=coordinates,[endX,endY]=coordinates.slice(-2)
  if(Math.abs(endX-x)>=200&&Math.abs(endY-y)<.5)set(p,{d:`M${x} ${y}L${endX} ${endY}`})
}
// Unroled pale tints (a figure placeholder's lavender panel and dashed edge) take the sheet's quiet greys;
// saturated colours — a picture's own drawing — are left alone.
function after(node){
  for(const n of node.querySelectorAll('[fill],[stroke]')){
    if(n.closest('[data-role],defs,pattern,clipPath,mask'))continue
    for(const k of ['fill','stroke']){
      const v=(n.getAttribute(k)||'').trim().toLowerCase(),m=/^#([0-9a-f]{6})$/.exec(v)
      if(!m||OWN.has(v)||v==='#ffffff'||luminance(v)<.55)continue
      const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16))
      if(Math.max(...rgb)-Math.min(...rgb)<8)continue   // already a grey
      n.setAttribute(k,k==='fill'&&luminance(v)>.8?T.PALE_GREY:T.LIGHT)
    }
  }
}
export const swiss={id: 'swiss', label: 'Swiss / International',tokens,ground:T.PAPER,font:T.BODY,
  fonts: ['Inter', 'Noto Sans SC'],series:SERIES,native,after,
  roles:{bar:(p,c)=>mark(p,c,{edge:false}),cell:(p,c)=>mark(p,c,{edge:false}),
    band:(p,c)=>mark(p,c,{pale:true}),slice:(p,c)=>mark(p,c,{pale:true}),area:(p,c)=>mark(p,c,{pale:true,edge:false}),
    bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),range:(p,c)=>mark(p,c,{pale:true}),
    line:(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linecap':'butt','stroke-linejoin':'miter'}),
    point:(p,c)=>set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.8}),
    marker:p=>set(p,{fill:T.PAPER,stroke:T.INK,'stroke-width':1.4,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.LIGHT}:{fill:T.LIGHT,stroke:'none'}),
    surface:p=>set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.LIGHT,'stroke-width':.7,rx:0,ry:0,'fill-opacity':null}),
    rule,icon,
    swatch:(p,c)=>set(p,stroked(p)?{stroke:c.series(paintOf(p)).colour}:{fill:c.series(paintOf(p)).colour,stroke:'none',rx:0,ry:0}),
    // a value on a two-sided scale: blue below the middle, red above
    diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.LIGHT,T.BLUE,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.RED,T.INK])}),
    span:(p,c)=>set(p,{fill:c.scale('span',p.getAttribute('fill'),[T.LIGHT,T.PALE_BLUE]).colour,opacity:.5,
      ...(p.hasAttribute('stroke')&&p.getAttribute('stroke')!=='none'?{stroke:T.GREY}:{})}),
    grid:p=>paint(p,{stroke:T.LIGHT,'stroke-width':.6,'stroke-opacity':1}),axis:p=>{paint(p,{stroke:T.INK,'stroke-width':1});const f=p.getAttribute('fill');if(f&&f!=='none'&&!/^url/.test(f))set(p,{fill:T.INK})},
    guide:p=>set(p,{stroke:T.RED,'stroke-dasharray':p.getAttribute('stroke-dasharray')||'5 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.GREY,'stroke-width':.8}),
    water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:T.BLUE}),
    relief:p=>set(p,stroked(p)?{stroke:T.GREY}:{fill:T.LIGHT,stroke:'none'}),
    title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c)}
}
export default swiss
