// CLEAN LINES: a theme without its hand's distortion — the same theme (colours, fonts, washes, hatching, the pencil
// outline) with the filters that move a shape's edges left out: tremor (a trembling line, marks.js) and bleed (a wash's
// wet edge). Straight lines and crisp edges, and lighter to draw: those filters are what make zoom and pan slow.
// A theme of its own, registered beside its base under its own id, until page themes take options (then this is a
// switch on the theme, not a second entry in the list).
//
//   clean(youdata)   // id 'youdata-clean', label 'youdata · 有数 · clean lines', base 'youdata'
//
// It works by what the theme asks its context to define: a theme draws through ctx.def(key, build), which here
// answers null for the distortion filters' keys — and a part's filter: null is no filter at all (marks.js set()).
const SHAKES = /^(tremor-|bleed$)/

export function clean(theme, { id = `${theme.id}-clean`, label = `${theme.label || theme.id} · clean lines` } = {}) {
  // the context, as the theme's own but for those keys (ctx is per drawing; a fresh view of it costs nothing)
  const calm = c => (c && typeof c.def === 'function' ? Object.assign(Object.create(c), { def: (key, build) => (SHAKES.test(String(key)) ? null : c.def(key, build)) }) : c)
  const wrap = fn => (typeof fn === 'function' ? (part, c, ...rest) => fn(part, calm(c), ...rest) : fn)
  const out = { ...theme, id, label, base: theme.id, roles: Object.fromEntries(Object.entries(theme.roles || {}).map(([k, fn]) => [k, wrap(fn)])) }
  for (const k of ['native', 'after']) if (typeof theme[k] === 'function') out[k] = wrap(theme[k])
  return out
}

export default clean
