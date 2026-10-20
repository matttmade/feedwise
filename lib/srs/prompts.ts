/** Turn a highlight into a recall prompt: fill-in-the-blank when the text allows, else "key idea". */

export type PromptInput = {
  itemTitle: string;
  text?: string | null;
  note?: string | null;
  imageUrl?: string | null;
  /** Used as the answer for a plain Keep with no note (usually the item summary). */
  fallbackAnswer?: string | null;
};

export type Prompt = { prompt: string; answer: string; kind: "cloze" | "idea" | "image" };

export const BLANK = "_____";

const STOP = new Set(
  "about above after again against because before being below between could doesn't during every further having however itself might myself other ourselves should something themselves there these those through under until where which while would yourself really actually".split(
    " ",
  ),
);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function buildPrompt(h: PromptInput): Prompt {
  const title = clip(h.itemTitle.trim(), 90);
  const note = h.note?.trim() || null;
  const text = h.text?.replace(/\s+/g, " ").trim() || null;

  if (h.imageUrl && !text) {
    return {
      prompt: `From “${title}”: what did this image show, and why did you save it?`,
      answer: note ?? `An image you saved from “${title}”.`,
      kind: "image",
    };
  }
  if (text) {
    const term = clozeTerm(text);
    if (term) {
      const blanked = text.replace(term.raw, BLANK);
      return {
        prompt: clip(blanked, 400),
        answer: note ? `${term.word}\n\n${note}` : term.word,
        kind: "cloze",
      };
    }
    return {
      prompt: `What was the key idea of “${title}”?`,
      answer: clip(note ? `${text}\n\n${note}` : text, 600),
      kind: "idea",
    };
  }
  return {
    prompt: `What was the key idea of “${title}”?`,
    answer: clip(note ?? h.fallbackAnswer?.trim() ?? title, 600),
    kind: "idea",
  };
}

/**
 * The word worth hiding: a number with its unit, else a proper noun that isn't the first word,
 * else the longest uncommon word. Only for highlights long enough to give context (8–60 words).
 */
export function clozeTerm(text: string): { word: string; raw: string } | null {
  const words = text.split(" ");
  if (words.length < 8 || words.length > 60) return null;

  const number =
    /\b\d[\d.,]*(?:\s?(?:%|percent|hours?|minutes?|days?|weeks?|years?|ms|px|wpm|x))?/i.exec(text);
  if (number && number[0].replace(/[.,]$/, "").length >= 2) {
    const raw = number[0].replace(/[.,]$/, "");
    return { word: raw, raw };
  }

  const tokens = words.map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    const prevEndsSentence = /[.!?:]$/.test(words[i - 1]);
    if (!prevEndsSentence && /^\p{Lu}[\p{L}'-]{2,}$/u.test(t) && !STOP.has(t.toLowerCase())) {
      return { word: t, raw: t };
    }
  }

  const longest = tokens
    .filter((t) => /^[\p{L}'-]{7,}$/u.test(t) && !STOP.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return longest ? { word: longest, raw: longest } : null;
}
