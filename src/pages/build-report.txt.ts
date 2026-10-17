import { readFile } from 'node:fs/promises';

// A plain text page that shows what Substack answered when the site was last built.
export async function GET() {
  let text = 'No build report was written during this build.\n';
  try {
    text = await readFile('.build-report.txt', 'utf8');
  } catch {
    // keep the default message
  }
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
