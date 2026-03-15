import { useState } from "react";
import type { ImgHTMLAttributes, ReactNode, SyntheticEvent } from "react";

interface ImageWithFallbackProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: ReactNode;
  fallbackClassName?: string;
}

const ImageWithFallback = ({
  src,
  alt,
  fallback,
  fallbackClassName,
  onError,
  ...imageProps
}: ImageWithFallbackProps) => {
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const normalizedSrc = typeof src === "string" ? src.trim() : "";

  if (!normalizedSrc || errorSrc === normalizedSrc) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (fallbackClassName) {
      return (
        <div
          className={fallbackClassName}
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
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
      alt={alt}
      onError={handleError}
    />
  );
};

export { ImageWithFallback };