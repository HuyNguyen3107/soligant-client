import { useState } from "react";
import type { ImgHTMLAttributes, ReactNode, SyntheticEvent } from "react";

interface ImageWithFallbackProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: ReactNode;
  fallbackClassName?: string;
  /**
   * Treat the image as decorative — emits an empty alt and aria-hidden so
   * screen readers skip it. Use only when the surrounding text already
   * conveys the same information.
   */
  decorative?: boolean;
}

const ImageWithFallback = ({
  src,
  alt,
  fallback,
  fallbackClassName,
  decorative,
  onError,
  ...imageProps
}: ImageWithFallbackProps) => {
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const resolvedAlt = decorative ? "" : (alt ?? "");

  if (!normalizedSrc || errorSrc === normalizedSrc) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (fallbackClassName) {
      return (
        <div
          className={fallbackClassName}
          role={resolvedAlt ? "img" : undefined}
          aria-label={resolvedAlt || undefined}
          aria-hidden={decorative || !resolvedAlt ? true : undefined}
        />
      );
    }

    return null;
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setErrorSrc(normalizedSrc);
    onError?.(event);
  };

  return (
    <img
      {...imageProps}
      src={normalizedSrc}
      alt={resolvedAlt}
      aria-hidden={decorative ? true : undefined}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
};

export { ImageWithFallback };