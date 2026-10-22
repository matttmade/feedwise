import { JSDOM } from "jsdom";

const BLOCKS_PER_CHUNK = 6;

/**
 * Split article HTML into short sections so long reads come in visible, finishable parts.
 * Breaks at h2/h3 headings; without headings, every few blocks.
 */
export function chunkHtml(html: string): string[] {
  let root: Element = JSDOM.fragment(`<div>${html}</div>`).firstElementChild!;
  // Readability wraps everything in nested divs; look through them.
  while (root.firstElementChild?.tagName === "DIV" && onlyChild(root)) {
    root = root.firstElementChild;
  }
  const nodes = Array.from(root.childNodes).filter(
    (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()),
  );
  const hasHeadings = nodes.some((n) => isHeading(n));

  const chunks: string[][] = [[]];
  for (const node of nodes) {
    const current = chunks[chunks.length - 1];
    const startNew = hasHeadings ? isHeading(node) : current.length >= BLOCKS_PER_CHUNK;
    if (startNew && current.length) chunks.push([]);
    chunks[chunks.length - 1].push(outer(node));
  }
  return chunks.map((c) => c.join("")).filter((c) => c.trim());
}

/** The element's sole content is one child element (ignoring whitespace). */
const onlyChild = (el: Element) =>
  Array.from(el.childNodes).filter((n) => n.nodeType === 1 || n.textContent?.trim()).length === 1;
const isHeading = (n: Node) => n.nodeType === 1 && /^H[23]$/.test((n as Element).tagName);
const outer = (n: Node) => (n.nodeType === 1 ? (n as Element).outerHTML : (n.textContent ?? ""));
