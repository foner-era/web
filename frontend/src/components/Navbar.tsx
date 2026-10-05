import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Search,
  Heart,
  Menu,
  X,
  User as UserIcon,
  Shield,
  LogOut,
} from 'lucide-react';
import { Category, Product, StoreSettings, User } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';

interface NavbarProps {
  settings: StoreSettings;
  categories: Category[];
  activeView:
    | 'home'
    | 'products'
    | 'categories'
    | 'admin'
    | 'faq'
    | 'contact'
    | 'shipping-returns'
    | 'track-orders'
    | 'about'
    | 'not-found';
  onNavigateView: (view: 'home' | 'products' | 'categories' | 'admin') => void;
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenOrderHistory: (tab?: 'orders' | 'track' | 'profile') => void;
  onOpenTrackModal: () => void;
  currentUser: User | null;
  onCustomerLogout?: () => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeView,
  onNavigateView,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenOrderHistory,
  currentUser,
  onCustomerLogout,
  products = [],
  onSelectProduct,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartPop, setCartPop] = useState(false);
  const [wishlistPop, setWishlistPop] = useState(false);
  const prevCartCount = useRef(cartCount);
  const prevWishlistCount = useRef(wishlistCount);

  // Scrolled state listener (passive for 60fps performance)
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 14;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cart badge update micro-animation
  useEffect(() => {
    if (prevCartCount.current !== cartCount) {
      prevCartCount.current = cartCount;
      setCartPop(true);
      const t = setTimeout(() => setCartPop(false), 300);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  // Wishlist badge update micro-animation
  useEffect(() => {
    if (prevWishlistCount.current !== wishlistCount) {
      prevWishlistCount.current = wishlistCount;
      setWishlistPop(true);
      const t = setTimeout(() => setWishlistPop(false), 300);
      return () => clearTimeout(t);
    }
  }, [wishlistCount]);

  // Close mobile menu or search dropdown on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (searchFocused) setSearchFocused(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, searchFocused]);

  const isAdminSession = Boolean(currentUser && currentUser.role === 'admin');

  const searchSuggestions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category_slug.toLowerCase().includes(q) ||
          (p.subcategory_slug || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [searchQuery, products]);

  const navItems: {
    id: 'home' | 'products' | 'categories';
    label: string;
    href: string;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      isActive: activeView === 'home',
      onClick: () => onNavigateView('home'),
    },
    {
      id: 'products',
      label: 'All Products',
      href: '/all-products',
      isActive: activeView === 'products' && selectedCategory === 'all',
      onClick: () => {
        onSelectCategory('all');
        onNavigateView('products');
      },
    },
    {
      id: 'categories',
      label: 'Categories',
      href: '/categories',
      isActive: activeView === 'categories',
      onClick: () => onNavigateView('categories'),
    },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#F7F3EB]/95 backdrop-blur-xl border-b border-[#631828]/25 shadow-md'
          : 'bg-[#F7F3EB]/90 backdrop-blur-md border-b border-[#631828]/15 shadow-2xs'
      }`}
    >
      {/* Top Announcement Bar */}
      <div className="bg-[#631828] text-[#F7F3EB] text-xs py-2 px-4 border-b border-[#C5A06E]/30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-center text-center">
          <p className="font-medium tracking-wide truncate">
            {settings.announcement_bar ||
              `Nationwide Delivery Across Pakistan — Flat Rs. ${settings.delivery_fee_pkr} Shipping`}
          </p>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Left: Mobile Menu Button + Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-xl text-[#1F181A] hover:bg-[#EFE9DC] transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateView('home');
              }}
              className="text-left group inline-block transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="font-serif-editorial text-2xl sm:text-3xl font-bold tracking-[0.2em] text-[#1F181A] group-hover:text-[#631828] transition-colors duration-200 block leading-none">
                {settings.store_name || 'FONER'}
              </span>
            </a>
          </div>

          {/* Center: Clean Primary Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                data-active={item.isActive ? 'true' : 'false'}
                onClick={(e) => {
                  e.preventDefault();
                  item.onClick();
                }}
                className={`foner-nav-link relative px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 ${
                  item.isActive
                    ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                    : 'text-[#1F181A]/80 hover:text-[#631828] hover:bg-[#EFE9DC]/70'
                }`}
              >
                {item.label}
              </a>
            ))}

            {/* Admin Link: Rendered ONLY when authenticated user has role === 'admin' */}
            {isAdminSession && (
              <a
                href="/admin"
                data-active={activeView === 'admin' ? 'true' : 'false'}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateView('admin');
                }}
                className={`foner-nav-link px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] transition-all inline-flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-[#1F181A] text-[#C5A06E] shadow-xs'
                    : 'bg-[#EFE9DC] text-[#631828] border border-[#631828]/25 hover:bg-[#631828] hover:text-[#F7F3EB]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </a>
            )}
          </nav>

          {/* Right: Search + Account + Wishlist + Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Search Box with Live Suggestions */}
            <div className="hidden md:block relative">
              <div
                className={`flex items-center bg-[#EFE9DC] border rounded-full px-3.5 py-1.5 transition-all duration-200 ${
                  searchFocused
                    ? 'border-[#631828] ring-2 ring-[#631828]/15 w-60 lg:w-72 bg-[#F7F3EB]'
                    : 'border-[#631828]/20 w-48 lg:w-60'
                }`}
              >
                <Search
                  className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                    searchFocused ? 'text-[#631828]' : 'text-[#631828]/70'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search name, SKU, category..."
                  className="bg-transparent border-none focus:outline-none focus:ring-0 focus:shadow-none text-xs text-[#1F181A] placeholder-[#66585B] pl-2 w-full"
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.14 }}
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="text-[#66585B] hover:text-[#631828] p-0.5 rounded-full"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Live Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchFocused && searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden z-50"
                  >
                    {searchSuggestions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#66585B]">
                        No products matching &ldquo;{searchQuery.trim()}&rdquo;
                      </div>
                    ) : (
                      <div className="divide-y divide-[#631828]/10">
                        {searchSuggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onMouseDown={() => {
                              if (onSelectProduct) onSelectProduct(prod);
                              setSearchFocused(false);
                            }}
                            className="w-full p-2.5 flex items-center gap-3 hover:bg-[#EFE9DC] text-left transition-colors group"
                          >
                            <img
                              src={resolveImageUrl(prod.image_url)}
                              alt={prod.title}
                              className="w-10 h-12 rounded-lg object-cover shrink-0 transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-serif-editorial text-sm font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors truncate">
                                {prod.title}
                              </p>
                              <p className="text-[10px] font-mono-code text-[#66585B]">
                                {prod.sku} • Rs. {prod.price_pkr.toLocaleString()}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Customer Account Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenOrderHistory('profile')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EFE9DC] hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all duration-200 text-xs font-semibold hover:-translate-y-0.5"
                  title="Account & Orders"
                >
                  <UserIcon className="w-4 h-4 text-[#631828] group-hover:text-[#F7F3EB]" />
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </button>
                {onCustomerLogout && (
                  <button
                    type="button"
                    onClick={onCustomerLogout}
                    className="p-2 rounded-xl bg-[#EFE9DC] hover:bg-red-900 text-[#631828] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all duration-200 hover:-translate-y-0.5"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenOrderHistory('profile')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFE9DC] hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all duration-200 text-xs font-semibold hover:-translate-y-0.5"
                title="Sign In or Register"
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Wishlist */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="relative p-2.5 rounded-xl bg-[#EFE9DC] hover:bg-[#631828] text-[#1F181A] hover:text-[#F7F3EB] border border-[#631828]/20 transition-all duration-200 hover:-translate-y-0.5 group"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  wishlistPop ? 'foner-heart-pop' : ''
                }`}
              />
              {wishlistCount > 0 && (
                <span
                  className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-[10px] font-bold flex items-center justify-center border border-[#F7F3EB] ${
                    wishlistPop ? 'foner-badge-pop' : ''
                  }`}
                >
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              className="foner-btn-primary inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] transition-all shadow-sm"
              aria-label="Shopping Cart"
            >
              <ShoppingBag
                className={`w-4 h-4 text-[#C5A06E] transition-transform duration-200 ${
                  cartPop ? 'scale-115' : ''
                }`}
              />
              <span className="text-xs font-semibold tracking-wider uppercase hidden sm:inline">
                Cart
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md bg-[#F7F3EB]/15 font-mono-code text-xs font-bold text-[#C5A06E] ${
                  cartPop ? 'foner-badge-pop' : ''
                }`}
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden bg-[#EFE9DC] border-t border-[#631828]/15"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Mobile Search */}
              <div className="flex items-center bg-[#F7F3EB] border border-[#631828]/25 rounded-xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-[#631828]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent border-none focus:outline-none text-xs text-[#1F181A] placeholder-[#66585B] pl-2 w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="text-[#66585B] hover:text-[#631828]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-left transition-colors ${
                      item.isActive
                        ? 'bg-[#631828] text-[#F7F3EB]'
                        : 'bg-[#F7F3EB] text-[#1F181A]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    onOpenOrderHistory('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-left bg-[#F7F3EB] text-[#1F181A]"
                >
                  {currentUser ? 'My Account' : 'Sign In'}
                </button>

                {isAdminSession && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateView('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="col-span-2 py-2.5 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-left bg-[#1F181A] text-[#C5A06E] flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
