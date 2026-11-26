// A PAGE THEME draws each kind of part in its own way. Plugins mark the parts they draw with data-role (band, bar,
// line, area, point, node, label, title, grid, axis, surface …: README.md); the document names its theme in
// doc.meta.theme; after a type's render(), each marked part goes to the theme's function for its role, which changes
// it or returns what to draw instead. A part whose role the theme doesn't know stays as the plugin drew it. One role
// is reserved: 'keep' — a part whose colours are its meaning (a ramp's cells, a number inked for contrast on them)
// stays as drawn in every theme.
//
// For now a plugin installs this hook (the page-themes plugin). It is written so that it can move into nx-svg-editor
// as it is: there, registerElementType would wrap render() once, and ctx.registerTheme would add to `themes`.

const SVG_NS = 'http://www.w3.org/2000/svg'

// white (or nearly): in a plugin it is the page's ground (a node's fill, a halo, a ring), never a series
const WHITE = /^(#fff|#ffffff|white|#f[a-f0-9]f[a-f0-9]f[a-f0-9])$/
const PURE_WHITE = /^(#fff|#ffffff|white)$/

/** The context a role function gets: the element, the theme, a counter per role, and helpers to make SVG nodes and
 *  to add a def (a pattern, a filter) once to this drawing. */
function contextOf(node, el, theme) {
  const doc = node.ownerDocument, counts = {}, uid = String(el?.id || 'x').replace(/[^\w-]/g, ''), seen = new Map()
  let defs = null
  const added = new Set(), scales = {}
  // white is the ground; for a series, near-white too (a pale plate) — a named scale's pale colours (a weekend's tint, a
  // pale zone) are its own steps, kept apart from the paper
  const scale = (map, colour, list, near = true) => {
    const key = String(colour || '').trim().toLowerCase()
    if ((near ? WHITE : PURE_WHITE).test(key) && theme.ground) return { colour: theme.ground, i: -1, ground: true }
    if (!key || key === 'none' || key.startsWith('url(') || !list.length) return { colour: list[0], i: 0 }
    if (!map.has(key)) map.set(key, map.size)
    const i = map.get(key)
    return { colour: list[i % list.length], i }
  }
  const make = (tag, attrs = {}, kids = []) => {
    const n = doc.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) if (v != null && v !== '') n.setAttribute(k, String(v))
    for (const c of kids) n.appendChild(c)
    return n
  }
  return {
    el, theme, tokens: theme.tokens || {}, make,
    /** The n-th part of this role so far (0, 1, …). */
    index: role => (counts[role] = (counts[role] ?? -1) + 1),
    /** The theme's series colour for a plugin's colour, and its number: each colour the plugin used becomes one of
     *  the theme's (theme.series), in the order they first appear, so a series keeps one colour on every part. */
    series: colour => scale(seen, colour, theme.series || []),
    /** The same for another set of colours, counted on its own (`name`): a gauge's zones, shaded rows. */
    scale: (name, colour, list) => scale(scales[name] ||= new Map(), colour, list, false),
    seen,
    /** A def's url, added to this drawing the first time: build(id) returns the def node. */
    def(key, build) {
      const id = `th-${theme.id}-${uid}-${key}`
      if (!defs) { defs = make('defs'); node.insertBefore(defs, node.firstChild) }
      if (!added.has(id)) { added.add(id); defs.appendChild(build(id)) }
      return `url(#${id})`
    },
  }
}

/** The drawing of one element, with the theme applied to its marked parts. */
export function themeNode(node, el, theme) {
  if (!theme || !node?.querySelectorAll) return node
  const ctx = contextOf(node, el, theme)
  for (const part of [...node.querySelectorAll('[data-role]')]) {
    const role = part.getAttribute('data-role'), fn = role !== 'keep' && theme.roles?.[role]
    if (!fn) continue
    const out = fn(part, ctx)
    if (out && out !== part) part.replaceWith(out)
  }
  // what no role covered (outside every marked part): the plugin's series colours still become the theme's
  // (names at the line ends, untagged marks), and text takes the theme's font
  for (const n of node.querySelectorAll('[fill], [stroke], [stop-color]')) {
    if (n.closest('[data-role]')) continue
    for (const k of ['fill', 'stroke', 'stop-color']) {
      const v = n.getAttribute(k)?.trim().toLowerCase()
      if (v && ctx.seen.has(v)) n.setAttribute(k, ctx.series(v).colour)
      else if (v && theme.ground && WHITE.test(v) && k === 'stroke') n.setAttribute(k, theme.ground)   // a white halo: the ground's
    }
  }
  if (theme.font) for (const t of node.querySelectorAll('text:not([data-role])')) if (!t.closest('[data-role]')) t.setAttribute('font-family', theme.font)
  theme.after?.(node, ctx)
  node.setAttribute('data-theme', theme.id)
  return node
}

/** The theme a shape is drawn in: its own (doc.meta.themeOf[id]: a theme's id, or 'none' for the plugin's drawing),
 *  else the page's (doc.meta.theme), else none. */
export function themeFor(meta, el, themes) {
  const own = el?.id != null ? meta?.themeOf?.[el.id] : undefined
  const id = own ?? meta?.theme
  return (id && id !== 'none' && themes[id]) || null
}

/** Wrap every element type's render() (and those registered later) so its drawing takes the document's theme.
 *  `themes`: { id: theme }. Returns the undo. */
export function installThemeHook(editor, themes) {
  const current = el => themeFor(editor.getDoc?.()?.meta, el, themes)
  const wrapped = new Set()
  const wrap = t => {
    if (!t || typeof t.render !== 'function' || t.__rawRender) return
    const raw = t.render
    t.__rawRender = raw
    t.render = function (el, ...rest) {
      const node = raw.call(this, el, ...rest), theme = current(el)
      if (!theme || !node) return node
      try { return themeNode(node, el, theme) } catch (e) { console.warn(`page theme ${theme.id}: ${t.id}:`, e); return raw.call(this, el, ...rest) }
    }
    wrapped.add(t)
  }
  const wrapAll = () => { for (const t of editor.getElementTypes()) wrap(t) }
  wrapAll()
  const off = editor.on?.('plugins:changed', wrapAll)
  editor.redraw?.()
  return () => {
    off?.()
    for (const t of wrapped) { t.render = t.__rawRender; delete t.__rawRender }
    wrapped.clear()
    editor.redraw?.()
  }
}
