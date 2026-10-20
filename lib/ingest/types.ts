export type FeedFormat = "rss" | "atom" | "json" | "rdf";

export type ItemType = "article" | "video" | "image_set";

/** Injected so every network call can be replaced by fixtures in tests. */
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type DiscoveredFeed = {
  url: string;
  format: FeedFormat;
  title?: string;
  /** How we found it: the URL itself, a <link rel=alternate>, a guessed path, or YouTube rules. */
  via: "self" | "link" | "common-path" | "youtube";
};

export type DiscoverResult = {
  siteUrl: string;
  feeds: DiscoveredFeed[];
  /** The site page's og:image — used to spot items that only carry the site default. */
  siteImage?: string;
  /** Page-level problem (e.g. bot wall) that didn't stop path guessing. */
  warning?: string;
};

export type MediaRef = {
  url: string;
  kind: "image" | "video" | "audio" | "other";
  mime?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  from: "enclosure" | "media" | "json" | "itunes";
};

/** A feed entry normalised across RSS / Atom / JSON Feed / RDF. */
export type RawItem = {
  guid: string;
  url: string;
  title: string;
  summary?: string;
  contentHtml?: string;
  author?: string;
  publishedAt?: string;
  media: MediaRef[];
};

export type ParsedFeed = {
  format: FeedFormat;
  title?: string;
  siteUrl?: string;
  items: RawItem[];
};

export type FeedRequest = {
  url: string;
  etag?: string | null;
  lastModified?: string | null;
};

export type FetchFeedResult =
  | {
      status: "ok";
      feed: ParsedFeed;
      etag?: string;
      lastModified?: string;
    }
  | { status: "not-modified" }
  | { status: "error"; error: string; httpStatus?: number };

export type PageMeta = {
  title?: string;
  description?: string;
  ogType?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  videoUrl?: string;
  durationSeconds?: number;
  siteName?: string;
};

export type EnrichedItem = {
  guid: string;
  url: string;
  title: string;
  summary: string | null;
  type: ItemType;
  leadImageUrl: string | null;
  leadImageSource: "feed" | "og" | "content" | "oembed" | null;
  media: MediaRef[];
  embedHtml: string | null;
  bodyHtml: string | null;
  readMinutes: number | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  /** Non-fatal problems hit while enriching (page blocked, oEmbed failed…). */
  notes: string[];
};
