// 青花: cobalt drawing, reserved porcelain white, lotus scrolls and double-ring framing.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,rectBox,onRamp,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#f7faf9', INK: '#123b74', COBALT: '#235ba2', BLUE: '#3674ad', MID: '#8aafd0',
  MUTED: '#547697', LIGHT: '#dce9f2', WASH: '#b8cfe4', WATER: '#edf4f8', LAND: '#f7faf9',
  HEAD: "'EB Garamond', 'Noto Serif SC', serif",
  BODY: "'EB Garamond', 'Noto Serif SC', serif",
  CJK: "'Noto Serif SC', 'Noto Serif CJK SC', serif",
}
const T=tokens,SERIES=[T.INK,T.COBALT,T.BLUE,T.MID]
const OWN=new Set(Object.values(T).filter(v=>v.startsWith('#')))
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function porcelain(c,colour,i,pale){
  const motifs=[
    ['M-8 18C4 2 20 2 32 18S60 34 72 18M8 10C3 2 12 0 17 6C14 11 10 12 8 10ZM40 26C35 18 44 16 49 22C46 27 42 28 40 26Z',64,36],
    ['M0 0L24 24L48 0M0 48L24 24L48 48M24 16Q16 24 24 32Q32 24 24 16Z',48,48],
    ['M-16 12Q0-2 16 12T48 12T80 12M-16 19Q0 5 16 19T48 19T80 19M-16 26Q0 12 16 26T48 26T80 26',64,38],
    ['M0 5H27V27H9V13H19V20M36 5H63V27H45V13H55V20',72,34],
  ]
  const [d,width,height]=motifs[(i+4)%4]
  return c.def(`porcelain-${i}-${pale}`,id=>c.make('pattern',{id,width,height,patternUnits:'userSpaceOnUse','data-label':'decorative porcelain pattern'},[
    c.make('path',{d,fill:'none',stroke:pale?colour:T.PAPER,'stroke-width':.85,opacity:pale?.33:.62,'stroke-linecap':'round','stroke-linejoin':'round'})]))
}
function mark(p,c,{pale=false}={}){
  const {colour,i,ground}=c.series(paintOf(p))
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p))return set(p,{fill:'none',stroke:colour})
  set(p,{fill:ground?T.PAPER:colour,stroke:colour,'stroke-width':.8,'fill-opacity':pale&&!ground?.3:null,rx:0,ry:0})
  if(!ground)overlay(p,c,porcelain(c,colour,i,pale))
}
function surface(p,c){
  set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.INK,'stroke-width':1.1,'fill-opacity':null,rx:12,ry:12})
  if(p.tagName.toLowerCase()!=='rect')return
  const {x,y,w,h}=rectBox(p)
  if(w<100||h<65)return
  p.after(c.make('rect',{x:x+5,y:y+5,width:w-10,height:h-10,rx:9,ry:9,fill:'none',stroke:T.COBALT,'stroke-width':.55,'pointer-events':'none'}))
}
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function type(p,role){
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  letter(p,{font:cjk?T.CJK:role==='title'?T.HEAD:T.BODY,fill:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='value'||role==='tick')p.setAttribute('font-variant-numeric','tabular-nums')
  let prev=p.previousElementSibling
  while(prev&&(!prev.hasAttribute('data-role')||/^(label|value)$/.test(prev.getAttribute('data-role'))))prev=prev.previousElementSibling
  if(prev?.tagName.toLowerCase()==='rect'&&/^(cell|heat|bar|slice)$/.test(prev.getAttribute('data-role'))){
    const {x,y,w,h}=rectBox(prev),tx=parseFloat(p.getAttribute('x')),ty=parseFloat(p.getAttribute('y'))
    if(tx>=x&&tx<=x+w&&ty>=y&&ty<=y+h){
      const bg=luminance(prev.getAttribute('fill')),fg=luminance(p.getAttribute('fill'))
      if((Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)<4.5){
        const contrast=col=>{const v=luminance(col);return (Math.max(bg,v)+.05)/(Math.min(bg,v)+.05)}
        const chosen=contrast(T.PAPER)>contrast(T.INK)?T.PAPER:T.INK
        set(p,{fill:chosen})
        // A continuous heat ramp can pass through middle tones: reserve white beneath the glyphs there.
        if(contrast(chosen)<4.5)set(p,{fill:T.INK,stroke:T.PAPER,'stroke-width':2,'paint-order':'stroke','stroke-linejoin':'round'})
      }
    }
  }
}
function icon(p,c){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  if(stroked(p))return set(p,{stroke:T.COBALT})
  set(p,{fill:T.PAPER,stroke:T.COBALT,'stroke-width':1.3,'fill-opacity':null})
  const r=parseFloat(p.getAttribute('r'))||0
  if(p.tagName.toLowerCase()==='circle'&&r>=14)
    p.after(c.make('circle',{cx:p.getAttribute('cx'),cy:p.getAttribute('cy'),r:r-4,fill:'none',stroke:T.BLUE,'stroke-width':.65,'pointer-events':'none'}))
}
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
      n.setAttribute(k,k==='fill'?(pale(v)?T.LIGHT:T.MUTED):pale(v)?T.WASH:T.MUTED)
    }
  }
}
export const qinghua={id: 'qinghua', label: '青花 · Blue-and-white Porcelain',tokens,ground:T.PAPER,font:T.BODY,
  fonts: ['EB Garamond', 'Noto Serif SC'],series:SERIES,native,after,
  roles:{bar:mark,band:(p,c)=>mark(p,c,{pale:true}),slice:mark,cell:mark,
    area:(p,c)=>mark(p,c,{pale:true}),bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),
    range:(p,c)=>mark(p,c,{pale:true}),line:(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linejoin':'round','stroke-linecap':'round'}),
    point:(p,c)=>stroked(p)?set(p,{stroke:T.INK}):set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.8}),
    marker:p=>set(p,{fill:T.PAPER,stroke:T.COBALT,'stroke-width':1.8,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.WASH}:{fill:T.LIGHT,stroke:'none'}),
    rule:p=>set(p,stroked(p)?{stroke:T.COBALT,'stroke-width':1.2}:{fill:T.COBALT}),surface,icon,
    swatch:(p,c)=>set(p,stroked(p)?{stroke:c.series(paintOf(p)).colour}:{fill:c.series(paintOf(p)).colour,stroke:'none',rx:0,ry:0}),
    // a value on a two-sided scale: cobalt below the middle, underglaze copper red (釉里红) above
    diverging:p=>{const fill=onDiverging(p,[T.COBALT,T.LIGHT,'#9b3b33']);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.WASH,T.COBALT,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.BLUE,T.INK])}),
    span:(p,c)=>set(p,{fill:c.scale('span',p.getAttribute('fill'),[T.LIGHT,T.WASH]).colour,stroke:stroked(p)?T.MUTED:null,opacity:.45}),
    grid:p=>paint(p,{stroke:T.WASH,'stroke-width':.6,'stroke-opacity':.6}),axis:p=>{paint(p,{stroke:T.INK,'stroke-width':1});for(const n of [p,...p.querySelectorAll('[fill]')])if(!/^(none|url)/.test(n.getAttribute('fill')||'none')&&n.tagName.toLowerCase()!=='text')n.setAttribute('fill',T.INK)},
    guide:p=>set(p,{stroke:T.COBALT,'stroke-dasharray':'5 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.MID,'stroke-width':.8}),
    water:p=>set(p,stroked(p)?{stroke:T.COBALT}:{fill:T.LIGHT,stroke:T.COBALT}),
    relief:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.LIGHT,stroke:'none'}),
    title:p=>type(p,'title'),label:p=>type(p,'label'),value:p=>type(p,'value'),tick:p=>type(p,'tick')}
}
export default qinghua
