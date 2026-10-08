import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  Ruler,
  Check,
  Send,
  Bell,
} from 'lucide-react';
import { Product, Review } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenFullPage?: (product: Product) => void;
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
  isWishlisted: boolean;
  onToggleWishlist: (productId: number) => void;
  deliveryFeePkr: number;
  reviews: Review[];
  onSubmitReview: (
    productId: number,
    name: string,
    city: string,
    rating: number,
    comment: string
  ) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onOpenFullPage,
  onAddToCart,
  onRequestRestock,
  isWishlisted,
  onToggleWishlist,
  deliveryFeePkr,
  reviews,
  onSubmitReview,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string>('');
  const [sizeGuideOpen, setSizeGuideOpen] = useState<boolean>(false);

  // Review form state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Restock Notify Me form state
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || 'M');
      setSelectedColor(product.colors?.[0]?.name || 'Standard');
      setQuantity(1);
      setActiveImage(resolveImageUrl(product.image_url));
      setSizeGuideOpen(false);
      setNotifySuccess(false);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const allImages = Array.from(new Set([product.image_url, ...(product.gallery_urls || [])].filter(Boolean))).map((img) => resolveImageUrl(img));
  const productReviews = reviews.filter((r) => r.product_id === product.id);
  const compareAt =
    product.compare_at_price_pkr && product.compare_at_price_pkr > product.price_pkr
      ? product.compare_at_price_pkr
      : 0;
  const savingsPkr = compareAt > 0 ? compareAt - product.price_pkr : 0;
  const discountPercent =
    savingsPkr > 0 && compareAt > 0 ? Math.round((savingsPkr / compareAt) * 100) : 0;

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-5xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col lg:flex-row"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-[#F7F3EB]/90 hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-colors shadow-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Product Gallery */}
          <div className="lg:w-1/2 bg-[#EFE9DC] p-4 sm:p-6 flex flex-col justify-between">
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-[#E5DCCB] border border-[#631828]/15">
              <AnimatePresence initial={false}>
                <motion.img
                  key={activeImage || product.image_url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  src={resolveImageUrl(activeImage || product.image_url)}
                  alt={product.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                {discountPercent > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] text-[10px] font-mono-code font-bold uppercase tracking-widest">
                    -{discountPercent}%
                  </span>
                )}
                {product.is_new_arrival && (
                  <span className="px-3 py-1 rounded-full bg-[#F7F3EB]/95 text-[#631828] text-[10px] font-bold uppercase tracking-widest">
                    New Arrival
                  </span>
                )}
              </div>
            </div>

            {allImages.length > 1 && (
              <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === img
                        ? 'border-[#631828] scale-105 shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details & Purchase */}
          <div className="lg:w-1/2 p-6 sm:p-8 overflow-y-auto space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-[#66585B] font-mono-code">
                <span>SKU: {product.sku}</span>
                {productReviews.length > 0 && (
                  <div className="flex items-center gap-1 text-[#631828]">
                    <Star className="w-4 h-4 fill-[#C5A06E] text-[#C5A06E]" />
                    <span className="font-semibold">{product.rating.toFixed(1)}</span>
                    <span className="text-[#66585B]">({productReviews.length})</span>
                  </div>
                )}
              </div>

              <h2 className="mt-2 font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A] leading-tight">
                {product.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="font-mono-code text-2xl sm:text-3xl font-bold text-[#631828]">
                  Rs. {product.price_pkr.toLocaleString()}
                </span>
                {savingsPkr > 0 && (
                  <>
                    <span className="font-mono-code text-sm text-[#66585B] line-through">
                      Rs. {compareAt.toLocaleString()}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#631828]/10 text-[#631828] text-xs font-mono-code font-semibold">
                      -{discountPercent}%
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-[#1F181A]/85 leading-relaxed">{product.description}</p>

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="block text-xs uppercase tracking-[0.15em] text-[#66585B] font-semibold mb-2">
                  Color: <span className="text-[#1F181A]">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {product.colors.map((c) => {
                    const active = selectedColor === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? 'border-[#631828] bg-[#EFE9DC] text-[#1F181A] shadow-xs'
                            : 'border-[#631828]/15 bg-transparent text-[#66585B] hover:border-[#631828]/40'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20"
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
                    Size: <span className="text-[#1F181A]">{selectedSize}</span>
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
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[48px] px-3.5 py-2 rounded-xl font-mono-code text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-[#631828] text-[#F7F3EB] border-[#631828] shadow-xs'
                            : 'bg-[#EFE9DC]/60 text-[#1F181A] border-[#631828]/20 hover:border-[#631828]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                {sizeGuideOpen && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/15 text-xs space-y-1.5">
                    <p className="font-semibold text-[#631828]">Size Guide (Inches)</p>
                    <div className="grid grid-cols-4 gap-2 font-mono-code text-[11px] text-[#1F181A]/80 pt-1">
                      <span className="font-bold">Size</span>
                      <span className="font-bold">Chest</span>
                      <span className="font-bold">Shoulder</span>
                      <span className="font-bold">Length</span>
                      <span>XS / S</span>
                      <span>36-38&quot;</span>
                      <span>16.5&quot;</span>
                      <span>27.5&quot;</span>
                      <span>M</span>
                      <span>39-41&quot;</span>
                      <span>17.5&quot;</span>
                      <span>28.5&quot;</span>
                      <span>L / XL</span>
                      <span>42-45&quot;</span>
                      <span>18.5&quot;</span>
                      <span>29.5&quot;</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity & Actions OR Out-of-Stock Notify Me */}
            {product.stock <= 0 ? (
              <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#631828]">
                    <Bell className="w-4 h-4 text-[#631828]" />
                    <span>Out of Stock</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isWishlisted
                        ? 'bg-[#631828] border-[#631828] text-[#F7F3EB]'
                        : 'bg-[#F7F3EB] border-[#631828]/25 text-[#1F181A]'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-[#66585B]">
                  Enter your email to be notified when this item is back in stock.
                </p>
                {notifySuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-900/15 border border-emerald-800/30 text-xs font-semibold text-emerald-950 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>You will be notified when this item is restocked.</span>
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
                        setNotifySuccess(true);
                        setNotifyEmail('');
                      } finally {
                        setNotifySubmitting(false);
                      }
                    }}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="email"
                      required
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={notifySubmitting}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider"
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
                  <div className="inline-flex items-center rounded-xl bg-[#EFE9DC] border border-[#631828]/20 p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg text-sm font-bold text-[#1F181A] hover:bg-[#E5DCCB]"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-mono-code text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(Math.max(1, product.stock || 1), q + 1))
                      }
                      className="w-9 h-9 rounded-lg text-sm font-bold text-[#1F181A] hover:bg-[#E5DCCB]"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(product, selectedSize, selectedColor, quantity, false);
                      onClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold tracking-[0.16em] uppercase transition-all shadow-md"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C5A06E]" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isWishlisted
                        ? 'bg-[#631828] border-[#631828] text-[#F7F3EB]'
                        : 'bg-[#EFE9DC] border-[#631828]/20 text-[#1F181A] hover:border-[#631828]'
                    }`}
                    title="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, selectedSize, selectedColor, quantity, true);
                    onClose();
                  }}
                  className="w-full py-3 px-6 rounded-xl bg-[#1F181A] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold tracking-[0.16em] uppercase transition-colors"
                >
                  Buy Now
                </button>
              </div>
            )}

            {onOpenFullPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPage(product);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#EFE9DC] hover:bg-[#E5DCCB] text-[#631828] border border-[#631828]/25 text-xs font-bold tracking-[0.14em] uppercase transition-colors"
              >
                View Product
              </button>
            )}

            {/* Fabric & Care + Delivery Summary */}
            <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-2.5 text-xs">
              <div>
                <span className="font-semibold text-[#631828] uppercase tracking-wider text-[11px] block">
                  Materials &amp; Care
                </span>
                <p className="text-[#66585B] mt-0.5">{product.fabric_care}</p>
              </div>
              <div className="pt-2 border-t border-[#631828]/10 flex flex-wrap items-center justify-between gap-2 text-[#1F181A]/85">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#631828]" />
                  Shipping: Rs. {deliveryFeePkr}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#631828]" />
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Customer Reviews */}
            <div className="pt-2 border-t border-[#631828]/15 space-y-3">
              <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A]">
                Customer Reviews ({productReviews.length})
              </h4>

              {productReviews.length > 0 && (
                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {productReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-[#EFE9DC]/70 border border-[#631828]/10 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1F181A]">
                          {rev.customer_name}{' '}
                          {rev.customer_city && (
                            <span className="text-[#66585B] font-normal">({rev.customer_city})</span>
                          )}
                        </span>
                        <div className="flex items-center gap-0.5 text-[#C5A06E]">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-[#C5A06E]" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-[#66585B]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={reviewerCity}
                    onChange={(e) => setReviewerCity(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="px-2 py-2 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Share your feedback..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
