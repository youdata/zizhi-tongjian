// Illuminated Manuscript: rubricated type, jewel inks, diaper grounds and gilt rules on parchment.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,rectBox,onRamp,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#f3e8cf', INK: '#352a26', MUTED: '#78634e', LIGHT: '#e4d7b8',
  RED: '#9e3840', BLUE: '#244f86', GREEN: '#38614d', UMBER: '#725632',
  GOLD: '#bb943e', GOLD_LIGHT: '#e7cf88', GOLD_DARK: '#806327', WATER: '#e1e5dd', LAND: '#f3e8cf',
  SEA: '#cddbd2', HILL_GREEN: '#9fae86', HILL_OCHRE: '#c9ab6d', HILL_ROSE: '#bf9488',
  HEAD: "'Uncial Antiqua', 'Noto Serif SC', serif",
  BODY: "'EB Garamond', 'Noto Serif SC', serif",
  CJK: "'Noto Serif SC', 'Noto Serif CJK SC', serif",
}
const T=tokens,SERIES=[T.RED,T.BLUE,T.GREEN,T.UMBER]
const OWN=new Set(Object.values(T).filter(v=>v.startsWith('#')))
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function diaper(c,colour,i,pale){
  const motifs=[
    ['M0 0L20 20L40 0M0 40L20 20L40 40M16 20h8M20 16v8',40,40],
    ['M0 12H36M0 30H36M9 8v8M27 26v8M5 12h8M23 30h8',36,36],
    ['M0 18Q9 0 18 18T36 18M9 10Q3 2 9 0Q15 2 9 10ZM27 26Q21 18 27 16Q33 18 27 26Z',36,36],
    ['M0 0L32 32M0 32L32 0M12 16Q16 9 20 16Q16 23 12 16Z',32,32],
  ]
  const [d,width,height]=motifs[(i+4)%4]
  return c.def(`diaper-${i}-${pale}`,id=>c.make('pattern',{id,width,height,patternUnits:'userSpaceOnUse','data-label':'decorative manuscript diaper'},[
    c.make('path',{d,fill:'none',stroke:pale?colour:T.GOLD_LIGHT,'stroke-width':.75,opacity:pale?.3:.67})]))
}
function mark(p,c,{pale=false}={}){
  const {colour,i,ground}=c.series(paintOf(p))
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p))return set(p,{fill:'none',stroke:colour})
  set(p,{fill:ground?T.PAPER:colour,stroke:T.GOLD,'stroke-width':.7,'fill-opacity':pale&&!ground?.3:null,rx:0,ry:0})
  if(!ground)overlay(p,c,diaper(c,colour,i,pale))
}
function surface(p,c){
  set(p,{fill:stroked(p)?'none':T.PAPER,stroke:T.RED,'stroke-width':.8,'fill-opacity':null,rx:0,ry:0})
  if(p.tagName.toLowerCase()!=='rect')return
  const {x,y,w,h}=rectBox(p)
  if(w<110||h<65)return
  p.after(c.make('rect',{x:x+4,y:y+4,width:w-8,height:h-8,fill:'none',stroke:T.GOLD,'stroke-width':.65,'pointer-events':'none'}))
  const d=[[x+6,y+6],[x+w-6,y+h-6]].map(([a,b])=>`M${a} ${b-3}L${a+3} ${b}L${a} ${b+3}L${a-3} ${b}Z`).join('')
  p.after(c.make('path',{d,fill:T.GOLD,stroke:T.GOLD_DARK,'stroke-width':.4,'pointer-events':'none'}))
}
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function rubric(p){
  if(p.children.length||p.childNodes.length!==1)return
  const words=p.textContent
  if(words.length<2||!/^[A-Za-z]/.test(words))return
  const span=p.ownerDocument.createElementNS('http://www.w3.org/2000/svg','tspan')
  span.setAttribute('fill',T.RED);span.textContent=words[0]
  p.textContent='';p.append(span,words.slice(1))
}
function type(p,role,c){
  // Pack lettering includes single-letter initials, miniature captions and explicitly coloured rubrics.
  if(c?.native&&/Uncial Antiqua|EB Garamond|Noto Serif SC/.test(p.getAttribute('font-family')||''))return
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  const heading=role==='title'&&(parseFloat(p.getAttribute('font-size'))||0)>=34   // Uncial is wider than the face a plugin measures a heading with
  letter(p,{font:cjk?T.CJK:heading?T.HEAD:T.BODY,fill:role==='value'?T.RED:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='value'||role==='tick')p.setAttribute('font-variant-numeric','tabular-nums')
  if(heading&&!cjk&&(parseFloat(p.getAttribute('font-size'))||0)>=36)rubric(p)
  let prev=p.previousElementSibling
  while(prev&&(!prev.hasAttribute('data-role')||/^(label|value)$/.test(prev.getAttribute('data-role'))))prev=prev.previousElementSibling
  if(prev?.tagName.toLowerCase()==='rect'&&/^(cell|heat|bar|slice)$/.test(prev.getAttribute('data-role'))){
    const {x,y,w,h}=rectBox(prev),tx=parseFloat(p.getAttribute('x')),ty=parseFloat(p.getAttribute('y'))
    if(tx>=x&&tx<=x+w&&ty>=y&&ty<=y+h){
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
function icon(p,c){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  if(stroked(p))return set(p,{stroke:T.BLUE})
  set(p,{fill:T.PAPER,stroke:T.BLUE,'stroke-width':1.2,'fill-opacity':null})
  const r=parseFloat(p.getAttribute('r'))||0
  if(p.tagName.toLowerCase()==='circle'&&r>=14)
    p.after(c.make('circle',{cx:p.getAttribute('cx'),cy:p.getAttribute('cy'),r:r-4,fill:'none',stroke:T.GOLD,'stroke-width':.7,'pointer-events':'none'}))
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
      n.setAttribute(k,k==='fill'?(pale(v)?T.LIGHT:T.MUTED):pale(v)?T.LIGHT:T.MUTED)
    }
  }
}
export const illuminatedmanuscript={id: 'illuminated-manuscript', label: 'Illuminated Manuscript',tokens,ground:T.PAPER,font:T.BODY,
  fonts: ['Uncial Antiqua', 'EB Garamond', 'Noto Serif SC'],series:SERIES,native,after,
  roles:{bar:mark,band:(p,c)=>mark(p,c,{pale:true}),slice:mark,cell:mark,
    area:(p,c)=>mark(p,c,{pale:true}),bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),
    range:(p,c)=>mark(p,c,{pale:true}),line:(p,c)=>set(p,{stroke:c.series(paintOf(p)).colour,'stroke-linejoin':'round','stroke-linecap':'round'}),
    point:(p,c)=>stroked(p)?set(p,{stroke:T.INK}):set(p,{fill:T.PAPER,stroke:c.series(paintOf(p)).colour,'stroke-width':1.8}),
    marker:p=>set(p,{fill:T.PAPER,stroke:T.RED,'stroke-width':1.8,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track:p=>isGroup(p)?paint(p,{stroke:T.LIGHT}):set(p,stroked(p)?{stroke:T.LIGHT}:{fill:T.LIGHT,stroke:'none'}),
    rule:p=>set(p,stroked(p)?{stroke:T.GOLD,'stroke-width':1.2}:{fill:T.GOLD}),surface,icon,
    swatch:(p,c)=>set(p,stroked(p)?{stroke:c.series(paintOf(p)).colour}:{fill:c.series(paintOf(p)).colour,stroke:'none',rx:0,ry:0}),
    // a value on a two-sided scale: lapis below the middle, vermilion above
    diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
    heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.LIGHT,T.BLUE,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.RED,T.INK])}),
    span:(p,c)=>set(p,{fill:c.scale('span',p.getAttribute('fill'),[T.LIGHT,T.GOLD_LIGHT]).colour,stroke:stroked(p)?T.MUTED:null,opacity:.35}),
    grid:p=>paint(p,{stroke:T.MUTED,'stroke-width':.55,'stroke-opacity':.3}),axis:p=>{paint(p,{stroke:T.INK,'stroke-width':1});for(const n of [p,...p.querySelectorAll('[fill]')])if(!/^(none|url)/.test(n.getAttribute('fill')||'none')&&n.tagName.toLowerCase()!=='text')n.setAttribute('fill',T.INK)},
    guide:p=>set(p,{stroke:T.RED,'stroke-dasharray':'5 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.8}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.UMBER,'stroke-width':.8}),
    water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:T.BLUE}),
    relief:p=>set(p,stroked(p)?{stroke:T.UMBER}:{fill:T.LIGHT,stroke:'none'}),
    title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c)}
}
export default illuminatedmanuscript
