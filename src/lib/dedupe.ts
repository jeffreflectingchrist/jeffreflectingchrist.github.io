// Substack puts the cover picture at the top of the post text as well as in the
// post's "cover image" field. The site shows the cover on its own, so if the
// text starts with that same picture, remove it from the text to avoid a double.
const idOf = (url: string): string => {
  let u = url;
  try { u = decodeURIComponent(url); } catch {}
  const uuid = u.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  if (uuid) return uuid.toLowerCase();
  return (u.split('?')[0].split('/').pop() ?? '').toLowerCase();
};

export function dropLeadingCover(html: string, cover?: string): string {
  if (!cover || cover === 'illustration') return html;
  const id = idOf(cover);
  if (!id) return html;
  const starts = [
    /^\s*(?:<p>\s*<\/p>\s*)?<div class="captioned-image-container">[\s\S]*?<\/figure>\s*<\/div>/i,
    /^\s*(?:<p>\s*<\/p>\s*)?<figure[\s\S]*?<\/figure>/i,
  ];
  for (const re of starts) {
    const m = html.match(re);
    if (m && decodeURIComponent(m[0]).toLowerCase().includes(id)) {
      return html.slice(m[0].length).replace(/^\s+/, '');
    }
  }
  return html;
}
