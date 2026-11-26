// Topographic Atlas: survey-sheet furniture and decorative contour screens on data marks.
// Actual geographic contours belong to the Python pack and are never synthesized here.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,rectBox,onRamp,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#f6f3e8',
  INK: '#273b35', MUTED: '#718078', LIGHT: '#d2dacb',
  BROWN: '#916644', GREEN: '#54765a', BLUE: '#367b98', RED: '#b34e3e',
  LAND: '#eeefdc', WATER: '#dbeaf0',
  ELEVATION: ['#dfe8cb', '#ebebc8', '#ede0b9', '#e2cba3', '#d3b593', '#cbbcac', '#ebe6df'],
  LOWLAND: '#d4e3c5', DEPTHS: ['#a8c9da', '#bad6e3', '#cbe1eb'], SHADE: '#4f4337',
  HEAD: "'Oswald', 'Noto Sans CJK SC', sans-serif",
  BODY: "'Source Sans 3', 'Noto Sans CJK SC', sans-serif",
  CJK: "'Noto Sans CJK SC', sans-serif",
}
const T=tokens, SERIES=[T.GREEN,T.BROWN,T.BLUE,T.RED]
const OWN=new Set([...Object.values(T).filter(v=>typeof v==='string'&&v.startsWith('#')),...T.ELEVATION,...T.DEPTHS])
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function contours(c,colour,i,pale){
  return c.def(`contours-${i}-${pale}`,id=>c.make('pattern',{
    id,width:64,height:64,patternUnits:'userSpaceOnUse',patternTransform:`rotate(${[0,90,35,-35][i%4]})`,
    'data-label':'decorative contour screen'},[
    c.make('path',{d:'M-8 8C8-2 24 18 40 8S72-2 88 8M-8 24C8 14 24 34 40 24S72 14 88 24M-8 40C8 30 24 50 40 40S72 30 88 40M-8 56C8 46 24 66 40 56S72 46 88 56',
      fill:'none',stroke:pale?colour:T.PAPER,'stroke-width':.8,opacity:pale?.3:.55}),
  ]))
}
function mark(p,c,{pale=false}={}){
  const {colour,i,ground}=c.series(paintOf(p))
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p))return set(p,{fill:'none',stroke:colour})
  set(p,{fill:ground?T.PAPER:colour,stroke:colour,'stroke-width':.7,
    'fill-opacity':pale&&!ground?.3:null,rx:0,ry:0})
  if(!ground)overlay(p,c,contours(c,colour,i,pale))
}
function surface(p,c){
  set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.MUTED,'stroke-width':.8,rx:0,ry:0,'fill-opacity':null})
  if(p.tagName.toLowerCase()!=='rect')return
  const {x,y,w,h}=rectBox(p)
  if(w<100||h<60)return
  const d=[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]
    .map(([a,b,u,v])=>`M${a+u*12} ${b}H${a}V${b+v*12}`).join('')
  p.after(c.make('path',{d,fill:'none',stroke:T.INK,'stroke-width':1.7,'pointer-events':'none'}))
}
function type(p,role){
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  const heading=role==='title'&&(parseFloat(p.getAttribute('font-size'))||0)>=32
  letter(p,{font:cjk?T.CJK:heading?T.HEAD:T.BODY,
    fill:role==='value'?T.BROWN:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='value'||role==='tick')p.setAttribute('font-variant-numeric','tabular-nums')
  // Unit grids and heat tiles put their labels beside the filled rect in the same coordinate system.
  // Match only that rect and an anchor inside it; unrelated labels keep their normal ink.
  let previous=p.previousElementSibling
  while(previous&&(!previous.hasAttribute('data-role')||/^(label|value)$/.test(previous.getAttribute('data-role'))))previous=previous.previousElementSibling
  if(previous?.tagName.toLowerCase()==='rect'&&/^(cell|heat|bar|slice)$/.test(previous.getAttribute('data-role'))){
    const {x,y,w,h}=rectBox(previous),tx=parseFloat(p.getAttribute('x')),ty=parseFloat(p.getAttribute('y'))
    if(tx>=x&&tx<=x+w&&ty>=y&&ty<=y+h){
      const luminance=hex=>{
        if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
        const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
        return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
      }
      const background=luminance(previous.getAttribute('fill')),foreground=luminance(p.getAttribute('fill'))
      if((Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)<4.5)
        p.setAttribute('fill',background<.35?T.PAPER:T.INK)
    }
  }
}
const line=(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linejoin':'round','stroke-linecap':'round'})
// What a plugin draws without a role (a figure's placeholder, a stray grey): pale tints become the paper's light
// tone, greys the muted ink; a saturated colour is the author's and stays.
const pale=v=>{const m=/^#([0-9a-f]{6})$/.exec(v);if(!m)return false;const [r,g,b]=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255);return .2126*r+.7152*g+.0722*b>.6}
function after(node){
  for(const n of node.querySelectorAll('[fill],[stroke]')){
    if(n.closest('[data-role],defs,pattern,clipPath,mask'))continue
    for(const k of ['fill','stroke']){
      const v=(n.getAttribute(k)||'').trim().toLowerCase(),m=/^#([0-9a-f]{6})$/.exec(v)
      if(!m||OWN.has(v)||/^#f{6}$/.test(v))continue
      const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16))
      if(Math.max(...rgb)-Math.min(...rgb)>40&&!pale(v))continue
      n.setAttribute(k,k==='fill'?(pale(v)?T.LIGHT:T.MUTED):pale(v)?T.LIGHT:T.MUTED)
    }
  }
}
export const topographic={id: 'topographic', label: 'Topographic Atlas',tokens,ground:T.PAPER,font:T.BODY,
  fonts: ['Oswald', 'Source Sans 3'],series:SERIES,native,after,
  roles:{bar:mark,band:(p,c)=>mark(p,c,{pale:true}),slice:mark,cell:mark,range:mark,
    area:(p,c)=>mark(p,c,{pale:true}),bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),
    line,point:(p,c)=>stroked(p)?set(p,{stroke:T.INK}):set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.8}),
    marker:p=>set(p,{fill:T.PAPER,stroke:T.RED,'stroke-width':1.8,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.LIGHT}:{fill:T.LIGHT,stroke:'none'}),
    rule:p=>set(p,stroked(p)?{stroke:T.BROWN,'stroke-width':1}:{fill:T.BROWN}),surface,
    swatch:(p,c)=>set(p,stroked(p)?{stroke:c.series(paintOf(p)).colour}:{fill:c.series(paintOf(p)).colour,stroke:'none',rx:0,ry:0}),
    icon:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.PAPER,stroke:T.GREEN,'stroke-width':1.2,'fill-opacity':null}),
    // a value on a two-sided scale: water blue below the middle, red above
    diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.LIGHT,T.GREEN,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.BROWN,T.INK])}),
    span:(p,c)=>set(p,{fill:c.scale('span',p.getAttribute('fill'),[T.LIGHT,T.WATER]).colour,stroke:stroked(p)?T.MUTED:null,opacity:.4}),
    grid:p=>paint(p,{stroke:T.MUTED,'stroke-width':.55,'stroke-opacity':.35}),
    axis:p=>{paint(p,{stroke:T.INK,'stroke-width':1});for(const n of [p,...p.querySelectorAll('[fill]')])if(!/^(none|url)/.test(n.getAttribute('fill')||'none')&&n.tagName.toLowerCase()!=='text')n.setAttribute('fill',T.INK)},
    guide:p=>set(p,{stroke:T.RED,'stroke-dasharray':'6 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.MUTED,'stroke-width':.8}),
    water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:T.BLUE}),
    relief:p=>set(p,stroked(p)?{stroke:T.BROWN,'stroke-width':.8}:{fill:T.LIGHT,stroke:'none'}),
    title:p=>type(p,'title'),label:p=>type(p,'label'),value:p=>type(p,'value'),tick:p=>type(p,'tick')}
}
export default topographic
