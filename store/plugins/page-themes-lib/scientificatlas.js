// Scientific Atlas: crisp engraved screens, plate furniture and serif annotations on ivory.
import {set,paint,overlay,letter,paintOf,stroked,isGroup,inks,onRamp,rectBox,onDiverging} from './marks.js'

export const tokens = {
  PAPER: '#f4f0e4', PLATE: '#fffaf0', INK: '#26343a', MUTED: '#647075', LIGHT: '#cbd0c8',
  BLUE: '#547b91', RED: '#a45d4d', GREEN: '#687b63', OCHRE: '#a28c5f',
  PALE_BLUE: '#dce6e9', PALE_RED: '#ecddd4', PALE_GREEN: '#e0e5d9', PALE_OCHRE: '#ede5d3',
  WATER: '#e0e8e8', LAND: '#f2eedf',
  BLUE_DEEP: '#4d7084', GREEN_DEEP: '#5e705d', OCHRE_DEEP: '#776d52',
  HEAD: "'Libre Baskerville', 'Noto Serif SC', serif",
  BODY: "'Source Serif 4', 'Noto Serif SC', serif",
  CJK: "'Noto Serif SC', 'Noto Serif CJK SC', serif",
}
const T=tokens,SERIES=[T.BLUE,T.RED,T.GREEN,T.OCHRE],PALE=[T.PALE_BLUE,T.PALE_RED,T.PALE_GREEN,T.PALE_OCHRE]
// the map pack's hypsometric and depth tints (styles/scientific-atlas): a page's own map keeps them
const MAP_TINTS=['#ebe9d6','#e6e1c9','#e1d8bb','#dbcfae','#d4c4a1','#ccb995','#c3ae8b','#cfdcdc','#d6e1e0','#dbe5e4']
const OWN=new Set([...Object.values(T).filter(v=>v.startsWith('#')),...MAP_TINTS])
const hollow=p=>['none','transparent'].includes(String(p.getAttribute('fill')).trim().toLowerCase())||p.getAttribute('fill-opacity')==='0'
function native(p){
  const keep=['fill','stroke'].map(k=>[k,p.getAttribute(k)]).filter(([,v])=>OWN.has(String(v).toLowerCase()))
  inks(p,{ink:T.INK,ground:T.PAPER,mid:T.MUTED})
  for(const [k,v] of keep)p.setAttribute(k,v)
}
function engraving(c,colour,i,pale){
  const n=((i%4)+4)%4,ink=pale?colour:T.PLATE
  return c.def(`engraving-${n}-${pale}`,id=>{
    const attrs={id,patternUnits:'userSpaceOnUse',width:8,height:8,'data-label':'decorative engraving screen'}
    let children
    if(n===2)children=[[2,2],[6,6]].map(([cx,cy])=>c.make('circle',{cx,cy,r:.55,fill:ink,opacity:pale?.32:.4}))
    else{
      attrs.patternTransform=`rotate(${n===0?45:n===1?-45:0})`
      children=[c.make('path',{d:'M0 0V8',fill:'none',stroke:ink,'stroke-width':.5,opacity:pale?.25:.38})]
      if(n===1)children.push(c.make('path',{d:'M0 0H8',fill:'none',stroke:ink,'stroke-width':.3,opacity:pale?.18:.25}))
      if(n===3)children.push(c.make('path',{d:'M4 0V8',fill:'none',stroke:ink,'stroke-width':.3,opacity:pale?.2:.3}))
    }
    return c.make('pattern',attrs,children)
  })
}
function seriesOf(p,c){
  const raw=String(paintOf(p)||'').toLowerCase(),i=c.native?SERIES.indexOf(raw):-1
  return i>=0?{colour:SERIES[i],i,ground:false}:c.series(paintOf(p))
}
function mark(p,c,{pale=false,screen=true}={}){
  const {colour,i,ground}=seriesOf(p,c)
  if(isGroup(p))return paint(p,{stroke:colour})
  if(stroked(p)||hollow(p))return set(p,{stroke:colour})
  set(p,{fill:ground?T.PAPER:pale?PALE[i%4]:colour,stroke:T.INK,'stroke-width':.65,'stroke-opacity':.85,'fill-opacity':null})
  if(screen&&!ground)overlay(p,c,engraving(c,colour,i,pale))
}
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex||''))return 1
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')
function type(p,role,c){
  if(c?.native&&p.getAttribute('data-scientific-type')==='authored')return
  const cjk=/[⺀-鿿가-힯]/u.test(p.textContent||'')
  letter(p,{font:cjk?T.CJK:role==='title'?T.HEAD:T.BODY,fill:role==='tick'?T.MUTED:T.INK,halo:T.PAPER})
  if(role==='title')set(p,{'font-weight':700,'letter-spacing':'.45'})
  if(role==='value'||role==='tick')set(p,{'font-variant-numeric':'tabular-nums'})
  let previous=p.previousElementSibling
  while(previous&&(!previous.hasAttribute('data-role')||/^(label|value)$/.test(previous.getAttribute('data-role'))))previous=previous.previousElementSibling
  if(previous?.tagName.toLowerCase()==='rect'&&/^(bar|cell|heat)$/.test(previous.getAttribute('data-role'))){
    const num=k=>parseFloat(previous.getAttribute(k))||0,x=parseFloat(p.getAttribute('x')),y=parseFloat(p.getAttribute('y'))
    if(x>=num('x')&&x<=num('x')+num('width')&&y>=num('y')&&y<=num('y')+num('height')){
      const bg=luminance(previous.getAttribute('fill')),contrast=col=>{const fg=luminance(col);return(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)}
      const chosen=contrast(T.INK)>=contrast(T.PLATE)?T.INK:T.PLATE
      set(p,{fill:chosen})
      if(contrast(chosen)<4.5){
        // a mid-tone cell: deepen it with ink (as a heavier engraved screen would) until paper-white reads, rather
        // than outlining the word
        const base=previous.getAttribute('fill')
        const own={[T.BLUE]:T.BLUE_DEEP,[T.GREEN]:T.GREEN_DEEP,[T.OCHRE]:T.OCHRE_DEEP}[String(base).toLowerCase()]
        if(own){set(previous,{fill:own});set(p,{fill:T.PLATE})}
        else if(/^#[0-9a-f]{6}$/i.test(base||''))for(const t of [.15,.25,.35,.45]){
          const deeper=mix(base,T.INK,t),fg=luminance(T.PLATE),bg2=luminance(deeper)
          if((fg+.05)/(bg2+.05)>=4.5){set(previous,{fill:deeper});set(p,{fill:T.PLATE});break}
        }
      }
    }
  }
}
function surface(p){
  set(p,{fill:stroked(p)?'none':T.PLATE,stroke:T.MUTED,'stroke-width':.65,'fill-opacity':null,rx:0,ry:0})
  if(p.tagName.toLowerCase()!=='rect')return
  const {x,y,w,h}=rectBox(p)
  if(w>=140&&h>=65)p.after(p.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g'))
  // Plate furniture stays inside its original box, away from the content's padding.
  if(w>=140&&h>=65){
    const n=p.nextElementSibling,r=p.ownerDocument.createElementNS('http://www.w3.org/2000/svg','rect')
    set(n,{'pointer-events':'none'});set(r,{x:x+4,y:y+4,width:w-8,height:h-8,fill:'none',stroke:T.LIGHT,'stroke-width':.4});n.appendChild(r)
  }
}
function rule(p){
  set(p,stroked(p)?{stroke:T.MUTED,'stroke-width':.7}:{fill:T.MUTED})
  if(!stroked(p)||p.tagName.toLowerCase()!=='path')return
  const d=p.getAttribute('d')||'',commands=d.match(/[a-df-z]/gi)||[]
  if(commands.filter(k=>k==='M').length!==1||commands.some(k=>!['M','L','C','Q','S','T'].includes(k)))return
  const xy=(d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number)
  if(xy.length<4)return
  const[x,y]=xy,[ex,ey]=xy.slice(-2)
  if(Math.abs(ex-x)>=200&&Math.abs(ey-y)<.5)set(p,{d:`M${x} ${y}L${ex} ${ey}`})
}
function icon(p){
  if(isGroup(p))return paint(p,{stroke:T.INK})
  if(stroked(p))return set(p,{stroke:T.INK,'stroke-width':.9})
  const plate=/^(rect|circle|ellipse)$/i.test(p.tagName),arc=/[Aa]\s*([\d.]+)/.exec(p.getAttribute('d')||'')
  set(p,{fill:plate?T.PLATE:arc?T.PAPER:T.INK,stroke:plate?T.INK:arc?T.LIGHT:'none','stroke-width':plate?.8:arc?.6:null,'fill-opacity':null})
}
// a track is the quiet ground under a value: a pale ochre screen with a fine engraved edge; a box that is drawn
// as a tick-box (filled and stroked) becomes a plate with a muted edge
function track(p){
  if(isGroup(p))return paint(p,{stroke:T.LIGHT})
  const has=k=>!['','none','transparent'].includes(String(p.getAttribute(k)||'').trim().toLowerCase())
  if(has('fill')&&has('stroke'))return set(p,{fill:T.PLATE,stroke:T.MUTED,'stroke-width':.8})
  set(p,has('fill')?{fill:T.PALE_OCHRE,stroke:T.LIGHT,'stroke-width':.6}:{stroke:T.LIGHT})
}
// parts a plugin leaves without a role (a figure's placeholder): pale tints become the plate, greys the muted ink;
// saturated colours are the author's and stay
function after(node){
  for(const n of node.querySelectorAll('[fill],[stroke]')){
    if(n.closest('[data-role],defs,pattern,clipPath,mask'))continue
    for(const k of ['fill','stroke']){
      const v=(n.getAttribute(k)||'').trim().toLowerCase(),m=/^#([0-9a-f]{6})$/.exec(v)
      if(!m||OWN.has(v)||/^#f{6}$/.test(v))continue
      const rgb=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)),pale=luminance(v)>.6
      if(Math.max(...rgb)-Math.min(...rgb)>40&&!pale)continue
      n.setAttribute(k,k==='fill'?(pale?T.PLATE:T.MUTED):pale?T.LIGHT:T.MUTED)
    }
  }
}
export const scientificatlas={id:'scientific-atlas',label:'Scientific Atlas',tokens,ground:T.PAPER,font:T.BODY,
  fonts:['Libre Baskerville','Source Serif 4','Noto Serif SC'],series:SERIES,native,after,
  roles:{
    // a ring's arc (an annulus: two arcs) is the value: full ink; a pie's wedge is a pale screen
    bar:mark,cell:mark,band:(p,c)=>mark(p,c,{pale:true}),slice:(p,c)=>mark(p,c,{pale:((p.getAttribute('d')||'').match(/A/gi)||[]).length<2}),area:(p,c)=>mark(p,c,{pale:true}),
    bubble:(p,c)=>mark(p,c,{pale:true}),node:(p,c)=>mark(p,c,{pale:true}),range:(p,c)=>mark(p,c,{pale:true}),
    line:(p,c)=>set(p,{stroke:seriesOf(p,c).colour,'stroke-linecap':'round','stroke-linejoin':'round'}),
    point:(p,c)=>set(p,{fill:T.PLATE,stroke:seriesOf(p,c).colour,'stroke-width':1.3}),
    marker:p=>set(p,{fill:T.PLATE,stroke:T.INK,'stroke-width':.9,'fill-opacity':null}),
    link:p=>isGroup(p)?paint(p,{stroke:T.INK}):set(p,stroked(p)?{stroke:T.INK}:{fill:T.INK}),
    track,
    rule,surface,icon,
    // a value on a two-sided scale: blue below the middle, red above
    diverging:p=>{const fill=onDiverging(p,[T.BLUE,T.LIGHT,T.RED]);if(fill)set(p,{fill})},
    swatch:(p,c)=>mark(p,c),heat:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PLATE,T.PALE_BLUE,T.BLUE,T.INK])}),
    stripe:p=>set(p,{fill:onRamp(p.getAttribute('fill'),[T.PAPER,T.RED,T.INK])}),
    span:(p,c)=>{const col=c.scale('span',paintOf(p),[T.PALE_GREEN,T.PALE_BLUE]).colour;set(p,stroked(p)||hollow(p)?{stroke:col}:{fill:col,opacity:.5,...(p.getAttribute('stroke')&&p.getAttribute('stroke')!=='none'?{stroke:T.MUTED}:{})})},
    grid:p=>paint(p,{stroke:T.LIGHT,'stroke-width':.5,'stroke-opacity':.8}),axis:p=>isGroup(p)?paint(p,{stroke:T.INK,'stroke-width':.8}):set(p,stroked(p)||hollow(p)?{stroke:T.INK,'stroke-width':.8}:{fill:T.INK}),
    guide:p=>set(p,{stroke:T.RED,'stroke-dasharray':p.getAttribute('stroke-dasharray')||'4 3'}),leader:p=>set(p,{stroke:T.MUTED,'stroke-width':.65}),
    land:p=>set(p,{fill:stroked(p)?'none':T.LAND,stroke:T.MUTED,'stroke-width':.65}),
    water:p=>set(p,stroked(p)?{stroke:T.BLUE}:{fill:T.WATER,stroke:T.BLUE}),
    relief:p=>set(p,stroked(p)?{stroke:T.MUTED}:{fill:T.PALE_OCHRE}),
    title:(p,c)=>type(p,'title',c),label:(p,c)=>type(p,'label',c),value:(p,c)=>type(p,'value',c),tick:(p,c)=>type(p,'tick',c),
  }
}
export default scientificatlas
