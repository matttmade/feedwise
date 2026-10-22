import type { CardItem } from "@/lib/data/feed";
import { clampRatio } from "@/lib/feed/masonry";
import { FallbackArt } from "./fallback-art";

type Props = {
  item: Pick<CardItem, "image" | "type" | "sourceTitle" | "sourceId">;
  sizes: string;
  /** Clamp very tall or very wide images so one card can't dominate the board. */
  ratio?: "native" | "wide" | "cinema";
  priority?: boolean;
  /** Fill the parent's height from 1024px up (hero beside its text). */
  fillOnLarge?: boolean;
};

/**
 * Lead image through the proxy. Three layers, no JavaScript: branded fallback art at the
 * bottom, a tiny blurred preview above it, the real image on top. If the image (and so the
 * preview) fails to load, the fallback simply shows through.
 */
export function CardImage({
  item,
  sizes,
  ratio = "native",
  priority = false,
  fillOnLarge = false,
}: Props) {
  const image = item.image;
  const aspect =
    ratio === "cinema"
      ? 2.2
      : ratio === "wide"
        ? 16 / 9
        : image
          ? clampRatio(image.width / image.height)
          : 4 / 3;

  return (
    <div
      className={fillOnLarge ? "img-frame lg:aspect-auto lg:h-full" : "img-frame"}
      style={{ "--ar": aspect } as React.CSSProperties}
    >
      <FallbackArt item={item} />
      {image && (
        <>
          {/* The preview is an <img>, not a CSS background, so off-screen cards don't fetch it early. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- 24px preview from our proxy */}
          <img
            src={image.blur}
            alt=""
            aria-hidden="true"
            loading={priority ? "eager" : "lazy"}
            className="img-blur"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- our own proxy already resizes and caches */}
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes={sizes}
            width={image.width}
            height={image.height}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="img-fill"
          />
        </>
      )}
    </div>
  );
}
