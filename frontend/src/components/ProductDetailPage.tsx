import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Ruler,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  X,
  Send,
  AlertTriangle,
  Grid,
  GalleryHorizontal,
  Maximize2,
  PackageCheck,
  Bell,
  Loader2,
} from 'lucide-react';
import { Category, Product, Review } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import { ScrollReveal, AnimatedPrice } from './AnimationSystem';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  categories: Category[];
  reviews: Review[];
  deliveryFeePkr: number;
  isWishlisted: boolean;
  wishlistIds: number[];
  onToggleWishlist: (productId: number) => void;
  onAddToCart: (
    product: Product,
    size: string,
    color: string,
    quantity: number,
    openCheckout?: boolean
  ) => void | Promise<void | boolean>;
  onRequestRestock?: (
    product: Product,
    email: string,
    size: string,
    color: string
  ) => Promise<void>;
  onOpenNotifyModal?: (product: Product) => void;
  onSubmitReview: (
    productId: number,
    name: string,
    city: string,
    rating: number,
    comment: string
  ) => Promise<void>;
  onSelectProduct: (product: Product) => void;
  onBackToCatalog: (categorySlug?: string) => void;
  recentlyViewedProducts?: Product[];
}

const SUPPLEMENTARY_DETAIL_ANGLES: Record<string, string[]> = {
  outerwear: [
    '/banners/desktop-banner-1.jpg',
    '/banners/mobile-banner-1.jpg',
    '/banners/desktop-banner-2.jpg',
    '/banners/mobile-banner-2.jpg',
  ],
  knitwear: [
    '/banners/mobile-banner-2.jpg',
    '/banners/desktop-banner-2.jpg',
    '/banners/desktop-banner-1.jpg',
    '/banners/mobile-banner-1.jpg',
  ],
  'silk-tailoring': [
    '/banners/mobile-banner-1.jpg',
    '/banners/desktop-banner-2.jpg',
    '/banners/mobile-banner-2.jpg',
    '/banners/desktop-banner-1.jpg',
  ],
  'leather-goods': [
    '/banners/desktop-banner-2.jpg',
    '/banners/mobile-banner-1.jpg',
    '/banners/desktop-banner-1.jpg',
    '/banners/mobile-banner-2.jpg',
  ],
  footwear: [
    '/banners/mobile-banner-2.jpg',
    '/banners/mobile-banner-1.jpg',
    '/banners/desktop-banner-1.jpg',
    '/banners/desktop-banner-2.jpg',
  ],
};

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  categories,
  reviews,
  deliveryFeePkr,
  isWishlisted,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onRequestRestock,
  onOpenNotifyModal,
  onSubmitReview,
  onSelectProduct,
  onBackToCatalog,
  recentlyViewedProducts = [],
}) => {
  const allImages = useMemo(() => {
    const rawList: string[] = [];
    if (product.image_url) rawList.push(product.image_url);
    if (Array.isArray(product.gallery_urls)) {
      for (const url of product.gallery_urls) {
        if (url && typeof url === 'string' && !rawList.includes(url.trim())) {
          rawList.push(url.trim());
        }
      }
    }
    const fallbackAngles =
      SUPPLEMENTARY_DETAIL_ANGLES[product.category_slug] || [
        '/banners/desktop-banner-1.jpg',
        '/banners/mobile-banner-1.jpg',
        '/banners/desktop-banner-2.jpg',
        '/banners/mobile-banner-2.jpg',
      ];
    for (const extra of fallbackAngles) {
      if (rawList.length < 4 && !rawList.includes(extra)) {
        rawList.push(extra);
      }
    }
    return rawList;
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [galleryLayout, setGalleryLayout] = useState<'both' | 'carousel' | 'grid'>('both');
  const [magnifierEnabled, setMagnifierEnabled] = useState<boolean>(true);
  const [isHoveringMainImage, setIsHoveringMainImage] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors?.[0]?.name || 'Standard'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState<boolean>(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'care' | 'specs' | 'shipping'>('care');

  // Review form state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Restock Notify Me form state
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySuccessMsg, setNotifySuccessMsg] = useState<string | null>(null);

  // Add to cart & wishlist micro-interaction states
  const [addingToCartState, setAddingToCartState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [buyingNowLoading, setBuyingNowLoading] = useState(false);
  const [wishlistAnimating, setWishlistAnimating] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const firstAvailable =
        product.variants.find((v) => Number(v.stock) > 0) || product.variants[0];
      setSelectedSize(firstAvailable.size || product.sizes?.[0] || 'M');
      setSelectedColor(firstAvailable.color || product.colors?.[0]?.name || 'Standard');
    } else {
      setSelectedSize(product.sizes?.[0] || 'M');
      setSelectedColor(product.colors?.[0]?.name || 'Standard');
    }
    setQuantity(1);
    setLightboxZoom(1);
    setNotifySuccessMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  // Dynamic Product SEO & Open Graph Metadata
  useEffect(() => {
    const prevTitle = document.title;
    const seoTitle = product.seo_title?.trim() || `${product.title} | Foner`;
    const metaDesc =
      product.meta_description?.trim() ||
      product.description?.trim() ||
      `Shop ${product.title} at Foner.`;
    const canonicalSlug = product.slug || String(product.id);
    const canonicalUrl = `${window.location.origin}/products/${canonicalSlug}`;

    document.title = seoTitle;

    const setMetaTag = (selector: string, attrName: 'name' | 'property', attrVal: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', metaDesc);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', seoTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', metaDesc);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    return () => {
      document.title = prevTitle;
    };
  }, [product]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, allImages.length]);

  const categoryObj = categories.find((c) => c.slug === product.category_slug);
  const productReviews = reviews.filter((r) => r.product_id === product.id);

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const selectedVariant = useMemo(() => {
    if (!hasVariants || !product.variants) return null;
    return (
      product.variants.find(
        (v) =>
          v.size.toLowerCase() === selectedSize.toLowerCase() &&
          v.color.toLowerCase() === selectedColor.toLowerCase()
      ) || null
    );
  }, [hasVariants, product.variants, selectedSize, selectedColor]);

  const activePricePkr =
    selectedVariant && selectedVariant.price_pkr && selectedVariant.price_pkr > 0
      ? Number(selectedVariant.price_pkr)
      : Number(product.price_pkr);
  const activeSku = selectedVariant?.sku || product.sku;
  const activeStock = hasVariants
    ? selectedVariant
      ? Number(selectedVariant.stock)
      : 0
    : Number(product.stock);

  const relatedProducts = useMemo(() => {
    // Prioritize: 1) Same subcategory, 2) Same category, 3) Similar/relevant available products
    const candidates = allProducts.filter((p) => p.id !== product.id && Number(p.stock) > 0);
    const fallbackOut = allProducts.filter((p) => p.id !== product.id && Number(p.stock) <= 0);
    const pool = candidates.length >= 4 ? candidates : [...candidates, ...fallbackOut];

    const sameSubcategory = pool.filter(
      (p) =>
        Boolean(product.subcategory_slug) &&
        Boolean(p.subcategory_slug) &&
        p.subcategory_slug === product.subcategory_slug
    );
    const sameCategoryOtherSub = pool.filter(
      (p) =>
        p.category_slug === product.category_slug &&
        !sameSubcategory.some((s) => s.id === p.id)
    );
    const otherCategories = pool.filter(
      (p) =>
        p.category_slug !== product.category_slug &&
        !sameSubcategory.some((s) => s.id === p.id)
    );
    return [...sameSubcategory, ...sameCategoryOtherSub, ...otherCategories].slice(0, 4);
  }, [allProducts, product]);

  const effectiveCompareAt =
    product.compare_at_price_pkr && product.compare_at_price_pkr > activePricePkr
      ? product.compare_at_price_pkr
      : 0;
  const savingsPkr = effectiveCompareAt > 0 ? effectiveCompareAt - activePricePkr : 0;
  const savingsPercent =
    savingsPkr > 0 && effectiveCompareAt > 0
      ? Math.round((savingsPkr / effectiveCompareAt) * 100)
      : 0;

  const stockPercent = Math.min(100, Math.max(0, Math.round((activeStock / 30) * 100)));

  const handleMouseMoveOnImage = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      await onSubmitReview(
        product.id,
        reviewerName.trim(),
        reviewerCity.trim() || 'Pakistan',
        reviewRating,
        reviewComment.trim()
      );
      setReviewerName('');
      setReviewerCity('');
      setReviewComment('');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] text-[#1F181A] pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-[#EFE9DC] border-b border-[#631828]/15">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#66585B]">
            <button
              type="button"
              onClick={() => onBackToCatalog('all')}
              className="inline-flex items-center gap-1.5 font-semibold text-[#631828] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Products</span>
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => onBackToCatalog(product.category_slug)}
              className="hover:text-[#631828] capitalize transition-colors"
            >
              {categoryObj?.name || product.category_slug}
            </button>
            <span>/</span>
            <span className="font-semibold text-[#1F181A] truncate max-w-[260px]">
              {product.title}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] font-mono-code">
            <span className="px-2.5 py-1 rounded-lg bg-[#F7F3EB] border border-[#631828]/20 text-[#631828] font-bold">
              SKU: {activeSku}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-bold ${
                activeStock <= 0
                  ? 'bg-red-900 text-[#F7F3EB]'
                  : activeStock < 5
                  ? 'bg-amber-900/15 text-amber-950 border border-amber-800/30'
                  : 'bg-emerald-900/15 text-emerald-900 border border-emerald-800/25'
              }`}
            >
              {activeStock <= 0
                ? 'Out of Stock'
                : `${activeStock} ${activeStock === 1 ? 'unit' : 'units'} in stock`}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN (7 cols): Multi-Image Carousel + Grid Gallery */}
          <div className="lg:col-span-7 space-y-6">
            {/* Gallery Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGalleryLayout('both')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    galleryLayout === 'both'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                      : 'text-[#66585B] hover:text-[#1F181A]'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>All Views ({allImages.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryLayout('carousel')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    galleryLayout === 'carousel'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                      : 'text-[#66585B] hover:text-[#1F181A]'
                  }`}
                >
                  <GalleryHorizontal className="w-3.5 h-3.5" />
                  <span>Carousel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryLayout('grid')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    galleryLayout === 'grid'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                      : 'text-[#66585B] hover:text-[#1F181A]'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMagnifierEnabled((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  magnifierEnabled
                    ? 'bg-[#F7F3EB] text-[#631828] border-[#631828]/40'
                    : 'bg-transparent text-[#66585B] border-[#631828]/15'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>{magnifierEnabled ? 'Hover Zoom: On' : 'Hover Zoom: Off'}</span>
              </button>
            </div>

            {/* 1. CAROUSEL VIEW */}
            {(galleryLayout === 'both' || galleryLayout === 'carousel') && (
              <div className="space-y-4">
                <div
                  onMouseEnter={() => setIsHoveringMainImage(true)}
                  onMouseLeave={() => setIsHoveringMainImage(false)}
                  onMouseMove={handleMouseMoveOnImage}
                  className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-[#EFE9DC] border border-[#631828]/20 shadow-md group select-none"
                >
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={allImages[activeImageIndex]}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      src={allImages[activeImageIndex]}
                      alt={`${product.title} — Image ${activeImageIndex + 1}`}
                      onClick={() => {
                        setLightboxZoom(1);
                        setLightboxOpen(true);
                      }}
                      style={
                        magnifierEnabled && isHoveringMainImage
                          ? {
                              transformOrigin: `${cursorPosition.x}% ${cursorPosition.y}%`,
                              transform: 'scale(1.85)',
                            }
                          : undefined
                      }
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in transition-transform duration-300 ease-out"
                    />
                  </AnimatePresence>

                  {/* Top Left Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                    {savingsPercent > 0 && (
                      <span className="px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] text-[11px] font-mono-code font-bold uppercase tracking-wider shadow-md">
                        -{savingsPercent}%
                      </span>
                    )}
                    {product.is_new_arrival && (
                      <span className="px-3 py-1 rounded-full bg-[#F7F3EB]/95 text-[#631828] text-[11px] font-bold uppercase tracking-widest shadow-md">
                        New Arrival
                      </span>
                    )}
                  </div>

                  {/* Top Right Counter & Lightbox Trigger */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-[#1F181A]/80 backdrop-blur-md text-[#F7F3EB] font-mono-code text-xs">
                      {activeImageIndex + 1} / {allImages.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxZoom(1.5);
                        setLightboxOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F3EB]/95 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] text-xs font-semibold transition-colors shadow-md"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Expand</span>
                    </button>
                  </div>

                  {/* Carousel Previous / Next Controls */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#F7F3EB]/90 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all shadow-lg"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[#F7F3EB]/90 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all shadow-lg"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Carousel Thumbnail Strip */}
                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                  {allImages.map((imgUrl, idx) => {
                    const isSelected = activeImageIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative aspect-[4/5] rounded-2xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-[#631828] ring-2 ring-[#631828]/30 scale-[1.01] shadow-md'
                            : 'border-[#631828]/15 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.title} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. GRID GALLERY */}
            {(galleryLayout === 'both' || galleryLayout === 'grid') && (
              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between border-b border-[#631828]/15 pb-3">
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Product Gallery
                  </h3>
                  <span className="text-xs text-[#66585B]">Click any image to enlarge</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {allImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setLightboxZoom(1.5);
                        setLightboxOpen(true);
                      }}
                      className={`group relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EFE9DC] border transition-all cursor-zoom-in shadow-xs hover:shadow-lg ${
                        activeImageIndex === idx
                          ? 'border-[#631828] ring-2 ring-[#631828]/20'
                          : 'border-[#631828]/20'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.title} — View ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols): Sticky Purchase Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 shadow-xl space-y-6"
            >
              {/* Category & Rating */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.03 }}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="px-3 py-1 rounded-full bg-[#631828]/10 border border-[#631828]/25 text-[11px] font-bold uppercase tracking-[0.16em] text-[#631828]">
                  {categoryObj?.name || product.category_slug}
                </span>
                {productReviews.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F3EB] border border-[#631828]/15 text-xs">
                    <Star className="w-3.5 h-3.5 fill-[#C5A06E] text-[#C5A06E]" />
                    <span className="font-bold text-[#1F181A]">{product.rating.toFixed(1)}</span>
                    <span className="text-[#66585B]">({productReviews.length})</span>
                  </div>
                )}
              </motion.div>

              {/* Product Name, Price, Discount & Stock */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.06 }}
                className="space-y-4"
              >
                <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A] leading-tight">
                  {product.title}
                </h1>

                {/* Price & Discount */}
                <div className="flex flex-wrap items-baseline gap-3">
                  <AnimatedPrice
                    value={activePricePkr}
                    className="font-mono-code text-3xl font-bold text-[#631828]"
                  />
                  {savingsPkr > 0 && (
                    <>
                      <span className="font-mono-code text-base text-[#66585B] line-through">
                        Rs. {effectiveCompareAt.toLocaleString()}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-xs font-bold">
                        -{savingsPercent}%
                      </span>
                    </>
                  )}
                </div>

                {/* Availability / Stock Bar */}
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1F181A]">
                      <PackageCheck className="w-4 h-4 text-[#631828]" />
                      <span>
                        {hasVariants
                          ? `Variant Availability (${selectedColor} / ${selectedSize})`
                          : 'Availability'}
                      </span>
                    </span>
                    {activeStock <= 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-900 text-[#F7F3EB] font-mono-code text-[11px] font-bold">
                        {hasVariants && !selectedVariant ? 'Variant Unavailable' : 'Out of Stock'}
                      </span>
                    ) : activeStock < 5 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-900/15 text-red-900 border border-red-800/30 font-mono-code text-[11px] font-bold">
                        Low Stock ({activeStock} left)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/15 text-emerald-900 border border-emerald-800/25 font-mono-code text-[11px] font-bold">
                        In Stock ({activeStock} available)
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#E5DCCB] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeStock <= 0
                          ? 'bg-red-900 w-0'
                          : activeStock < 5
                          ? 'bg-red-700'
                          : 'bg-emerald-800'
                      }`}
                      style={{ width: `${activeStock <= 0 ? 0 : Math.max(12, stockPercent)}%` }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="text-sm text-[#1F181A]/90 leading-relaxed"
              >
                {product.description}
              </motion.p>

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.15em] text-[#66585B] font-semibold mb-2">
                    Color: <span className="text-[#1F181A] font-bold">{selectedColor}</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {product.colors.map((c) => {
                      const active = selectedColor === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSelectedColor(c.name)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            active
                              ? 'border-[#631828] bg-[#F7F3EB] text-[#1F181A] shadow-sm ring-1 ring-[#631828]'
                              : 'border-[#631828]/15 bg-[#F7F3EB]/60 text-[#66585B] hover:border-[#631828]/40'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          {active && <Check className="w-3.5 h-3.5 text-[#631828]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs uppercase tracking-[0.15em] text-[#66585B] font-semibold">
                      Size: <span className="text-[#1F181A] font-bold">{selectedSize}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#631828] hover:underline"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>{sizeGuideOpen ? 'Hide Size Guide' : 'Size Guide'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const active = selectedSize === size;
                      const variantForSize = hasVariants
                        ? product.variants?.find(
                            (v) =>
                              v.size.toLowerCase() === size.toLowerCase() &&
                              v.color.toLowerCase() === selectedColor.toLowerCase()
                          )
                        : null;
                      const sizeOut = hasVariants && (!variantForSize || variantForSize.stock <= 0);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[50px] px-4 py-2.5 rounded-xl font-mono-code text-xs font-bold border transition-all ${
                            active
                              ? 'bg-[#631828] text-[#F7F3EB] border-[#631828] shadow-sm'
                              : sizeOut
                              ? 'bg-[#F7F3EB]/50 text-[#66585B]/70 border-[#631828]/10 line-through'
                              : 'bg-[#F7F3EB] text-[#1F181A] border-[#631828]/20 hover:border-[#631828]'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  {hasVariants && product.variants && product.variants.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-[#F7F3EB] border border-[#631828]/15">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#631828] mb-2">
                        Available Variants & Stock
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {product.variants.map((v, idx) => {
                          const isSelected =
                            v.size.toLowerCase() === selectedSize.toLowerCase() &&
                            v.color.toLowerCase() === selectedColor.toLowerCase();
                          return (
                            <button
                              key={v.sku || idx}
                              type="button"
                              onClick={() => {
                                setSelectedColor(v.color);
                                setSelectedSize(v.size);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-code border transition-all ${
                                isSelected
                                  ? 'bg-[#631828] text-[#F7F3EB] border-[#631828] font-bold'
                                  : v.stock <= 0
                                  ? 'bg-[#EFE9DC]/60 text-[#66585B] border-[#631828]/10 opacity-60'
                                  : 'bg-[#EFE9DC] text-[#1F181A] border-[#631828]/20 hover:border-[#631828]'
                              }`}
                            >
                              {v.color} / {v.size} → {v.stock > 0 ? `${v.stock} in stock` : 'Out'}
                              {v.price_pkr && Number(v.price_pkr) !== Number(product.price_pkr)
                                ? ` (Rs. ${Number(v.price_pkr).toLocaleString()})`
                                : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sizeGuideOpen && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 text-xs space-y-2">
                      <p className="font-bold text-[#631828] uppercase tracking-wider text-[11px]">
                        Size Guide (Inches)
                      </p>
                      <div className="grid grid-cols-4 gap-2 font-mono-code text-[11px] border-t border-[#631828]/15 pt-2">
                        <span className="font-bold">Size</span>
                        <span className="font-bold">Chest</span>
                        <span className="font-bold">Shoulder</span>
                        <span className="font-bold">Length</span>
                        <span>XS / S</span>
                        <span>36–38&quot;</span>
                        <span>16.5&quot;</span>
                        <span>27.5&quot;</span>
                        <span>M</span>
                        <span>39–41&quot;</span>
                        <span>17.5&quot;</span>
                        <span>28.5&quot;</span>
                        <span>L / XL</span>
                        <span>42–45&quot;</span>
                        <span>18.5&quot;</span>
                        <span>29.5&quot;</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Low Stock Notice */}
              {activeStock > 0 && activeStock < 5 && (
                <div className="p-3 rounded-xl bg-amber-900/15 border border-amber-800/30 flex items-center gap-2 text-xs text-amber-950 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Only {activeStock} left in stock for this selection.</span>
                </div>
              )}

              {/* Quantity & Primary Purchase CTAs OR Out-of-Stock 'Notify Me' */}
              {activeStock <= 0 ? (
                <div className="p-5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/30 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#631828]">
                      <Bell className="w-4 h-4 text-[#631828]" />
                      <span>Out of Stock</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isWishlisted
                          ? 'bg-[#631828] border-[#631828] text-[#F7F3EB]'
                          : 'bg-[#EFE9DC] border-[#631828]/25 text-[#1F181A] hover:border-[#631828]'
                      }`}
                      title="Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-xs text-[#66585B] leading-relaxed">
                    Enter your email to receive a notification when this item is back in stock.
                  </p>

                  {notifySuccessMsg ? (
                    <div className="p-3.5 rounded-xl bg-emerald-900/15 border border-emerald-800/30 flex items-center gap-2.5 text-xs font-semibold text-emerald-950">
                      <Check className="w-4 h-4 text-emerald-800 shrink-0" />
                      <span>{notifySuccessMsg}</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!notifyEmail.trim() || !onRequestRestock) return;
                        setNotifySubmitting(true);
                        try {
                          await onRequestRestock(
                            product,
                            notifyEmail.trim(),
                            selectedSize,
                            selectedColor
                          );
                          setNotifySuccessMsg(
                            `We will notify ${notifyEmail.trim()} when this item is restocked.`
                          );
                          setNotifyEmail('');
                        } finally {
                          setNotifySubmitting(false);
                        }
                      }}
                      className="flex flex-col sm:flex-row gap-2.5"
                    >
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="flex-1 px-4 py-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 text-xs text-[#1F181A] placeholder-[#66585B] focus:outline-none focus:border-[#631828]"
                      />
                      <button
                        type="submit"
                        disabled={notifySubmitting}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-md whitespace-nowrap"
                      >
                        <Bell className="w-3.5 h-3.5 text-[#C5A06E]" />
                        <span>{notifySubmitting ? 'Saving...' : 'Notify Me'}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-xl bg-[#F7F3EB] border border-[#631828]/25 p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-lg text-sm font-bold text-[#1F181A] hover:bg-[#EFE9DC]"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-mono-code text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(Math.max(1, activeStock || 1), q + 1))
                        }
                        className="w-10 h-10 rounded-lg text-sm font-bold text-[#1F181A] hover:bg-[#EFE9DC]"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={addingToCartState === 'loading'}
                      onClick={async () => {
                        setAddingToCartState('loading');
                        try {
                          const res = await onAddToCart(
                            {
                              ...product,
                              price_pkr: activePricePkr,
                              sku: activeSku,
                              stock: activeStock,
                            },
                            selectedSize,
                            selectedColor,
                            Math.min(quantity, Math.max(1, activeStock)),
                            false
                          );
                          if (res !== false) {
                            setAddingToCartState('success');
                            setTimeout(() => setAddingToCartState('idle'), 1400);
                          } else {
                            setAddingToCartState('idle');
                          }
                        } catch {
                          setAddingToCartState('idle');
                        }
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl text-xs font-bold tracking-[0.16em] uppercase transition-all shadow-lg ${
                        addingToCartState === 'success'
                          ? 'bg-emerald-800 text-[#F7F3EB]'
                          : 'bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB]'
                      }`}
                    >
                      {addingToCartState === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#C5A06E]" />
                          <span>Adding...</span>
                        </>
                      ) : addingToCartState === 'success' ? (
                        <>
                          <Check className="w-4 h-4 text-[#F7F3EB]" />
                          <span>Added to Bag</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 text-[#C5A06E]" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWishlistAnimating(true);
                        setTimeout(() => setWishlistAnimating(false), 380);
                        onToggleWishlist(product.id);
                      }}
                      className={`p-4 rounded-xl border transition-all ${
                        isWishlisted
                          ? 'bg-[#631828] border-[#631828] text-[#F7F3EB]'
                          : 'bg-[#F7F3EB] border-[#631828]/25 text-[#1F181A] hover:border-[#631828]'
                      }`}
                      title="Wishlist"
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform ${
                          isWishlisted ? 'fill-current' : ''
                        } ${wishlistAnimating ? 'foner-heart-pop' : ''}`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={buyingNowLoading}
                    onClick={async () => {
                      setBuyingNowLoading(true);
                      try {
                        await onAddToCart(
                          {
                            ...product,
                            price_pkr: activePricePkr,
                            sku: activeSku,
                            stock: activeStock,
                          },
                          selectedSize,
                          selectedColor,
                          Math.min(quantity, Math.max(1, activeStock)),
                          true
                        );
                      } finally {
                        setBuyingNowLoading(false);
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#1F181A] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold tracking-[0.16em] uppercase transition-all"
                  >
                    {buyingNowLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C5A06E]" />
                        <span>Opening Checkout...</span>
                      </>
                    ) : (
                      <span>Buy Now</span>
                    )}
                  </button>
                </div>
              )}

              {/* Relevant Specifications & Care */}
              <div className="pt-4 border-t border-[#631828]/15">
                <div className="flex items-center gap-5 border-b border-[#631828]/15 pb-2.5 text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab('care')}
                    className={activeInfoTab === 'care' ? 'text-[#631828]' : 'text-[#66585B]'}
                  >
                    Materials &amp; Care
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab('specs')}
                    className={activeInfoTab === 'specs' ? 'text-[#631828]' : 'text-[#66585B]'}
                  >
                    Specifications
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInfoTab('shipping')}
                    className={activeInfoTab === 'shipping' ? 'text-[#631828]' : 'text-[#66585B]'}
                  >
                    Shipping &amp; Returns
                  </button>
                </div>

                <div className="mt-3 text-xs text-[#66585B] leading-relaxed">
                  {activeInfoTab === 'care' && <p>{product.fabric_care}</p>}
                  {activeInfoTab === 'specs' && (
                    <ul className="space-y-1.5">
                      <li className="flex justify-between">
                        <span>SKU</span>
                        <strong className="font-mono-code text-[#1F181A]">{product.sku}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Category</span>
                        <strong className="text-[#1F181A]">{categoryObj?.name || product.category_slug}</strong>
                      </li>
                      <li className="flex justify-between">
                        <span>Sizes</span>
                        <strong className="font-mono-code text-[#1F181A]">{product.sizes.join(', ')}</strong>
                      </li>
                    </ul>
                  )}
                  {activeInfoTab === 'shipping' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[#1F181A]">
                        <Truck className="w-3.5 h-3.5 text-[#631828] shrink-0" />
                        <span>Nationwide delivery across Pakistan — Rs. {deliveryFeePkr} flat rate.</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#1F181A]">
                        <RefreshCw className="w-3.5 h-3.5 text-[#631828] shrink-0" />
                        <span>14-day size exchange or return on unworn items.</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#1F181A]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#631828] shrink-0" />
                        <span>Cash on Delivery, JazzCash, EasyPaisa, and Card accepted.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-16">
        <div className="rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
              Customer Reviews ({productReviews.length})
            </h3>

            {productReviews.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 text-xs text-[#66585B]">
                No reviews for this product yet.
              </div>
            ) : (
              <div className="space-y-3">
                {productReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#1F181A]">
                        {rev.customer_name}{' '}
                        {rev.customer_city && (
                          <span className="text-[#66585B] font-normal text-xs">({rev.customer_city})</span>
                        )}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="w-3.5 h-3.5 fill-[#C5A06E] text-[#C5A06E]"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#66585B] leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <form
              onSubmit={handleReviewSubmit}
              className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-3"
            >
              <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                Write a Review
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={reviewerCity}
                  onChange={(e) => setReviewerCity(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                  Rating
                </label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Share your feedback on fit and quality"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingReview ? 'Saving...' : 'Post Review'}</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-16">
          <div className="flex items-end justify-between mb-6">
            <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
              Related Products
            </h3>
            <button
              type="button"
              onClick={() => onBackToCatalog('all')}
              className="text-xs font-semibold text-[#631828] hover:underline"
            >
              View All Products
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((rel, relIdx) => {
              const relWishlisted = wishlistIds.includes(rel.id);
              const relCompareAt =
                rel.compare_at_price_pkr && rel.compare_at_price_pkr > rel.price_pkr
                  ? rel.compare_at_price_pkr
                  : 0;
              const relDiscountPercent =
                relCompareAt > rel.price_pkr
                  ? Math.round(((relCompareAt - rel.price_pkr) / relCompareAt) * 100)
                  : 0;

              return (
                <ScrollReveal key={rel.id} staggerIndex={relIdx}>
                  <div
                    onClick={() => onSelectProduct(rel)}
                    className="group foner-card-lift h-full rounded-2xl sm:rounded-3xl bg-[#EFE9DC] border border-[#631828]/15 hover:border-[#631828]/45 overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl"
                  >
                    <div>
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#E5DCCB]">
                        <img
                          src={resolveImageUrl(rel.image_url)}
                          alt={rel.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5">
                          {relDiscountPercent > 0 && (
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow">
                              -{relDiscountPercent}%
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(rel.id);
                          }}
                          className={`absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2.5 rounded-full backdrop-blur-md transition-all shadow ${
                            relWishlisted
                              ? 'bg-[#631828] text-[#F7F3EB] scale-105'
                              : 'bg-[#F7F3EB]/90 text-[#1F181A] hover:bg-[#631828] hover:text-[#F7F3EB] hover:scale-105'
                          }`}
                          aria-label="Toggle wishlist"
                        >
                          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${relWishlisted ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono-code">
                          <span
                            className={`font-bold ${
                              rel.stock <= 0
                                ? 'text-red-900'
                                : rel.stock < 5
                                ? 'text-amber-900'
                                : 'text-emerald-900'
                            }`}
                          >
                            {rel.stock <= 0
                              ? 'Out of Stock'
                              : rel.stock < 5
                              ? `Low Stock (${rel.stock} left)`
                              : `${rel.stock} in stock`}
                          </span>
                        </div>
                        <h4 className="font-serif-editorial text-sm sm:text-xl font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors truncate mt-1">
                          {rel.title}
                        </h4>
                      </div>
                    </div>
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-[#631828]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                      <div>
                        <span className="font-mono-code text-xs sm:text-sm font-bold text-[#631828] block">
                          Rs. {rel.price_pkr.toLocaleString()}
                        </span>
                        {relCompareAt > 0 && (
                          <span className="font-mono-code text-[10px] text-[#66585B] line-through block">
                            Rs. {relCompareAt.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {rel.stock <= 0 && onOpenNotifyModal ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNotifyModal(rel);
                          }}
                          className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-[11px] sm:text-xs font-semibold hover:bg-[#430F1B] transition-colors whitespace-nowrap w-full sm:w-auto"
                        >
                          <Bell className="w-3.5 h-3.5 text-[#C5A06E]" />
                          <span>Notify Me</span>
                        </button>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-semibold text-[#631828] group-hover:translate-x-0.5 transition-transform">
                          View Product →
                        </span>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.filter((rv) => rv.id !== product.id).length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#631828] block mb-1">
                Browsing History
              </span>
              <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                Recently Viewed
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {recentlyViewedProducts
              .filter((rv) => rv.id !== product.id)
              .slice(0, 4)
              .map((rv, rvIdx) => (
                <ScrollReveal key={rv.id} staggerIndex={rvIdx}>
                  <div
                    onClick={() => onSelectProduct(rv)}
                    className="group foner-card-lift h-full rounded-2xl sm:rounded-3xl bg-[#EFE9DC] border border-[#631828]/15 hover:border-[#631828]/45 overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl"
                  >
                    <div>
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#E5DCCB]">
                        <img
                          src={resolveImageUrl(rv.image_url)}
                          alt={rv.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <span className="text-[10px] font-mono-code text-[#66585B] uppercase">
                          {rv.sku}
                        </span>
                        <h4 className="font-serif-editorial text-sm sm:text-xl font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors truncate mt-0.5">
                          {rv.title}
                        </h4>
                      </div>
                    </div>
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-[#631828]/10 flex items-center justify-between">
                      <span className="font-mono-code text-xs sm:text-sm font-bold text-[#631828]">
                        Rs. {rv.price_pkr.toLocaleString()}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#631828] group-hover:translate-x-0.5 transition-transform">
                        View Product →
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
          </div>
        </section>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 bg-[#1F181A]/95 backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 max-w-6xl w-full mx-auto z-20">
              <div className="text-[#F7F3EB]">
                <span className="text-[10px] font-mono-code uppercase tracking-widest text-[#C5A06E] block">
                  Image {activeImageIndex + 1} of {allImages.length}
                </span>
                <h4 className="font-serif-editorial text-xl sm:text-2xl font-bold">
                  {product.title}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.max(1, Number((z - 0.5).toFixed(2))))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#F7F3EB]/15 hover:bg-[#F7F3EB]/25 text-[#F7F3EB] text-xs font-mono-code transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-xs font-bold">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((z) => Math.min(3, Number((z + 0.5).toFixed(2))))}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#F7F3EB]/15 hover:bg-[#F7F3EB]/25 text-[#F7F3EB] text-xs font-mono-code transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="ml-2 p-2.5 rounded-full bg-[#F7F3EB] text-[#1F181A] hover:bg-[#631828] hover:text-[#F7F3EB] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
                  }
                  className="absolute left-2 sm:left-6 z-20 p-3.5 rounded-full bg-[#F7F3EB]/90 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] transition-colors shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <div className="overflow-auto max-h-[72vh] max-w-[90vw] flex items-center justify-center rounded-2xl">
                <img
                  src={allImages[activeImageIndex]}
                  alt={product.title}
                  onClick={() => setLightboxZoom((z) => (z >= 2.5 ? 1 : Number((z + 0.75).toFixed(2))))}
                  style={{ transform: `scale(${lightboxZoom})` }}
                  className="max-h-[70vh] w-auto rounded-2xl object-contain border border-[#C5A06E]/30 shadow-2xl transition-transform duration-200 cursor-zoom-in"
                />
              </div>

              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-2 sm:right-6 z-20 p-3.5 rounded-full bg-[#F7F3EB]/90 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] transition-colors shadow-xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 z-20">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === i
                      ? 'border-[#C5A06E] scale-105 shadow-lg'
                      : 'border-transparent opacity-55 hover:opacity-90'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
