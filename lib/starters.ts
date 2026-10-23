/** A first edition for new accounts: well-kept, image-led feeds to pick from on the welcome step. */
export type Starter = {
  id: string;
  title: string;
  /** What it covers, as mono-caps meta. */
  about: string;
  siteUrl: string;
  feedUrl: string;
  feedType: "rss" | "atom";
};

export const STARTERS: Starter[] = [
  {
    id: "colossal",
    title: "Colossal",
    about: "Art · Craft",
    siteUrl: "https://www.thisiscolossal.com/",
    feedUrl: "https://www.thisiscolossal.com/feed/",
    feedType: "rss",
  },
  {
    id: "dezeen",
    title: "Dezeen",
    about: "Architecture · Design",
    siteUrl: "https://www.dezeen.com/",
    feedUrl: "https://www.dezeen.com/feed/",
    feedType: "rss",
  },
  {
    id: "nasa",
    title: "NASA Image of the Day",
    about: "Space",
    siteUrl: "https://www.nasa.gov/image-of-the-day/",
    feedUrl: "https://www.nasa.gov/feeds/iotd-feed/",
    feedType: "rss",
  },
  {
    id: "quanta",
    title: "Quanta Magazine",
    about: "Science · Maths",
    siteUrl: "https://www.quantamagazine.org/",
    feedUrl: "https://www.quantamagazine.org/feed/",
    feedType: "rss",
  },
  {
    id: "aeon",
    title: "Aeon",
    about: "Ideas · Essays",
    siteUrl: "https://aeon.co/",
    feedUrl: "https://aeon.co/feed.rss",
    feedType: "rss",
  },
  {
    id: "verge",
    title: "The Verge",
    about: "Technology",
    siteUrl: "https://www.theverge.com/",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    feedType: "atom",
  },
  {
    id: "pdr",
    title: "The Public Domain Review",
    about: "History · Archives",
    siteUrl: "https://publicdomainreview.org/",
    feedUrl: "https://publicdomainreview.org/rss.xml",
    feedType: "rss",
  },
  {
    id: "kurzgesagt",
    title: "Kurzgesagt",
    about: "Video · Science",
    siteUrl: "https://www.youtube.com/@kurzgesagt",
    feedUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q",
    feedType: "atom",
  },
];

/** Picked to begin with: one each of art, science and ideas. */
export const DEFAULT_STARTERS = ["colossal", "quanta", "aeon"];

/** The starters matching the submitted ids, in list order; unknown ids are ignored. */
export function pickStarters(ids: string[]): Starter[] {
  const wanted = new Set(ids);
  return STARTERS.filter((s) => wanted.has(s.id));
}
