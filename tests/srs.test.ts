import { describe, expect, it } from "vitest";
import { newCardState, rate, untilLabel, type StoredFsrs } from "../lib/srs/fsrs";
import { BLANK, buildPrompt, clozeTerm } from "../lib/srs/prompts";
import { buildQueue, sessionMinutes } from "../lib/srs/queue";

const day = 86_400_000;
const t0 = new Date("2026-10-20T09:00:00Z");

describe("fsrs wrapper", () => {
  it("schedules a new card days out on Got it, and keeps it at least a day away on Forgot", () => {
    const card = newCardState(t0);
    expect(card.due).toBe(t0.toISOString());
    const good = rate(card, "good", t0, { fuzz: false });
    const again = rate(card, "again", t0, { fuzz: false });
    const hard = rate(card, "hard", t0, { fuzz: false });
    const gap = (s: StoredFsrs) => (new Date(s.due).getTime() - t0.getTime()) / day;
    expect(gap(again)).toBeGreaterThanOrEqual(1);
    expect(gap(hard)).toBeGreaterThanOrEqual(gap(again));
    expect(gap(good)).toBeGreaterThan(gap(hard));
    expect(good.reps).toBe(1);
  });

  it("spreads successful reviews further apart over two weeks", () => {
    let card = newCardState(t0);
    let now = t0;
    const gaps: number[] = [];
    while (now.getTime() - t0.getTime() < 14 * day) {
      const next = rate(card, "good", now, { fuzz: false });
      gaps.push(Math.round((new Date(next.due).getTime() - now.getTime()) / day));
      now = new Date(next.due);
      card = next;
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it("counts a lapse on Forgot after the card was known", () => {
    const known = rate(newCardState(t0), "good", t0, { fuzz: false });
    const lapsed = rate(known, "again", new Date(known.due), { fuzz: false });
    expect(lapsed.lapses).toBe(1);
  });

  it("labels when a card comes back", () => {
    expect(untilLabel(new Date(t0.getTime() + day).toISOString(), t0)).toBe("tomorrow");
    expect(untilLabel(new Date(t0.getTime() + 5 * day).toISOString(), t0)).toBe("in 5 days");
    expect(untilLabel(new Date(t0.getTime() + 21 * day).toISOString(), t0)).toBe("in 3 weeks");
  });
});

describe("buildQueue", () => {
  const cards = [
    { id: "a", due: "2026-10-18T00:00:00Z" },
    { id: "b", due: "2026-10-20T08:00:00Z" },
    { id: "c", due: "2026-10-19T00:00:00Z" },
    { id: "d", due: "2026-10-25T00:00:00Z" },
  ];

  it("returns due cards, oldest first", () => {
    const q = buildQueue(cards, { now: t0, cap: 10, reviewedToday: 0 });
    expect(q.queue.map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(q.dueTotal).toBe(3);
  });

  it("never exceeds the cap, counting what's already been reviewed today", () => {
    expect(buildQueue(cards, { now: t0, cap: 2, reviewedToday: 0 }).queue).toHaveLength(2);
    const later = buildQueue(cards, { now: t0, cap: 2, reviewedToday: 1 });
    expect(later.queue.map((c) => c.id)).toEqual(["a"]);
    expect(buildQueue(cards, { now: t0, cap: 2, reviewedToday: 5 }).queue).toEqual([]);
  });

  it("estimates session length", () => {
    expect(sessionMinutes(1)).toBe(1);
    expect(sessionMinutes(10)).toBe(3);
  });
});

describe("buildPrompt", () => {
  it("blanks a number with its unit", () => {
    const p = buildPrompt({
      itemTitle: "Attention",
      text: "Agents now log 6 hours of work for every human hour spent reviewing their output.",
    });
    expect(p.kind).toBe("cloze");
    expect(p.prompt).toContain(BLANK);
    expect(p.answer).toBe("6 hours");
  });

  it("blanks a proper noun that isn't the first word", () => {
    expect(
      clozeTerm("The native random function landed in Safari and is rolling out slowly elsewhere")
        ?.word,
    ).toBe("Safari");
  });

  it("falls back to the longest uncommon word", () => {
    expect(
      clozeTerm("good design systems balance consistency with a little playful imperfection")?.word,
    ).toBe("imperfection");
  });

  it("uses a key-idea prompt for short highlights and plain keeps", () => {
    expect(buildPrompt({ itemTitle: "Naming things", text: "Name the job." }).kind).toBe("idea");
    const keep = buildPrompt({
      itemTitle: "Naming things",
      fallbackAnswer: "Names should describe the job.",
    });
    expect(keep).toEqual({
      prompt: "What was the key idea of “Naming things”?",
      answer: "Names should describe the job.",
      kind: "idea",
    });
    expect(buildPrompt({ itemTitle: "X", note: "My note", fallbackAnswer: "Summary" }).answer).toBe(
      "My note",
    );
  });

  it("asks about saved images", () => {
    const p = buildPrompt({
      itemTitle: "Posters",
      imageUrl: "https://x/y.jpg",
      note: "Two-colour misregistration",
    });
    expect(p.kind).toBe("image");
    expect(p.answer).toBe("Two-colour misregistration");
  });

  it("adds the note under a cloze answer", () => {
    const p = buildPrompt({
      itemTitle: "Attention",
      text: "Reading their output would eat half of every working week for the whole team.",
      note: "Design for judgement",
    });
    expect(p.answer).toMatch(/\n\nDesign for judgement$/);
  });
});
