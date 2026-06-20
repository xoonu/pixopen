import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

export type ScrollOrientation = 'horizontal' | 'vertical';

type ScrollMetrics = {
  scrollSize: number;
  clientSize: number;
  scrollPos: number;
};

type Props = {
  children: ReactNode;
  orientation?: ScrollOrientation;
  /** Accessible name for the scrollable region. */
  label: string;
  /** Optional ID of an element that labels this region instead of `label`. */
  labelledBy?: string;
  className?: string;
  viewportClassName?: string;
};

const MIN_THUMB_PX = 28;
const ARROW_SCROLL_PX = 48;

function readMetrics(el: HTMLElement, horizontal: boolean): ScrollMetrics {
  return {
    scrollSize: horizontal ? el.scrollWidth : el.scrollHeight,
    clientSize: horizontal ? el.clientWidth : el.clientHeight,
    scrollPos: horizontal ? el.scrollLeft : el.scrollTop,
  };
}

export function ScrollRegion({
  children,
  orientation = 'vertical',
  label,
  labelledBy,
  className,
  viewportClassName,
}: Props) {
  const horizontal = orientation === 'horizontal';
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointer: number; scroll: number } | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>({ scrollSize: 0, clientSize: 0, scrollPos: 0 });
  const [trackSize, setTrackSize] = useState(0);
  const [dragging, setDragging] = useState(false);

  const maxScroll = Math.max(0, metrics.scrollSize - metrics.clientSize);
  const scrollable = maxScroll > 1;
  const thumbRatio = metrics.scrollSize > 0 ? metrics.clientSize / metrics.scrollSize : 1;
  const thumbSize = scrollable ? Math.max(MIN_THUMB_PX, trackSize * thumbRatio) : 0;
  const thumbTravel = Math.max(0, trackSize - thumbSize);
  const thumbOffset = maxScroll > 0 ? (metrics.scrollPos / maxScroll) * thumbTravel : 0;

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setMetrics(readMetrics(viewport, horizontal));
  }, [horizontal]);

  const updateTrackSize = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setTrackSize(horizontal ? track.clientWidth : track.clientHeight);
  }, [horizontal]);

  useLayoutEffect(() => {
    updateMetrics();
    if (scrollable) updateTrackSize();
  }, [updateMetrics, updateTrackSize, scrollable, children]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateMetrics();
    viewport.addEventListener('scroll', updateMetrics, { passive: true });

    const viewportObserver = new ResizeObserver(updateMetrics);
    viewportObserver.observe(viewport);

    const mutationObserver = new MutationObserver(updateMetrics);
    mutationObserver.observe(viewport, { childList: true, subtree: true, attributes: true });

    return () => {
      viewport.removeEventListener('scroll', updateMetrics);
      viewportObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateMetrics]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !scrollable) return;

    updateTrackSize();
    const trackObserver = new ResizeObserver(updateTrackSize);
    trackObserver.observe(track);
    return () => trackObserver.disconnect();
  }, [scrollable, updateTrackSize]);

  const scrollTo = useCallback(
    (next: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const clamped = Math.max(0, Math.min(maxScroll, next));
      if (horizontal) viewport.scrollLeft = clamped;
      else viewport.scrollTop = clamped;
    },
    [horizontal, maxScroll],
  );

  const scrollBy = useCallback(
    (delta: number) => scrollTo(metrics.scrollPos + delta),
    [metrics.scrollPos, scrollTo],
  );

  const handleViewportKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!scrollable) return;

    const pageDelta = metrics.clientSize * 0.85;
    let handled = true;

    if (horizontal) {
      switch (event.key) {
        case 'ArrowLeft':
          scrollBy(-ARROW_SCROLL_PX);
          break;
        case 'ArrowRight':
          scrollBy(ARROW_SCROLL_PX);
          break;
        case 'Home':
          scrollTo(0);
          break;
        case 'End':
          scrollTo(maxScroll);
          break;
        case 'PageUp':
          scrollBy(-pageDelta);
          break;
        case 'PageDown':
          scrollBy(pageDelta);
          break;
        default:
          handled = false;
      }
    } else {
      switch (event.key) {
        case 'ArrowUp':
          scrollBy(-ARROW_SCROLL_PX);
          break;
        case 'ArrowDown':
          scrollBy(ARROW_SCROLL_PX);
          break;
        case 'Home':
          scrollTo(0);
          break;
        case 'End':
          scrollTo(maxScroll);
          break;
        case 'PageUp':
          scrollBy(-pageDelta);
          break;
        case 'PageDown':
          scrollBy(pageDelta);
          break;
        default:
          handled = false;
      }
    }

    if (handled) event.preventDefault();
  };

  const handleThumbKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!scrollable) return;

    const pageDelta = metrics.clientSize * 0.85;
    let handled = true;

    if (horizontal) {
      switch (event.key) {
        case 'ArrowLeft':
          scrollBy(-ARROW_SCROLL_PX);
          break;
        case 'ArrowRight':
          scrollBy(ARROW_SCROLL_PX);
          break;
        case 'Home':
          scrollTo(0);
          break;
        case 'End':
          scrollTo(maxScroll);
          break;
        case 'PageUp':
          scrollBy(-pageDelta);
          break;
        case 'PageDown':
          scrollBy(pageDelta);
          break;
        default:
          handled = false;
      }
    } else {
      switch (event.key) {
        case 'ArrowUp':
          scrollBy(-ARROW_SCROLL_PX);
          break;
        case 'ArrowDown':
          scrollBy(ARROW_SCROLL_PX);
          break;
        case 'Home':
          scrollTo(0);
          break;
        case 'End':
          scrollTo(maxScroll);
          break;
        case 'PageUp':
          scrollBy(-pageDelta);
          break;
        case 'PageDown':
          scrollBy(pageDelta);
          break;
        default:
          handled = false;
      }
    }

    if (handled) event.preventDefault();
  };

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrollable || event.button !== 0) return;
    if (event.target !== event.currentTarget) return;

    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    const rect = track.getBoundingClientRect();
    const clickPos = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
    const targetScroll = ((clickPos - thumbSize / 2) / thumbTravel) * maxScroll;
    scrollTo(Number.isFinite(targetScroll) ? targetScroll : 0);
  };

  const handleThumbPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!scrollable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointer: horizontal ? event.clientX : event.clientY,
      scroll: metrics.scrollPos,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleThumbPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragRef.current || thumbTravel <= 0) return;
    const delta = (horizontal ? event.clientX : event.clientY) - dragRef.current.pointer;
    const scrollDelta = (delta / thumbTravel) * maxScroll;
    scrollTo(dragRef.current.scroll + scrollDelta);
  };

  const endThumbDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const thumbStyle: CSSProperties = horizontal
    ? { width: thumbSize, height: '100%', transform: `translateX(${thumbOffset}px)` }
    : { width: '100%', height: thumbSize, transform: `translateY(${thumbOffset}px)` };

  const regionLabelProps = labelledBy
    ? { 'aria-labelledby': labelledBy }
    : { 'aria-label': label };

  const thumbLabel = label ? `${label} scroll position` : 'Scroll position';

  return (
    <div
      className={`scroll-region scroll-region-${orientation}${className ? ` ${className}` : ''}${scrollable ? ' is-scrollable' : ''}`}
    >
      <div
        ref={viewportRef}
        className={`scroll-region-viewport${viewportClassName ? ` ${viewportClassName}` : ''}`}
        tabIndex={scrollable ? 0 : undefined}
        role="region"
        {...regionLabelProps}
        onKeyDown={handleViewportKeyDown}
      >
        {children}
      </div>

      {scrollable ? (
        <div className="scroll-region-scrollbar">
          <div
            ref={trackRef}
            className="scroll-region-track"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              role="slider"
              className={`scroll-region-thumb${dragging ? ' is-dragging' : ''}`}
              tabIndex={0}
              aria-orientation={orientation}
              aria-valuemin={0}
              aria-valuemax={maxScroll}
              aria-valuenow={Math.round(metrics.scrollPos)}
              aria-label={thumbLabel}
              style={thumbStyle}
              onKeyDown={handleThumbKeyDown}
              onPointerDown={handleThumbPointerDown}
              onPointerMove={handleThumbPointerMove}
              onPointerUp={endThumbDrag}
              onPointerCancel={endThumbDrag}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
