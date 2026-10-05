import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Banner } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';

interface HeroBannerCarouselProps {
  banners: Banner[];
  deliveryFeePkr?: number;
  onExploreCategory: (categorySlug: string) => void;
}

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({
  banners,
  onExploreCategory,
}) => {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setViewportMode(window.innerWidth < 768 ? 'mobile' : 'desktop');
    };
    checkViewport();
    window.addEventListener('resize', checkViewport, { passive: true });
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const visibleBanners = banners
    .filter((b) => {
      if (!b.is_active) return false;
      const target = b.device_target || 'both';
      if (viewportMode === 'mobile') {
        return target === 'both' || target === 'mobile';
      }
      return target === 'both' || target === 'desktop';
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    if (currentIndex >= visibleBanners.length) {
      setCurrentIndex(0);
    }
  }, [visibleBanners.length, currentIndex]);

  useEffect(() => {
    if (visibleBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [visibleBanners.length, isPaused]);

  if (visibleBanners.length === 0) return null;

  const activeBanner = visibleBanners[currentIndex] || visibleBanners[0];
  const overlayOpacity = Math.min(80, Math.max(25, activeBanner.overlay_opacity ?? 45)) / 100;

  return (
    <section
      className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative rounded-3xl overflow-hidden border border-[#631828]/25 shadow-xl bg-[#1F181A]">
        {/* Responsive Aspect Ratio Container */}
        <div className="relative h-[420px] sm:h-[480px] lg:h-[540px] w-full bg-[#1F181A]">
          <AnimatePresence initial={false}>
            <motion.div
              key={`${activeBanner.id}-${viewportMode}`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-[#1F181A]"
            >
              {/* Desktop Image */}
              <img
                src={resolveImageUrl(activeBanner.desktop_image_url)}
                alt={activeBanner.title}
                className="hidden md:block w-full h-full object-cover object-center select-none"
              />
              {/* Mobile Image */}
              <img
                src={resolveImageUrl(activeBanner.mobile_image_url || activeBanner.desktop_image_url)}
                alt={activeBanner.title}
                className="block md:hidden w-full h-full object-cover object-center select-none"
              />

              {/* Subtle Gradient Overlay for Text Legibility */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#1F181A] via-[#1F181A]/65 to-transparent"
                style={{ opacity: Math.min(0.92, overlayOpacity + 0.3) }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Content Overlay with Staggered Reveal */}
          <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${activeBanner.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 sm:space-y-5"
              >
                {/* Stagger 1: Badge */}
                {activeBanner.badge_text && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#631828]/90 border border-[#C5A06E]/40 text-[#F7F3EB]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A06E]" />
                    <span className="font-mono-code text-[11px] uppercase tracking-[0.2em] font-semibold">
                      {activeBanner.badge_text}
                    </span>
                  </motion.div>
                )}

                {/* Stagger 2: Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F7F3EB] leading-[1.06] tracking-tight"
                >
                  {activeBanner.title}
                </motion.h1>

                {/* Stagger 3: Subtitle */}
                {activeBanner.subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="text-sm sm:text-base text-[#E5DCCB]/90 max-w-lg leading-relaxed"
                  >
                    {activeBanner.subtitle}
                  </motion.p>
                )}

                {/* Stagger 4: CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="pt-1"
                >
                  <button
                    type="button"
                    onClick={() => onExploreCategory(activeBanner.cta_link || 'all')}
                    className="foner-btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] border border-[#C5A06E]/40 text-xs font-semibold tracking-[0.16em] uppercase transition-all shadow-lg group"
                  >
                    <span>{activeBanner.cta_text || 'Shop Now'}</span>
                    <ArrowRight className="w-4 h-4 text-[#C5A06E] transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide Navigation Controls */}
          {visibleBanners.length > 1 && (
            <div className="absolute bottom-5 right-6 sm:right-10 z-20 flex items-center gap-3">
              <div className="flex items-center gap-1.5 mr-1">
                {visibleBanners.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? 'w-7 bg-[#C5A06E]'
                        : 'w-2 bg-[#F7F3EB]/40 hover:bg-[#F7F3EB]/70'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentIndex(
                    (prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length
                  )
                }
                className="p-2 rounded-full bg-[#1F181A]/75 hover:bg-[#631828] text-[#F7F3EB] border border-[#F7F3EB]/20 transition-all hover:scale-105"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % visibleBanners.length)}
                className="p-2 rounded-full bg-[#1F181A]/75 hover:bg-[#631828] text-[#F7F3EB] border border-[#F7F3EB]/20 transition-all hover:scale-105"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
