import React, { useEffect, useRef, useState } from 'react';

/**
 * Hook that detects whether the user has requested reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  return reduced;
}

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in milliseconds before reveal starts */
  delay?: number;
  /** Index in a list to automatically stagger by 45ms per item (capped at 280ms) */
  staggerIndex?: number;
  /** Direction of subtle entrance movement */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels (default 16px) */
  distance?: number;
  as?: React.ElementType;
}

/**
 * Reusable IntersectionObserver scroll-reveal wrapper.
 * Uses GPU-friendly transform & opacity transitions and respects prefers-reduced-motion.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  staggerIndex = 0,
  direction = 'up',
  distance = 16,
  as: Component = 'div',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    // Check if already in viewport synchronously on mount
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 40 && rect.bottom > -40) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.06,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    observer.observe(node);

    // Safety fallback so content is never permanently hidden if layout shifts
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1400);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [prefersReducedMotion]);

  const totalDelayMs = Math.min(320, delay + Math.min(staggerIndex, 6) * 45);

  const getInitialTransform = () => {
    if (prefersReducedMotion || isVisible) return 'translate3d(0, 0, 0)';
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}px, 0)`;
      case 'down':
        return `translate3d(0, -${distance}px, 0)`;
      case 'left':
        return `translate3d(${distance}px, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return 'translate3d(0, 0, 0)';
    }
  };

  const style: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        opacity: isVisible ? 1 : 0,
        transform: getInitialTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: '440ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        transitionDelay: `${totalDelayMs}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
      };

  const Tag = Component as any;
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
};

interface PageTransitionProps {
  routeKey: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Non-blocking route transition wrapper for all customer-facing pages.
 * Animates entrance in 220ms without delaying click handlers or navigation.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  routeKey,
  children,
  className = '',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [entered, setEntered] = useState<boolean>(true);
  const prevKeyRef = useRef<string>(routeKey);

  useEffect(() => {
    if (prefersReducedMotion) {
      setEntered(true);
      return;
    }
    if (prevKeyRef.current !== routeKey) {
      prevKeyRef.current = routeKey;
      setEntered(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEntered(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [routeKey, prefersReducedMotion]);

  return (
    <div
      className={className}
      style={
        prefersReducedMotion
          ? undefined
          : {
              opacity: entered ? 1 : 0.01,
              transform: entered ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
              transition:
                'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }
      }
    >
      {children}
    </div>
  );
};

interface AnimatedPriceProps {
  value: number;
  prefix?: string;
  className?: string;
}

/**
 * Smoothly highlights numerical price/subtotal/total changes without distracting bounce.
 */
export const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  value,
  prefix = 'Rs. ',
  className = '',
}) => {
  const [updating, setUpdating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setUpdating(true);
      const timer = setTimeout(() => setUpdating(false), 220);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={`inline-block tabular-nums transition-all duration-200 ${
        updating ? 'opacity-80 scale-[1.02]' : 'opacity-100 scale-100'
      } ${className}`}
    >
      {prefix}
      {Number(value || 0).toLocaleString()}
    </span>
  );
};

/**
 * Dimension-matched Product Card Skeleton Loader that prevents layout shift.
 */
export const ProductCardSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl sm:rounded-3xl bg-[#EFE9DC] border border-[#631828]/15 overflow-hidden flex flex-col justify-between shadow-xs"
        >
          <div>
            <div className="aspect-[4/5] w-full foner-skeleton" />
            <div className="p-3 sm:p-5 space-y-2 sm:space-y-2.5">
              <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded-full foner-skeleton" />
              <div className="h-4 sm:h-5 w-3/4 rounded-lg foner-skeleton" />
            </div>
          </div>
          <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 sm:pt-3 border-t border-[#631828]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5">
              <div className="h-4 sm:h-5 w-20 sm:w-24 rounded-lg foner-skeleton" />
              <div className="h-2.5 sm:h-3 w-12 sm:w-16 rounded foner-skeleton" />
            </div>
            <div className="h-7 sm:h-9 w-full sm:w-28 rounded-xl foner-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
};
