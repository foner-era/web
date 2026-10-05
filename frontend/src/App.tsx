import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ShoppingBag,
  ArrowUpRight,
  SlidersHorizontal,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Bell,
  HelpCircle,
  Truck,
  Loader2,
  Filter,
  Instagram,
  Facebook,
} from 'lucide-react';
import { WhatsAppIcon, getEffectiveBusinessContact } from './utils/contact';
import {
  AuditLog,
  Banner,
  CartItem,
  Category,
  Coupon,
  DatabaseStatusInfo,
  FaqItem,
  FooterSection,
  InformationalPage,
  Order,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVariant,
  RestockNotification,
  Review,
  StoreSettings,
  StoreStatistics,
  Subcategory,
  User,
} from './types';
import {
  apiFetch,
  getCustomerToken,
  setCustomerToken,
  getStoredCustomerUser,
  setStoredCustomerUser,
  getAdminToken,
  setAdminToken,
  fetchStoreStatistics,
  parseResponseJson,
} from './api';
import { Navbar } from './components/Navbar';
import { HeroBannerCarousel } from './components/HeroBannerCarousel';
import { ProductModal } from './components/ProductModal';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { OrderHistory } from './components/OrderHistory';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { NewsletterSignup } from './components/NewsletterSignup';
import { AdminPanel, AdminTab } from './components/AdminPanel';
import { FooterDedicatedPages } from './components/FooterDedicatedPages';
import {
  ScrollReveal,
  PageTransition,
  ProductCardSkeleton,
} from './components/AnimationSystem';

const DEFAULT_FOOTER_SECTIONS: FooterSection[] = [
  {
    id: 'shop',
    heading: 'Shop',
    links: [
      { id: 'all-products', label: 'All Products', path: '/all-products', enabled: true },
      { id: 'categories', label: 'Categories', path: '/categories', enabled: true },
      { id: 'new-arrivals', label: 'New Arrivals', path: '/new-arrivals', enabled: true },
      { id: 'featured', label: 'Featured', path: '/featured', enabled: true },
    ],
  },
  {
    id: 'support',
    heading: 'Support',
    links: [
      { id: 'track-orders', label: 'Track Orders', path: '/track-orders', enabled: true },
      { id: 'shipping-returns', label: 'Shipping & Returns', path: '/shipping-returns', enabled: true },
      { id: 'faq', label: 'FAQ', path: '/faq', enabled: true },
      { id: 'contact', label: 'Contact', path: '/contact', enabled: true },
    ],
  },
];

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'FONER',
  tagline: 'Tailored outerwear, knitwear, and leather goods.',
  footer_description: 'Tailored outerwear, knitwear, and leather goods.',
  currency: 'PKR',
  currency_symbol: 'Rs.',
  delivery_fee_pkr: 300,
  free_shipping_note: 'Flat Rs. 300 nationwide delivery across Pakistan',
  announcement_bar: 'Nationwide delivery across Pakistan — Rs. 300 flat shipping rate',
  contactEmail: 'fonerera@gmail.com',
  contact_email: 'fonerera@gmail.com',
  business_email: 'fonerera@gmail.com',
  business_phone: '',
  business_address: '',
  support_phone: '',
  support_email: 'fonerera@gmail.com',
  atelier_address: '',
  instagramUrl: '',
  instagram_url: '',
  facebook_url: '',
  whatsapp_number: '',
  footer_copyright_text: `© ${new Date().getFullYear()} FONER. All rights reserved.`,
  footer_bottom_note: 'Nationwide shipping across Pakistan — Rs. 300',
};

export function App() {
  // Storefront state
  const [settings, setSettings] = useState<StoreSettings>({} as StoreSettings);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restockNotifications, setRestockNotifications] = useState<RestockNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatusInfo | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStatistics | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const [pages, setPages] = useState<InformationalPage[]>([]);

  // Navigation & View State (Synced with URL path)
  type AppView =
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

  const resolveViewFromPath = (pathname: string): AppView => {
    const clean = pathname.replace(/\/+$/, '') || '/';
    if (clean === '/' || clean === '/home' || clean === '/checkout') return 'home';
    if (clean === '/admin') return 'admin';
    if (clean === '/categories') return 'categories';
    if (
      clean === '/all-products' ||
      clean === '/new-arrivals' ||
      clean === '/featured' ||
      clean === '/products' ||
      clean.startsWith('/products/')
    ) {
      return 'products';
    }
    if (clean === '/faq') return 'faq';
    if (clean === '/contact') return 'contact';
    if (clean === '/shipping-returns') return 'shipping-returns';
    if (clean === '/track-orders') return 'track-orders';
    if (clean === '/about') return 'about';
    return 'not-found';
  };

  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      return resolveViewFromPath(window.location.pathname);
    }
    return 'home';
  });
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minPriceFilter, setMinPriceFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'featured' | 'popular' | 'price-asc' | 'price-desc' | 'newest'
  >(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/new-arrivals') {
      return 'newest';
    }
    return 'featured';
  });
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [storeLoading, setStoreLoading] = useState<boolean>(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Recently Viewed Product IDs (Deduplicated, max 8)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('foner_recently_viewed');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0).slice(0, 8)
        : [];
    } catch {
      return [];
    }
  });

  // Active Customer Session (Strictly isolated from Admin identity)
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredCustomerUser());
  const [authChecking, setAuthChecking] = useState<boolean>(() =>
    Boolean(getCustomerToken() && !getStoredCustomerUser())
  );
  const [adminUser, setAdminUser] = useState<User | null>(null);

  // Cart & Wishlist State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('foner_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('foner_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [1, 2];
    }
  });

  // Modals & Drawers
  const [activeProductPage, setActiveProductPage] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  useEffect(() => {
    if (activeView === 'admin') {
      document.title = 'Foner — Admin';
    } else {
      document.title = 'Foner — Online Store';
    }
  }, [activeView]);

  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname === '/checkout' ||
        window.location.hash === '#checkout' ||
        new URLSearchParams(window.location.search).get('checkout') === '1'
      );
    }
    return false;
  });
  const [cartDrawerMode, setCartDrawerMode] = useState<'cart' | 'checkout'>(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.pathname === '/checkout' ||
        window.location.hash === '#checkout' ||
        new URLSearchParams(window.location.search).get('checkout') === '1'
      ) {
        return 'checkout';
      }
    }
    return 'cart';
  });
  const [orderHistoryOpen, setOrderHistoryOpen] = useState<boolean>(false);
  const [orderHistoryInitialTab, setOrderHistoryInitialTab] = useState<
    'orders' | 'track' | 'profile'
  >('profile');
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [wishlistModalOpen, setWishlistModalOpen] = useState<boolean>(false);
  const [activeInfoModal, setActiveInfoModal] = useState<'faq' | 'shipping' | 'contact' | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter Drawer & Sidebar Animation State
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);
  const [mobileFilterDrawerOpen, setMobileFilterDrawerOpen] = useState<boolean>(false);

  // Product Card Micro-Interaction States
  const [cardCartState, setCardCartState] = useState<Record<number, 'idle' | 'loading' | 'success'>>({});
  const [cardWishlistAnim, setCardWishlistAnim] = useState<Record<number, boolean>>({});

  // Out-of-Stock 'Notify Me' Modal State
  const [notifyModalProduct, setNotifyModalProduct] = useState<Product | null>(null);
  const [notifyModalEmail, setNotifyModalEmail] = useState<string>('');
  const [notifyModalSize, setNotifyModalSize] = useState<string>('');
  const [notifyModalColor, setNotifyModalColor] = useState<string>('');
  const [notifyModalSubmitting, setNotifyModalSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToast((prev) => (prev === msg ? msg : msg));
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  // Close active modals/drawers on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (notifyModalProduct) setNotifyModalProduct(null);
        if (wishlistModalOpen) setWishlistModalOpen(false);
        if (activeInfoModal) setActiveInfoModal(null);
        if (mobileFilterDrawerOpen) setMobileFilterDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifyModalProduct, wishlistModalOpen, activeInfoModal, mobileFilterDrawerOpen]);

  // Persist Cart & Wishlist
  useEffect(() => {
    try {
      localStorage.setItem('foner_cart', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('foner_wishlist', JSON.stringify(wishlistIds));
    } catch {
      // ignore storage errors
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem('foner_recently_viewed', JSON.stringify(recentlyViewedIds.slice(0, 8)));
    } catch {
      // ignore storage errors
    }
  }, [recentlyViewedIds]);

  const recordRecentlyViewedProduct = (productId: number) => {
    if (!Number.isFinite(productId) || productId <= 0) return;
    setRecentlyViewedIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 8);
      if (currentUser || getCustomerToken()) {
        apiFetch('/api/recently-viewed', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        }).catch(() => {});
      }
      return next;
    });
  };

  // Verify server-side session (HttpOnly cookie or token) on mount and resolve real PostgreSQL role
  const verifyCustomerSession = async (): Promise<User | null> => {
    const token = getCustomerToken() || getAdminToken();
    setAuthChecking(true);
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          const realRole = data.user.role === 'admin' ? 'admin' : 'customer';
          const verifiedUser: User = {
            ...data.user,
            role: realRole,
            status: data.user.status || 'active',
          };
          setStoredCustomerUser(verifiedUser);
          setCurrentUser(verifiedUser);
          if (realRole === 'admin') {
            if (token) setAdminToken(token);
            setAdminUser(verifiedUser);
          } else {
            setAdminToken(null);
            setAdminUser(null);
          }
          return verifiedUser;
        } else {
          setCustomerToken(null);
          setAdminToken(null);
          setStoredCustomerUser(null);
          setCurrentUser(null);
          setAdminUser(null);
          return null;
        }
      } else if (res.status === 401 || res.status === 403) {
        setCustomerToken(null);
        setAdminToken(null);
        setStoredCustomerUser(null);
        setCurrentUser(null);
        setAdminUser(null);
        return null;
      }
      return null;
    } catch {
      return null;
    } finally {
      setAuthChecking(false);
    }
  };

  // Bootstrap data from PostgreSQL backend based on real server-verified role
  const fetchBootstrapData = async (userOverride?: User | null) => {
    setStoreLoading(true);
    setStoreError(null);
    try {
      const res = await apiFetch('/api/bootstrap');
      if (!res.ok) {
        setStoreError('Unable to connect to the store. Please try again.');
        return;
      }
      const data = await res.json();

      if (data.settings) {
        setSettings({
          ...data.settings,
          delivery_fee_pkr: Number(data.settings.delivery_fee_pkr ?? 300),
        });
        if (data.settings.faq_json) {
          try {
            const parsedFaqs = JSON.parse(data.settings.faq_json);
            if (Array.isArray(parsedFaqs)) setFaqs(parsedFaqs);
          } catch {
            // ignore
          }
        }
        if (data.settings.pages_json) {
          try {
            const parsedPages = JSON.parse(data.settings.pages_json);
            if (Array.isArray(parsedPages)) setPages(parsedPages);
          } catch {
            // ignore
          }
        }
      }
      if (Array.isArray(data.faqs)) setFaqs(data.faqs);
      if (Array.isArray(data.pages)) setPages(data.pages);
      if (Array.isArray(data.banners)) setBanners(data.banners);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.subcategories)) setSubcategories(data.subcategories);
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);

      const effectiveUser = userOverride !== undefined ? userOverride : currentUser;
      const hasSession = Boolean(effectiveUser || getCustomerToken() || getAdminToken());

      if (effectiveUser && effectiveUser.role === 'admin' && hasSession) {
        try {
          const adminRes = await apiFetch('/api/admin/bootstrap');
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            if (Array.isArray(adminData.users)) setUsers(adminData.users);
            if (Array.isArray(adminData.orders)) setOrders(adminData.orders);
            if (Array.isArray(adminData.coupons)) setCoupons(adminData.coupons);
            if (Array.isArray(adminData.restockNotifications)) {
              setRestockNotifications(adminData.restockNotifications);
            }
            if (Array.isArray(adminData.auditLogs)) setAuditLogs(adminData.auditLogs);
            if (adminData.dbStatus) setDbStatus(adminData.dbStatus);
          }
          const stats = await fetchStoreStatistics(3);
          setStoreStats(stats);
        } catch {
          // ignore
        }
      } else if (hasSession) {
        setUsers([]);
        setAuditLogs([]);
        setRestockNotifications([]);
        setStoreStats(null);
        try {
          const ordRes = await apiFetch('/api/orders');
          if (ordRes.ok) {
            const ordData = await ordRes.json();
            if (Array.isArray(ordData)) setOrders(ordData);
          }
          const rvRes = await apiFetch('/api/recently-viewed');
          if (rvRes.ok) {
            const rvData = await rvRes.json();
            if (Array.isArray(rvData?.product_ids) && rvData.product_ids.length > 0) {
              setRecentlyViewedIds((prev) => {
                const merged = [...rvData.product_ids, ...prev];
                return Array.from(new Set(merged.map((n) => Number(n)).filter((n) => n > 0))).slice(
                  0,
                  8
                );
              });
            }
          }
        } catch {
          // ignore
        }
      } else {
        setUsers([]);
        setOrders([]);
        setAuditLogs([]);
        setRestockNotifications([]);
        setStoreStats(null);
      }
    } catch {
      setStoreError('Unable to connect to the store. Please try again.');
    } finally {
      setStoreLoading(false);
    }
  };

  // Resolve clean product URL `/products/:slug` whenever products load or URL changes
  const syncProductRouteFromPathname = (pathname: string, catalog: Product[]) => {
    const clean = pathname.replace(/\/+$/, '') || '/';
    if (clean.startsWith('/products/')) {
      const slugOrId = decodeURIComponent(clean.slice('/products/'.length)).trim();
      if (!slugOrId) return;
      const matched = catalog.find(
        (p) =>
          (p.slug && p.slug.toLowerCase() === slugOrId.toLowerCase()) ||
          String(p.id) === slugOrId
      );
      if (matched) {
        setActiveView('products');
        setActiveProductPage(matched);
        recordRecentlyViewedProduct(matched.id);
      } else if (catalog.length > 0) {
        apiFetch(`/api/products/slug/${encodeURIComponent(slugOrId)}`)
          .then(async (r) => {
            if (r.ok) {
              const prod = await r.json();
              if (prod && prod.id) {
                setActiveView('products');
                setActiveProductPage(prod);
                recordRecentlyViewedProduct(prod.id);
                return;
              }
            }
            setActiveProductPage(null);
            setActiveView('not-found');
          })
          .catch(() => {
            setActiveProductPage(null);
            setActiveView('not-found');
          });
      }
      return;
    }

    // Check if path matches a category slug whenresolveViewFromPath returned 'not-found'
    const nextView = resolveViewFromPath(clean);
    if (nextView === 'not-found') {
      const potentialCatSlug = clean.replace(/^\/+/, '');
      const matchedCat = categories.find((c) => c.slug === potentialCatSlug);
      if (matchedCat) {
        setSelectedCategory(matchedCat.slug);
        setSelectedSubcategory('all');
        setActiveProductPage(null);
        setActiveView('products');
        return;
      }
    }
    setActiveProductPage(null);
    setActiveView(nextView);
  };

  useEffect(() => {
    verifyCustomerSession().then((verifiedUser) => {
      fetchBootstrapData(verifiedUser);
    });

    const handlePopState = () => {
      const pathname = window.location.pathname;
      syncProductRouteFromPathname(pathname, products);
      if (pathname === '/new-arrivals') {
        setSelectedCategory('all');
        setSelectedSubcategory('all');
        setSortBy('newest');
      } else if (pathname === '/featured' || pathname === '/all-products') {
        setSelectedCategory('all');
        setSelectedSubcategory('all');
        setSortBy('featured');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync `/products/:slug` on initial load or when products list updates
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/products/')) {
      syncProductRouteFromPathname(window.location.pathname, products);
    }
  }, [products]);

  // Dynamic SEO Metadata (Title, Meta Description, OpenGraph, Canonical URL)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const brand = 'Foner';
    let pageTitle = activeView === 'admin' ? 'Foner — Admin' : 'Foner — Online Store';
    let metaDesc =
      settings.footer_description ||
      'Shop Foner luxury outerwear, cashmere knitwear, artisan leather, and footwear across Pakistan.';
    let canonicalPath = typeof window !== 'undefined' ? window.location.pathname : '/';

    if (activeProductPage) {
      // Preserve fixed storefront/admin title; product SEO handled by metaDesc if needed
      metaDesc =
        activeProductPage.meta_description?.trim() ||
        activeProductPage.description ||
        metaDesc;
      canonicalPath = `/products/${activeProductPage.slug || activeProductPage.id}`;
    } else if (activeView === 'not-found') {
      canonicalPath = `/404`;
    }

    document.title = pageTitle;
    const setMetaTag = (selector: string, attr: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          const propMatch = selector.match(/property="([^"]+)"/);
          if (propMatch) el.setAttribute('property', propMatch[1]);
        } else {
          const nameMatch = selector.match(/name="([^"]+)"/);
          if (nameMatch) el.setAttribute('name', nameMatch[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, content);
    };
    setMetaTag('meta[name="description"]', 'content', metaDesc);
    setMetaTag('meta[property="og:title"]', 'content', pageTitle);
    setMetaTag('meta[property="og:description"]', 'content', metaDesc);

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    if (typeof window !== 'undefined') {
      canonicalEl.setAttribute('href', `${window.location.origin}${canonicalPath}`);
    }
  }, [activeProductPage, activeView, selectedCategory, categories, settings]);

  // Trigger consolidated store statistics refresh whenever Admin Dashboard view mounts for an authenticated admin
  useEffect(() => {
    if (activeView === 'admin' && currentUser?.role === 'admin') {
      fetchBootstrapData(currentUser);
    }
  }, [activeView, currentUser?.role]);

  // Keep activeProductPage synced when products refresh
  useEffect(() => {
    if (activeProductPage) {
      const updated = products.find((p) => p.id === activeProductPage.id);
      if (updated) setActiveProductPage(updated);
    }
  }, [products]);

  // Filtered & Sorted Products (Category, Subcategory belonging to Category, Min/Max Price, Search by name/SKU/category/subcategory, Sort including Popular/Best Selling)
  const filteredProducts = useMemo(() => {
    const minP = minPriceFilter.trim() !== '' ? Number(minPriceFilter) : null;
    const maxP = maxPriceFilter.trim() !== '' ? Number(maxPriceFilter) : null;

    return products
      .filter((p) => {
        const matchesCat =
          selectedCategory === 'all' || p.category_slug === selectedCategory;
        const matchesSubcat =
          selectedSubcategory === 'all' || p.subcategory_slug === selectedSubcategory;
        const q = searchQuery.trim().toLowerCase();
        const catName =
          categories.find((c) => c.slug === p.category_slug)?.name.toLowerCase() || '';
        const subcatName =
          subcategories.find((s) => s.slug === p.subcategory_slug)?.name.toLowerCase() || '';
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category_slug.toLowerCase().includes(q) ||
          catName.includes(q) ||
          (p.subcategory_slug || '').toLowerCase().includes(q) ||
          subcatName.includes(q) ||
          p.description.toLowerCase().includes(q);
        const matchesStock = !inStockOnly || p.stock > 0;
        const matchesMinPrice = minP === null || !Number.isFinite(minP) || p.price_pkr >= minP;
        const matchesMaxPrice = maxP === null || !Number.isFinite(maxP) || p.price_pkr <= maxP;
        return (
          matchesCat &&
          matchesSubcat &&
          matchesQuery &&
          matchesStock &&
          matchesMinPrice &&
          matchesMaxPrice
        );
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price_pkr - b.price_pkr;
        if (sortBy === 'price-desc') return b.price_pkr - a.price_pkr;
        if (sortBy === 'newest') {
          return (
            Number(b.is_new_arrival) - Number(a.is_new_arrival) ||
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );
        }
        if (sortBy === 'popular') {
          return (
            Number(b.units_sold || 0) - Number(a.units_sold || 0) ||
            Number(b.is_bestseller) - Number(a.is_bestseller) ||
            Number(b.reviews_count || 0) - Number(a.reviews_count || 0)
          );
        }
        return Number(b.is_featured) - Number(a.is_featured);
      });
  }, [
    products,
    categories,
    subcategories,
    selectedCategory,
    selectedSubcategory,
    searchQuery,
    minPriceFilter,
    maxPriceFilter,
    sortBy,
    inStockOnly,
  ]);

  // Recently Viewed Products (Valid, non-deleted, deduplicated, max 8)
  const recentlyViewedProducts = useMemo(() => {
    const seen = new Set<number>();
    const list: Product[] = [];
    for (const id of recentlyViewedIds) {
      if (seen.has(id)) continue;
      const found = products.find((p) => p.id === id);
      if (found) {
        seen.add(id);
        list.push(found);
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [recentlyViewedIds, products]);

  const featuredProducts = useMemo(
    () => products.filter((p) => p.is_featured).slice(0, 4),
    [products]
  );

  const newArrivalProducts = useMemo(
    () => products.filter((p) => p.is_new_arrival).slice(0, 4),
    [products]
  );

  // Cart Handlers with Variant-Specific Stock, Price, and SKU Safety
  const handleAddToCart = (
    product: Product,
    size: string,
    color: string,
    quantity: number,
    openCheckout = false,
    explicitVariant?: ProductVariant | null
  ) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const matchedVariant =
      explicitVariant ||
      variants.find(
        (v) =>
          v.size.toLowerCase() === size.toLowerCase() &&
          v.color.toLowerCase() === color.toLowerCase()
      ) ||
      null;

    const availableStock = matchedVariant ? Number(matchedVariant.stock ?? 0) : Number(product.stock ?? 0);
    if (availableStock <= 0) {
      openNotifyMeModal(product);
      return;
    }

    const effectivePricePkr =
      matchedVariant &&
      matchedVariant.price_pkr !== null &&
      matchedVariant.price_pkr !== undefined &&
      Number(matchedVariant.price_pkr) > 0
        ? Number(matchedVariant.price_pkr)
        : Number(product.price_pkr);
    const effectiveSku = matchedVariant?.sku || product.sku;
    const effectiveVariantId = matchedVariant?.id;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const nextQty = Math.min(availableStock, updated[existingIdx].quantity + quantity);
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: nextQty,
          variantId: effectiveVariantId,
          variantSku: effectiveSku,
          variantPricePkr: effectivePricePkr,
          variantStock: availableStock,
        };
        return updated;
      }
      return [
        ...prev,
        {
          product,
          selectedSize: size,
          selectedColor: color,
          quantity: Math.min(availableStock, quantity),
          variantId: effectiveVariantId,
          variantSku: effectiveSku,
          variantPricePkr: effectivePricePkr,
          variantStock: availableStock,
        },
      ];
    });

    if (openCheckout) {
      setCartDrawerMode('checkout');
      setCartDrawerOpen(true);
    } else {
      showToast(`Added ${product.title} (${size} / ${color}) to cart.`);
    }
  };

  // Reorder / Buy Again Handler (Re-checks live PostgreSQL stock, price, and variant existence)
  const handleBuyAgain = async (
    order: Order
  ): Promise<{ addedCount: number; warnings: string[] }> => {
    const warnings: string[] = [];
    let addedCount = 0;

    try {
      const res = await apiFetch(`/api/orders/${order.id}/reorder`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.unavailable_messages)) {
          warnings.push(...data.unavailable_messages);
        }
        if (Array.isArray(data.available_items) && data.available_items.length > 0) {
          for (const avail of data.available_items) {
            const liveProd =
              avail.product || products.find((p) => p.id === Number(avail.product_id));
            if (!liveProd) continue;
            const qtyToAdd = Math.max(1, Number(avail.quantity || 1));
            const size = avail.selected_size || liveProd.sizes?.[0] || 'Standard';
            const color = avail.selected_color || liveProd.colors?.[0]?.name || 'Default';
            const matchedVar = Array.isArray(liveProd.variants)
              ? liveProd.variants.find(
                  (v: ProductVariant) =>
                    (avail.variant_id && v.id === avail.variant_id) ||
                    (v.size.toLowerCase() === size.toLowerCase() &&
                      v.color.toLowerCase() === color.toLowerCase())
                )
              : null;
            handleAddToCart(liveProd, size, color, qtyToAdd, false, matchedVar || null);
            addedCount += qtyToAdd;
          }
          if (addedCount > 0) {
            setOrderHistoryOpen(false);
            setCartDrawerMode('cart');
            setCartDrawerOpen(true);
          }
          return { addedCount, warnings };
        }
      }
    } catch {
      // Fallback to local live products check if endpoint unreachable
    }

    for (const item of order.items_json || []) {
      const liveProduct = products.find((p) => p.id === Number(item.product_id));
      if (!liveProduct) {
        warnings.push(`"${item.title}" is no longer available in the catalog.`);
        continue;
      }
      const variants = Array.isArray(liveProduct.variants) ? liveProduct.variants : [];
      if (variants.length > 0) {
        const matchedVariant = variants.find(
          (v) =>
            (item.variant_id && v.id === item.variant_id) ||
            (v.size.toLowerCase() === String(item.selected_size || '').toLowerCase() &&
              v.color.toLowerCase() === String(item.selected_color || '').toLowerCase())
        );
        if (!matchedVariant) {
          warnings.push(
            `Variant (${item.selected_size} / ${item.selected_color}) for "${liveProduct.title}" no longer exists.`
          );
          continue;
        }
        if (Number(matchedVariant.stock || 0) <= 0) {
          warnings.push(
            `"${liveProduct.title}" (${matchedVariant.size} / ${matchedVariant.color}) is currently out of stock.`
          );
          continue;
        }
        const safeQty = Math.min(Number(matchedVariant.stock), Math.max(1, Number(item.quantity || 1)));
        handleAddToCart(
          liveProduct,
          matchedVariant.size,
          matchedVariant.color,
          safeQty,
          false,
          matchedVariant
        );
        addedCount += safeQty;
      } else {
        if (Number(liveProduct.stock || 0) <= 0) {
          warnings.push(`"${liveProduct.title}" is currently out of stock.`);
          continue;
        }
        const safeQty = Math.min(Number(liveProduct.stock), Math.max(1, Number(item.quantity || 1)));
        handleAddToCart(
          liveProduct,
          item.selected_size || liveProduct.sizes?.[0] || 'Standard',
          item.selected_color || liveProduct.colors?.[0]?.name || 'Default',
          safeQty,
          false
        );
        addedCount += safeQty;
      }
    }

    if (addedCount > 0) {
      setOrderHistoryOpen(false);
      setCartDrawerMode('cart');
      setCartDrawerOpen(true);
    }
    return { addedCount, warnings };
  };

  // Out-of-Stock 'Notify Me' Handler
  const openNotifyMeModal = (product: Product) => {
    setNotifyModalProduct(product);
    setNotifyModalEmail(currentUser?.email || '');
    setNotifyModalSize(product.sizes?.[0] || 'Standard');
    setNotifyModalColor(product.colors?.[0]?.name || 'Standard');
  };

  const handleRequestRestock = async (
    product: Product,
    email: string,
    size: string,
    color: string
  ) => {
    const res = await apiFetch('/api/restock-notifications', {
      method: 'POST',
      body: JSON.stringify({
        product_id: product.id,
        customer_email: email,
        preferred_size: size,
        preferred_color: color,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not register restock notification.');
    }
    await fetchBootstrapData();
    showToast(`We will email ${email} when ${product.title} is back in stock.`);
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: nextQty };
      }
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleWishlist = (productId: number) => {
    setCardWishlistAnim((prev) => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setCardWishlistAnim((prev) => ({ ...prev, [productId]: false }));
    }, 380);
    setWishlistIds((prev) => {
      if (prev.includes(productId)) {
        showToast('Removed from wishlist.');
        return prev.filter((id) => id !== productId);
      }
      showToast('Added to wishlist.');
      return [...prev, productId];
    });
  };

  // Coupon Validation
  const handleValidateCoupon = async (code: string, subtotal: number) => {
    const res = await apiFetch('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal_pkr: subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { valid: false, discount_pkr: 0, message: data.error || 'Invalid promo code.' };
    }
    return {
      valid: true,
      discount_pkr: Number(data.discount_pkr || 0),
      code: data.code,
      message: data.message,
    };
  };

  // Place Order in PostgreSQL (Requires Validated Customer Session)
  const handlePlaceOrder = async (payload: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: string;
    shipping_area?: string;
    city: string;
    postal_code: string;
    payment_method: PaymentMethod;
    payment_reference: string;
    coupon_code: string;
    discount_pkr: number;
    gift_wrap: boolean;
    order_notes: string;
    idempotency_key: string;
  }): Promise<Order> => {
    if (!currentUser) {
      throw new Error('Please sign in to your account before placing an order.');
    }

    const itemsPayload = cart.map((item) => ({
      product_id: item.product.id,
      title: item.product.title,
      sku: item.variantSku || item.product.sku,
      variant_id: item.variantId,
      variant_sku: item.variantSku || item.product.sku,
      image_url: item.product.image_url,
      selected_size: item.selectedSize,
      selected_color: item.selectedColor,
      quantity: item.quantity,
    }));

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone,
        shipping_address: payload.shipping_address,
        shipping_area: payload.shipping_area || '',
        shipping_city: payload.city,
        city: payload.city,
        postal_code: payload.postal_code,
        payment_method: payload.payment_method,
        coupon_code: payload.coupon_code || null,
        order_notes: payload.order_notes,
        notes: payload.order_notes,
        idempotency_key: payload.idempotency_key,
        items: itemsPayload,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not place order.');
    }

    setCart([]);
    await fetchBootstrapData();
    showToast(`Order #${data.order_number} placed.`);
    return data;
  };

  // Track Order by Reference
  const handleTrackOrder = async (
    orderNumber: string,
    email?: string
  ): Promise<Order | null> => {
    const cleanEmail = (email || currentUser?.email || '').trim().toLowerCase();
    const qs = cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : '';
    const res = await apiFetch(`/api/orders/track/${encodeURIComponent(orderNumber)}${qs}`);
    if (!res.ok) return null;
    return await res.json();
  };

  // Cancel Pending Order (Restores stock in PostgreSQL)
  const handleCancelOrder = async (order: Order): Promise<void> => {
    const res = await apiFetch(`/api/orders/${order.id}/cancel`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || 'Unable to cancel order.');
      return;
    }
    await fetchBootstrapData(currentUser);
    showToast(`Order #${order.order_number} has been cancelled.`);
  };

  // Submit Product Review
  const handleSubmitReview = async (
    productId: number,
    name: string,
    city: string,
    rating: number,
    comment: string
  ) => {
    const res = await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        customer_name: name,
        customer_city: city,
        rating,
        comment,
      }),
    });
    if (res.ok) {
      await fetchBootstrapData();
      showToast('Review posted.');
    }
  };

  // Newsletter Subscription
  const handleNewsletterSubscribe = async (email: string, city: string) => {
    const res = await apiFetch('/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email, city }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Subscription failed.');
    showToast('Subscribed to newsletter.');
    return { message: data.message || 'Thank you for subscribing.' };
  };

  // Auth & Profile (Role determined strictly by PostgreSQL backend)
  const handleLogin = async (email: string, password?: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Temporary development-safe diagnostic logging (no secrets)
    console.log('[LOGIN] URL:', res.url);
    console.log('[LOGIN] Status:', res.status);
    console.log('[LOGIN] Content-Type:', res.headers.get('Content-Type'));

    const data = await parseResponseJson(res);
    // Log body length only (not content) for diagnostics
    const bodyLength = res.headers.get('Content-Length') || (data && typeof data === 'object' ? JSON.stringify(data).length : 0);
    console.log('[LOGIN] Response body length (approx):', bodyLength);

    if (!res.ok) {
      // Development-safe exposure of actual response details (no secrets)
      const safeStatus = res.status;
      const safeContentType = res.headers.get('Content-Type') || 'none';
      const safeBodyLength = res.headers.get('Content-Length') || (data && typeof data === 'object' ? JSON.stringify(data).length : 0);
      // Expose only safe textual fields from the server response
      const safeError = (data && typeof data.error === 'string') ? data.error : null;
      const safeMessage = (data && typeof data.message === 'string') ? data.message : null;
      console.error('[LOGIN FAIL] status:', safeStatus, 'content-type:', safeContentType, 'bodyLength:', safeBodyLength, 'url:', res.url, 'method: POST', 'error:', safeError, 'message:', safeMessage);
      const msg = safeError || safeMessage || 'Login failed';
      throw new Error(`Login failed: HTTP ${safeStatus}, message: ${msg}`);
    }
    const rawUser = data.user || data;
    const realRole = rawUser.role === 'admin' ? 'admin' : 'customer';
    if (data.token) {
      setCustomerToken(data.token);
      if (realRole === 'admin') {
        setAdminToken(data.token);
      } else {
        setAdminToken(null);
      }
    }
    const loggedInUser: User = {
      ...rawUser,
      role: realRole,
      status: rawUser.status || 'active',
    };
    setStoredCustomerUser(loggedInUser);
    setCurrentUser(loggedInUser);
    setAdminUser(realRole === 'admin' ? loggedInUser : null);
    await fetchBootstrapData(loggedInUser);
    showToast(`Signed in as ${loggedInUser.name}.`);
  };

  const handleRegister = async (payload: {
    name: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    password: string;
    otp: string;
  }) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    const rawUser = data.user || data;
    const realRole = rawUser.role === 'admin' ? 'admin' : 'customer';
    if (data.token) {
      setCustomerToken(data.token);
      if (realRole === 'admin') {
        setAdminToken(data.token);
      } else {
        setAdminToken(null);
      }
    }
    const registeredUser: User = {
      ...rawUser,
      role: realRole,
      status: rawUser.status || 'active',
    };
    setStoredCustomerUser(registeredUser);
    setCurrentUser(registeredUser);
    setAdminUser(realRole === 'admin' ? registeredUser : null);
    await fetchBootstrapData(registeredUser);
    showToast(`Welcome, ${registeredUser.name}! Your account is now signed in.`);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    setCustomerToken(null);
    setAdminToken(null);
    setStoredCustomerUser(null);
    setCurrentUser(null);
    setAdminUser(null);
    setUsers([]);
    setOrders([]);
    setAuditLogs([]);
    setRestockNotifications([]);
    setStoreStats(null);
    if (activeView === 'admin') {
      navigateToRoute('/');
    }
    showToast('Signed out.');
  };

  const handleUpdateProfile = async (payload: {
    name: string;
    phone: string;
    city: string;
    address: string;
    postal_code: string;
  }) => {
    if (!currentUser) return;
    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      const realRole = updated.role === 'admin' ? 'admin' : 'customer';
      const normalized: User = { ...updated, role: realRole, status: updated.status || 'active' };
      setStoredCustomerUser(normalized);
      setCurrentUser(normalized);
      setAdminUser(realRole === 'admin' ? normalized : null);
      await fetchBootstrapData(normalized);
      showToast('Profile saved.');
    }
  };

  const openProductDetailPage = (product: Product) => {
    setActiveView('products');
    setActiveProductPage(product);
    recordRecentlyViewedProduct(product.id);
    if (typeof window !== 'undefined') {
      const cleanUrl = `/products/${product.slug || product.id}`;
      if (window.location.pathname !== cleanUrl) {
        window.history.pushState(null, '', cleanUrl);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategory = (catSlug: string, subcatSlug = 'all', customPath?: string) => {
    setActiveProductPage(null);
    setSelectedCategory(catSlug);
    setSelectedSubcategory(subcatSlug);
    setActiveView('products');
    if (typeof window !== 'undefined') {
      const targetUrl = customPath || (catSlug === 'all' ? '/all-products' : `/all-products`);
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToRoute = (rawPath: string) => {
    const path = (rawPath || '/').trim();
    setActiveProductPage(null);
    setActiveInfoModal(null);

    if (typeof window !== 'undefined' && path.startsWith('/')) {
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    }

    if (path === '/' || path === '/home') {
      setActiveView('home');
    } else if (path === '/admin') {
      setAdminInitialTab('overview');
      setActiveView('admin');
    } else if (path === '/categories') {
      setActiveView('categories');
    } else if (path === '/all-products' || path === '/products') {
      setSelectedCategory('all');
      setSelectedSubcategory('all');
      setSortBy('featured');
      setActiveView('products');
    } else if (path.startsWith('/products/')) {
      syncProductRouteFromPathname(path, products);
    } else if (path === '/new-arrivals') {
      setSelectedCategory('all');
      setSelectedSubcategory('all');
      setSortBy('newest');
      setActiveView('products');
    } else if (path === '/featured') {
      setSelectedCategory('all');
      setSelectedSubcategory('all');
      setSortBy('featured');
      setActiveView('products');
    } else if (path === '/faq') {
      setActiveView('faq');
    } else if (path === '/contact') {
      setActiveView('contact');
    } else if (path === '/shipping-returns') {
      setActiveView('shipping-returns');
    } else if (path === '/track-orders') {
      setActiveView('track-orders');
    } else if (path === '/about') {
      setActiveView('about');
    } else {
      // Check if it matches a category slug; otherwise show Branded 404 page
      const cleanSlug = path.replace(/^\/+/, '');
      const matchedCat = categories.find((c) => c.slug === cleanSlug);
      if (matchedCat) {
        setSelectedCategory(matchedCat.slug);
        setSelectedSubcategory('all');
        setActiveView('products');
      } else {
        setActiveView('not-found');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerSections: FooterSection[] = useMemo(() => {
    if (settings.footer_sections_json) {
      try {
        const parsed = JSON.parse(settings.footer_sections_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback to default
      }
    }
    return DEFAULT_FOOTER_SECTIONS;
  }, [settings.footer_sections_json]);

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  // Reusable Product Card focusing on image, name, price, discount when applicable, stock status, and clear action
  const renderProductCard = (product: Product, index = 0) => {
    const isWishlisted = wishlistIds.includes(product.id);
    const compareAt =
      product.compare_at_price_pkr && product.compare_at_price_pkr > product.price_pkr
        ? product.compare_at_price_pkr
        : 0;
    const savingsPercent =
      compareAt > product.price_pkr
        ? Math.round(((compareAt - product.price_pkr) / compareAt) * 100)
        : 0;
    const addState = cardCartState[product.id] || 'idle';
    const heartPop = Boolean(cardWishlistAnim[product.id]);

    return (
      <ScrollReveal key={product.id} staggerIndex={index % 8}>
        <div
          onClick={() => openProductDetailPage(product)}
          className="group foner-card-lift h-full rounded-2xl sm:rounded-3xl bg-[#EFE9DC] border border-[#631828]/15 hover:border-[#631828]/45 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl cursor-pointer"
        >
          <div>
            {/* Product Image */}
            <div className="relative aspect-[4/5] overflow-hidden bg-[#E5DCCB]">
              <img
                src={product.image_url}
                alt={product.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Top Left Discount & New Badges */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 pointer-events-none">
                {savingsPercent > 0 && (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#631828] text-[#F7F3EB] text-[9px] sm:text-[10px] font-mono-code font-bold uppercase tracking-wider shadow-md">
                    -{savingsPercent}%
                  </span>
                )}
                {product.is_new_arrival && (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#F7F3EB]/95 text-[#631828] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shadow-xs">
                    New
                  </span>
                )}
              </div>

              {/* Wishlist Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWishlist(product.id);
                }}
                className={`absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2.5 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm ${
                  isWishlisted
                    ? 'bg-[#631828] text-[#F7F3EB] scale-105'
                    : 'bg-[#F7F3EB]/90 text-[#1F181A] opacity-90 group-hover:opacity-100 hover:bg-[#631828] hover:text-[#F7F3EB] hover:scale-105'
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                    isWishlisted ? 'fill-current' : ''
                  } ${heartPop ? 'foner-heart-pop' : ''}`}
                />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-5 space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono-code">
                <span
                  className={`font-semibold ${
                    product.stock <= 0
                      ? 'text-red-900'
                      : product.stock < 5
                      ? 'text-amber-900'
                      : 'text-emerald-900'
                  }`}
                >
                  {product.stock <= 0
                    ? 'Out of Stock'
                    : product.stock < 5
                    ? `Low Stock (${product.stock} left)`
                    : `${product.stock} in stock`}
                </span>
              </div>

              <h3 className="font-serif-editorial text-sm sm:text-xl font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors line-clamp-1">
                {product.title}
              </h3>
            </div>
          </div>

          {/* Price & Action Footer */}
          <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 sm:pt-3 border-t border-[#631828]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <span className="font-mono-code text-xs sm:text-lg font-bold text-[#631828] block">
                Rs. {product.price_pkr.toLocaleString()}
              </span>
              {compareAt > 0 && (
                <span className="font-mono-code text-[10px] sm:text-[11px] text-[#66585B] line-through block">
                  Rs. {compareAt.toLocaleString()}
                </span>
              )}
            </div>

            {product.stock <= 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openNotifyMeModal(product);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] sm:text-xs font-semibold transition-all shadow-xs"
              >
                <Bell className="w-3.5 h-3.5 text-[#C5A06E]" />
                <span>Notify Me</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={addState === 'loading'}
                onClick={(e) => {
                  e.stopPropagation();
                  setCardCartState((prev) => ({ ...prev, [product.id]: 'loading' }));
                  setTimeout(() => {
                    handleAddToCart(
                      product,
                      product.sizes?.[0] || 'M',
                      product.colors?.[0]?.name || 'Standard',
                      1,
                      false
                    );
                    setCardCartState((prev) => ({ ...prev, [product.id]: 'success' }));
                    setTimeout(() => {
                      setCardCartState((prev) => ({ ...prev, [product.id]: 'idle' }));
                    }, 1200);
                  }, 140);
                }}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all shadow-xs ${
                  addState === 'success'
                    ? 'bg-emerald-800 text-[#F7F3EB]'
                    : 'bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB]'
                }`}
              >
                {addState === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />
                    <span>Adding</span>
                  </>
                ) : addState === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#F7F3EB]" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C5A06E]" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </ScrollReveal>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EB] text-[#1F181A] selection:bg-[#631828] selection:text-[#F7F3EB]">
      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#631828] text-[#F7F3EB] border border-[#C5A06E]/40 shadow-2xl text-xs font-semibold"
          >
            <Check className="w-4 h-4 text-[#C5A06E]" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <Navbar
        settings={settings}
        categories={categories}
        activeView={activeView}
        onNavigateView={(view) => {
          if (view === 'home') navigateToRoute('/');
          else if (view === 'products') navigateToRoute('/all-products');
          else if (view === 'categories') navigateToRoute('/categories');
          else if (view === 'admin') navigateToRoute('/admin');
        }}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => navigateToCategory(slug, 'all')}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeView !== 'products') {
            setActiveProductPage(null);
            setActiveView('products');
          }
        }}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => {
          setCartDrawerMode('cart');
          setCartDrawerOpen(true);
        }}
        onOpenWishlist={() => setWishlistModalOpen(true)}
        onOpenOrderHistory={(tab) => {
          setOrderHistoryInitialTab(tab || 'profile');
          setOrderHistoryOpen(true);
        }}
        onOpenTrackModal={() => setTrackingModalOpen(true)}
        currentUser={currentUser}
        onCustomerLogout={handleLogout}
        products={products}
        onSelectProduct={(p) => openProductDetailPage(p)}
      />

      {/* Main View Content */}
      {activeView === 'admin' ? (
        <main className="flex-1">
          {authChecking ? (
            <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
              <div className="p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 text-center space-y-2">
                <p className="text-xs font-mono-code uppercase tracking-widest text-[#631828]">
                  Verifying PostgreSQL Session &amp; Role...
                </p>
              </div>
            </div>
          ) : currentUser && currentUser.role === 'admin' ? (
            <AdminPanel
              settings={settings}
              categories={categories}
              subcategories={subcategories}
              banners={banners}
              products={products}
              coupons={coupons}
              users={users}
              orders={orders}
              restockNotifications={restockNotifications}
              auditLogs={auditLogs}
              dbStatus={dbStatus}
              storeStats={storeStats}
              onStatsUpdated={setStoreStats}
              currentUser={currentUser}
              initialTab={adminInitialTab}
              onRefreshStore={() => fetchBootstrapData(currentUser)}
              onSwitchToStorefront={() => navigateToRoute('/')}
              onAdminLogout={handleLogout}
            />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
              <div className="max-w-md w-full p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-[#631828] text-[#C5A06E] flex items-center justify-center mx-auto font-mono-code font-bold text-sm">
                  403
                </div>
                <h2 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Access Denied
                </h2>
                <p className="text-xs text-[#66585B] leading-relaxed">
                  {currentUser
                    ? 'Your account does not have administrator permissions in PostgreSQL to access this route.'
                    : 'Please sign in with an authorized administrator account to access the Admin Dashboard.'}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToRoute('/')}
                    className="px-5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
                  >
                    Return to Storefront
                  </button>
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderHistoryInitialTab('profile');
                        setOrderHistoryOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#F7F3EB] text-[#631828] border border-[#631828]/25 text-xs font-semibold uppercase tracking-widest hover:bg-[#E5DCCB] transition-colors"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      ) : activeView === 'faq' ||
        activeView === 'contact' ||
        activeView === 'shipping-returns' ||
        activeView === 'track-orders' ||
        activeView === 'about' ? (
        <PageTransition routeKey={`dedicated-${activeView}`} className="flex-1 flex flex-col">
          <FooterDedicatedPages
            route={activeView}
            settings={settings}
            faqs={faqs}
            pages={pages}
            currentUser={currentUser}
            orders={orders}
            onNavigateRoute={navigateToRoute}
            onOpenAccountModal={() => setOrderHistoryOpen(true)}
            onShowToast={showToast}
          />
        </PageTransition>
      ) : activeProductPage ? (
        <PageTransition routeKey={`product-${activeProductPage.id}`} className="flex-1">
          <main className="flex-1">
            <ProductDetailPage
              product={activeProductPage}
              allProducts={products}
              categories={categories}
              reviews={reviews}
              deliveryFeePkr={Number(settings.delivery_fee_pkr || 300)}
              isWishlisted={wishlistIds.includes(activeProductPage.id)}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
              onRequestRestock={handleRequestRestock}
              onOpenNotifyModal={openNotifyMeModal}
              onSubmitReview={handleSubmitReview}
              onSelectProduct={(p) => openProductDetailPage(p)}
              recentlyViewedProducts={recentlyViewedProducts}
              onBackToCatalog={(catSlug) => {
                setActiveProductPage(null);
                if (catSlug) {
                  setSelectedCategory(catSlug);
                  setSelectedSubcategory('all');
                  setActiveView('products');
                }
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/all-products');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </main>
        </PageTransition>
      ) : activeView === 'not-found' ? (
        /* =================================================================
           PROFESSIONAL BRANDED FONER 404 PAGE
           ================================================================= */
        <PageTransition routeKey="not-found-404" className="flex-1 flex items-center justify-center">
          <main className="flex-1 flex items-center justify-center px-4 py-20 w-full">
            <ScrollReveal className="max-w-xl w-full">
              <div className="p-8 sm:p-12 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 text-center space-y-5 shadow-xl">
                <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#631828] text-[#C5A06E] font-mono-code text-xs font-bold uppercase tracking-widest">
                  404 • Page Not Found
                </div>
                <h1 className="font-serif-editorial text-4xl sm:text-5xl font-bold text-[#1F181A]">
                  We Could Not Find That Page
                </h1>
                <p className="text-xs sm:text-sm text-[#66585B] leading-relaxed max-w-md mx-auto">
                  The page or product link you followed may have been moved, renamed, or is no longer available in the Foner collection.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToRoute('/')}
                    className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-widest transition-all shadow-md"
                  >
                    <span>Back to Home</span>
                    <ArrowUpRight className="w-4 h-4 text-[#C5A06E] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToRoute('/all-products')}
                    className="px-6 py-3.5 rounded-xl bg-[#F7F3EB] hover:bg-[#E5DCCB] text-[#631828] border border-[#631828]/25 text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </main>
        </PageTransition>
      ) : activeView === 'categories' ? (
        /* =================================================================
           CATEGORIES PAGE VIEW
           ================================================================= */
        <PageTransition routeKey="categories-view" className="flex-1">
          <main className="flex-1 pb-16">
            <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14">
              <ScrollReveal>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold text-[#1F181A]">
                      Categories
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToCategory('all', 'all')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-widest hover:bg-[#430F1B] transition-colors self-start"
                  >
                    <span>All Products ({products.length})</span>
                    <ArrowUpRight className="w-4 h-4 text-[#C5A06E]" />
                  </button>
                </div>
              </ScrollReveal>

              {/* Category Cards focusing on Image and Category Name */}
              <div className="space-y-10">
                {categories.map((cat, catIdx) => {
                  const catSubcategories = subcategories.filter(
                    (s) => s.parent_category_slug === cat.slug
                  );
                  const catProductCount = products.filter((p) => p.category_slug === cat.slug).length;

                  return (
                    <ScrollReveal key={cat.id} staggerIndex={catIdx}>
                      <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-sm hover:shadow-lg transition-shadow space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          <div
                            onClick={() => navigateToCategory(cat.slug, 'all')}
                            className="lg:col-span-5 relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#1F181A] cursor-pointer group foner-card-lift"
                          >
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1F181A]/80 via-[#1F181A]/20 to-transparent transition-opacity duration-300 group-hover:opacity-95" />
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-[#F7F3EB]">
                              <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold group-hover:translate-x-0.5 transition-transform">
                                {cat.name}
                              </h2>
                              <span className="px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-xs font-bold">
                                {catProductCount} {catProductCount === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                          </div>

                          <div className="lg:col-span-7 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                                {cat.name}
                              </h3>
                              <button
                                type="button"
                                onClick={() => navigateToCategory(cat.slug, 'all')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-colors"
                              >
                                <span>Shop Now</span>
                                <ArrowUpRight className="w-4 h-4 text-[#C5A06E]" />
                              </button>
                            </div>

                            {catSubcategories.length > 0 && (
                              <div className="pt-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#66585B] block mb-3">
                                  Subcategories
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {catSubcategories.map((sub) => {
                                    const subCount = products.filter(
                                      (p) => p.subcategory_slug === sub.slug
                                    ).length;
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => navigateToCategory(cat.slug, sub.slug)}
                                        className="group foner-card-lift p-3 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 hover:border-[#631828] flex items-center gap-3.5 text-left transition-all hover:shadow-md"
                                      >
                                        <div className="w-14 h-16 rounded-xl overflow-hidden shrink-0 border border-[#631828]/15">
                                          <img
                                            src={sub.image_url}
                                            alt={sub.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors truncate">
                                            {sub.name}
                                          </h4>
                                          <span className="inline-block mt-0.5 text-[11px] font-mono-code font-semibold text-[#66585B]">
                                            {subCount} {subCount === 1 ? 'item' : 'items'}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>
          </main>
        </PageTransition>
      ) : activeView === 'products' ? (
        /* =================================================================
           PRODUCTS PAGE VIEW
           ================================================================= */
        <PageTransition routeKey="products-catalog" className="flex-1">
          <main className="flex-1 pb-16">
            <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-12">
              {/* Catalog Header & Controls */}
              <ScrollReveal>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#631828]/15">
                  <div>
                    <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold text-[#1F181A]">
                      {selectedSubcategory !== 'all'
                        ? subcategories.find((s) => s.slug === selectedSubcategory)?.name || 'Products'
                        : selectedCategory === 'all'
                        ? 'All Products'
                        : categories.find((c) => c.slug === selectedCategory)?.name || 'Products'}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#66585B] mt-1">
                      Showing {filteredProducts.length} of {products.length} products
                    </p>
                  </div>

                  {/* Filter & Sort Controls (Mobile Filter Drawer Trigger, Collapsible Sidebar Toggle, Price Range, Sort) */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    {/* Mobile Filter Drawer Button */}
                    <button
                      type="button"
                      onClick={() => setMobileFilterDrawerOpen(true)}
                      className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold shadow-xs"
                    >
                      <Filter className="w-3.5 h-3.5 text-[#C5A06E]" />
                      <span>Filters</span>
                    </button>

                    {/* Desktop Filter Drawer/Sidebar Toggle */}
                    <button
                      type="button"
                      onClick={() => setFilterPanelOpen((prev) => !prev)}
                      className={`hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        filterPanelOpen
                          ? 'bg-[#631828] text-[#F7F3EB] border-[#631828]'
                          : 'bg-[#EFE9DC] text-[#1F181A] border-[#631828]/20 hover:border-[#631828]'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>{filterPanelOpen ? 'Hide Filters' : 'Filter Options'}</span>
                    </button>

                    {/* Price Filter (Min & Max PKR) */}
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs">
                      <span className="text-[#66585B] font-semibold">PKR:</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={minPriceFilter}
                        onChange={(e) => setMinPriceFilter(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code text-[#1F181A]"
                      />
                      <span className="text-[#66585B]">–</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={maxPriceFilter}
                        onChange={(e) => setMaxPriceFilter(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code text-[#1F181A]"
                      />
                      {(minPriceFilter || maxPriceFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMinPriceFilter('');
                            setMaxPriceFilter('');
                          }}
                          className="text-[10px] font-bold text-[#631828] hover:underline px-1"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-medium cursor-pointer transition-colors hover:border-[#631828]/50">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded accent-[#631828]"
                      />
                      <span>In Stock Only</span>
                    </label>

                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs transition-colors hover:border-[#631828]/50">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#631828]" />
                      <span className="text-[#66585B]">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent font-semibold text-[#1F181A] focus:outline-none cursor-pointer"
                      >
                        <option value="featured">Featured</option>
                        <option value="popular">Popular / Best Selling</option>
                        <option value="newest">Newest</option>
                        <option value="price-asc">Price: Low → High</option>
                        <option value="price-desc">Price: High → Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Collapsible Desktop Filter Drawer/Panel */}
              <AnimatePresence initial={false}>
                {filterPanelOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#631828] block mb-2">
                          Category
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('all');
                              setSelectedSubcategory('all');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              selectedCategory === 'all'
                                ? 'bg-[#631828] text-[#F7F3EB]'
                                : 'bg-[#F7F3EB] text-[#66585B] hover:text-[#1F181A]'
                            }`}
                          >
                            All
                          </button>
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(c.slug);
                                setSelectedSubcategory('all');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === c.slug
                                  ? 'bg-[#631828] text-[#F7F3EB]'
                                  : 'bg-[#F7F3EB] text-[#66585B] hover:text-[#1F181A]'
                              }`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#631828] block mb-2">
                          Price Range (PKR)
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="Min PKR"
                            value={minPriceFilter}
                            onChange={(e) => setMinPriceFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                          <span className="text-xs text-[#66585B]">to</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="Max PKR"
                            value={maxPriceFilter}
                            onChange={(e) => setMaxPriceFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#631828] block mb-2">
                            Availability
                          </span>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F181A] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inStockOnly}
                              onChange={(e) => setInStockOnly(e.target.checked)}
                              className="rounded accent-[#631828]"
                            />
                            <span>Show In-Stock Items Only</span>
                          </label>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('all');
                              setSelectedSubcategory('all');
                              setMinPriceFilter('');
                              setMaxPriceFilter('');
                              setInStockOnly(false);
                              setSearchQuery('');
                            }}
                            className="text-xs font-bold text-[#631828] hover:underline"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto py-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#EFE9DC] text-[#66585B] hover:text-[#1F181A]'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category_slug === cat.slug).length;
                  const active = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setSelectedSubcategory('all');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                        active
                          ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                          : 'bg-[#EFE9DC] text-[#66585B] hover:text-[#1F181A]'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Subcategory Filter Pills (Only shown for selected category; never shows unrelated subcategories) */}
              <AnimatePresence mode="wait">
                {selectedCategory !== 'all' &&
                  (() => {
                    const belongingSubcats = subcategories.filter(
                      (sub) => sub.parent_category_slug === selectedCategory
                    );
                    if (belongingSubcats.length === 0) {
                      return (
                        <motion.div
                          key="no-subcats"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="pb-4 text-xs text-[#66585B] italic"
                        >
                          No subcategories exist for this category.
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        key={`subcats-${selectedCategory}`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 overflow-x-auto pb-4"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSubcategory('all')}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                            selectedSubcategory === 'all'
                              ? 'bg-[#1F181A] text-[#F7F3EB]'
                              : 'bg-[#EFE9DC]/70 text-[#66585B] hover:text-[#1F181A]'
                          }`}
                        >
                          All {categories.find((c) => c.slug === selectedCategory)?.name} Subcategories
                        </button>
                        {belongingSubcats.map((sub) => {
                          const active = selectedSubcategory === sub.slug;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setSelectedSubcategory(sub.slug)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                                active
                                  ? 'bg-[#631828] text-[#F7F3EB]'
                                  : 'bg-[#EFE9DC]/70 text-[#66585B] hover:text-[#1F181A]'
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </motion.div>
                    );
                  })()}
              </AnimatePresence>

              {/* Store Connection Error Banner */}
              {storeError && (
                <div className="my-4 p-4 rounded-2xl bg-red-900/10 border border-red-800/30 flex items-center justify-between gap-4 text-xs text-red-950">
                  <span>{storeError}</span>
                  <button
                    type="button"
                    onClick={() => fetchBootstrapData(currentUser)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] font-bold uppercase tracking-wider"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Product Grid with Skeleton Loading State & Clean No-Results State */}
              {storeLoading && products.length === 0 ? (
                <div className="pt-4">
                  <ProductCardSkeleton count={8} />
                </div>
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="my-8 p-12 rounded-3xl bg-[#EFE9DC] border border-[#631828]/15 text-center space-y-3"
                >
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {searchQuery.trim()
                      ? `No products found for "${searchQuery.trim()}"`
                      : 'No products match the selected filters.'}
                  </h3>
                  <p className="text-xs text-[#66585B] max-w-md mx-auto">
                    Try clearing your search query, adjusting your price filter, or selecting another category.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedSubcategory('all');
                      setSearchQuery('');
                      setMinPriceFilter('');
                      setMaxPriceFilter('');
                      setInStockOnly(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest"
                  >
                    Reset All Filters
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-4">
                  {filteredProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              )}

              {/* Recently Viewed on Products Page */}
              {recentlyViewedProducts.length > 0 && (
                <div className="mt-16 pt-10 border-t border-[#631828]/15">
                  <ScrollReveal>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <span className="text-[11px] font-mono-code uppercase tracking-widest text-[#631828] font-bold">
                          Browsing History
                        </span>
                        <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                          Recently Viewed
                        </h2>
                      </div>
                    </div>
                  </ScrollReveal>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {recentlyViewedProducts.slice(0, 4).map((p, idx) => renderProductCard(p, idx))}
                  </div>
                </div>
              )}
            </section>
          </main>
        </PageTransition>
      ) : (
        /* =================================================================
           HOME PAGE VIEW
           ================================================================= */
        <PageTransition routeKey="home-view" className="flex-1">
          <main className="flex-1">
            {/* 1. Hero Banner Carousel */}
            <HeroBannerCarousel
              banners={banners}
              deliveryFeePkr={Number(settings.delivery_fee_pkr || 300)}
              onExploreCategory={(slug) => navigateToCategory(slug, 'all')}
            />

            {/* 2. Shop by Category (Image + Category Name focus) */}
            <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 pb-6">
              <ScrollReveal>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                  <h2 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A]">
                    Shop by Category
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveView('categories')}
                    className="text-xs font-semibold uppercase tracking-widest text-[#631828] hover:underline self-start sm:self-auto"
                  >
                    View All Categories
                  </button>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((cat, idx) => (
                  <ScrollReveal key={cat.id} staggerIndex={idx}>
                    <button
                      type="button"
                      onClick={() => navigateToCategory(cat.slug, 'all')}
                      className="group foner-card-lift w-full relative aspect-[4/5] rounded-2xl overflow-hidden border border-[#631828]/20 text-left transition-all hover:shadow-xl block"
                    >
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F181A]/85 via-[#1F181A]/20 to-transparent transition-opacity duration-300 group-hover:opacity-95" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-[#F7F3EB]">
                        <h3 className="font-serif-editorial text-xl font-bold leading-tight group-hover:translate-x-0.5 transition-transform">
                          {cat.name}
                        </h3>
                      </div>
                    </button>
                  </ScrollReveal>
                ))}
              </div>
            </section>

            {/* 3. Subcategories Section */}
            {subcategories.length > 0 && (
              <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
                <ScrollReveal>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                      Subcategories
                    </h2>
                  </div>
                </ScrollReveal>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {subcategories.map((sub, idx) => (
                    <ScrollReveal key={sub.id} staggerIndex={idx}>
                      <button
                        type="button"
                        onClick={() => navigateToCategory(sub.parent_category_slug, sub.slug)}
                        className="group foner-card-lift w-full h-full p-3 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 hover:border-[#631828] text-left transition-all hover:shadow-md flex flex-col justify-between"
                      >
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#E5DCCB] mb-2.5">
                          <img
                            src={sub.image_url}
                            alt={sub.name}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        </div>
                        <h3 className="font-serif-editorial text-sm font-bold text-[#1F181A] group-hover:text-[#631828] transition-colors line-clamp-1">
                          {sub.name}
                        </h3>
                      </button>
                    </ScrollReveal>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Featured Products */}
            {featuredProducts.length > 0 && (
              <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
                <ScrollReveal>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <h2 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A]">
                      Featured
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('featured');
                        navigateToCategory('all', 'all');
                      }}
                      className="text-xs font-semibold uppercase tracking-widest text-[#631828] hover:underline self-start sm:self-auto"
                    >
                      View All Products
                    </button>
                  </div>
                </ScrollReveal>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {featuredProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            )}

            {/* 5. New Arrivals */}
            {newArrivalProducts.length > 0 && (
              <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
                <ScrollReveal>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <h2 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A]">
                      New Arrivals
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('newest');
                        navigateToCategory('all', 'all');
                      }}
                      className="text-xs font-semibold uppercase tracking-widest text-[#631828] hover:underline self-start sm:self-auto"
                    >
                      Shop New Arrivals
                    </button>
                  </div>
                </ScrollReveal>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {newArrivalProducts.map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            )}

            {/* 5.5 Recently Viewed Products */}
            {recentlyViewedProducts.length > 0 && (
              <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
                <ScrollReveal>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                    <div>
                      <span className="text-xs font-mono-code uppercase tracking-widest text-[#631828] font-bold">
                        Your Browsing History
                      </span>
                      <h2 className="font-serif-editorial text-3xl sm:text-4xl font-bold text-[#1F181A]">
                        Recently Viewed
                      </h2>
                    </div>
                  </div>
                </ScrollReveal>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {recentlyViewedProducts.slice(0, 4).map((p, idx) => renderProductCard(p, idx))}
                </div>
              </section>
            )}

            {/* 6. Newsletter Signup */}
            <NewsletterSignup onSubscribe={handleNewsletterSubscribe} />
          </main>
        </PageTransition>
      )}

      {/* Compact, Functional Footer (100% Admin-Manageable & PostgreSQL Persisted) */}
      <footer className="bg-[#1F181A] text-[#F7F3EB] border-t border-[#C5A06E]/25 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#F7F3EB]/10">
            {/* Brand & Contact */}
            <ScrollReveal staggerIndex={0} className="md:col-span-5 space-y-3">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToRoute('/');
                }}
                className="foner-logo-hover font-serif-editorial text-3xl font-bold tracking-[0.22em] text-[#F7F3EB] hover:text-[#C5A06E] transition-colors inline-block"
              >
                {settings.store_name || 'FONER'}
              </a>
              <p className="text-xs text-[#E5DCCB]/80 max-w-sm leading-relaxed">
                {settings.footer_description || settings.tagline}
              </p>
              {(() => {
                const contact = getEffectiveBusinessContact(settings);
                return (
                  <>
                    <div className="space-y-1.5 text-xs text-[#E5DCCB]/85 pt-2">
                      {contact.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#C5A06E] shrink-0 mt-0.5" />
                          <span className="leading-snug">{contact.address}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#C5A06E] shrink-0" />
                          <a
                            href={`tel:${contact.phone}`}
                            className="font-mono-code hover:text-[#C5A06E] transition-colors"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#C5A06E] shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="hover:text-[#C5A06E] transition-colors"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {(contact.instagramUrl || contact.facebookUrl || contact.whatsappUrl) && (
                      <div className="flex items-center gap-2.5 pt-3">
                        {contact.instagramUrl && (
                          <a
                            href={contact.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            title="Follow us on Instagram"
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F7F3EB]/10 text-[#C5A06E] hover:bg-[#C5A06E] hover:text-[#430F1B] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#C5A06E]/20"
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        )}
                        {contact.facebookUrl && (
                          <a
                            href={contact.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            title="Follow us on Facebook"
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F7F3EB]/10 text-[#C5A06E] hover:bg-[#C5A06E] hover:text-[#430F1B] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#C5A06E]/20"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        )}
                        {contact.whatsappUrl && (
                          <a
                            href={contact.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="WhatsApp"
                            title={`Chat on WhatsApp${contact.whatsappNumber ? ` (${contact.whatsappNumber})` : ''}`}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F7F3EB]/10 text-[#C5A06E] hover:bg-[#C5A06E] hover:text-[#430F1B] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#C5A06E]/20"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </ScrollReveal>

            {/* Dynamic Admin-Manageable Footer Sections */}
            {footerSections.map((section, idx) => (
              <ScrollReveal
                key={section.id || idx}
                staggerIndex={idx + 1}
                className={`${idx === 0 ? 'md:col-span-4' : 'md:col-span-3'} space-y-2.5`}
              >
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#C5A06E]">
                  {section.heading}
                </h4>
                <ul className="space-y-2 text-xs text-[#E5DCCB]/85">
                  {(section.links || [])
                    .filter((l) => l.enabled !== false)
                    .map((link) => (
                      <li key={link.id || link.path}>
                        <a
                          href={link.path}
                          onClick={(e) => {
                            e.preventDefault();
                            navigateToRoute(link.path);
                          }}
                          className="hover:text-[#C5A06E] hover:translate-x-1 transition-all duration-200 inline-block"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                </ul>
              </ScrollReveal>
            ))}
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E5DCCB]/70">
            <p>
              {settings.footer_copyright_text ||
                `© ${new Date().getFullYear()} ${settings.store_name || 'FONER'}. All rights reserved.`}
            </p>
            <p>
              {settings.footer_bottom_note ||
                `Nationwide shipping across Pakistan — Rs. ${settings.delivery_fee_pkr}`}
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterDrawerOpen(false)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative z-10 w-full max-w-sm bg-[#F7F3EB] h-full shadow-2xl border-l border-[#631828]/25 flex flex-col justify-between overflow-y-auto"
            >
              <div className="p-5 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#631828]" />
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Filters &amp; Sort
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterDrawerOpen(false)}
                  className="p-2 rounded-xl text-[#1F181A] hover:bg-[#631828]/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#631828] block mb-2.5">
                    Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedSubcategory('all');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                        selectedCategory === 'all'
                          ? 'bg-[#631828] text-[#F7F3EB]'
                          : 'bg-[#EFE9DC] text-[#66585B]'
                      }`}
                    >
                      All ({products.length})
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(c.slug);
                          setSelectedSubcategory('all');
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                          selectedCategory === c.slug
                            ? 'bg-[#631828] text-[#F7F3EB]'
                            : 'bg-[#EFE9DC] text-[#66585B]'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#631828] block mb-2.5">
                    Price Range (PKR)
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Min PKR"
                      value={minPriceFilter}
                      onChange={(e) => setMinPriceFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Max PKR"
                      value={maxPriceFilter}
                      onChange={(e) => setMaxPriceFilter(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#631828] block mb-2.5">
                    Sort By
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                  >
                    <option value="featured">Featured</option>
                    <option value="popular">Popular / Best Selling</option>
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/15 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded accent-[#631828]"
                  />
                  <span>In Stock Items Only</span>
                </label>
              </div>

              <div className="p-5 bg-[#EFE9DC] border-t border-[#631828]/15 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                    setMinPriceFilter('');
                    setMaxPriceFilter('');
                    setInStockOnly(false);
                    setSearchQuery('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-semibold text-[#631828]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterDrawerOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider"
                >
                  Apply ({filteredProducts.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick-View Product Modal */}
      <ProductModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onOpenFullPage={(prod) => openProductDetailPage(prod)}
        onAddToCart={handleAddToCart}
        onRequestRestock={handleRequestRestock}
        isWishlisted={quickViewProduct ? wishlistIds.includes(quickViewProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        deliveryFeePkr={Number(settings.delivery_fee_pkr || 300)}
        reviews={reviews}
        onSubmitReview={handleSubmitReview}
      />

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={cartDrawerOpen}
        initialMode={cartDrawerMode}
        onClose={() => {
          setCartDrawerOpen(false);
          if (typeof window !== 'undefined' && window.location.pathname === '/checkout') {
            window.history.replaceState(null, '', '/');
          }
        }}
        onBrowseProducts={() => navigateToCategory('all', 'all')}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        deliveryFeePkr={Number(settings.delivery_fee_pkr || 300)}
        currentUser={currentUser}
        authChecking={authChecking}
        availableCoupons={coupons}
        onValidateCoupon={handleValidateCoupon}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        onPlaceOrder={handlePlaceOrder}
        onOpenOrderHistory={() => {
          setOrderHistoryInitialTab('orders');
          setOrderHistoryOpen(true);
        }}
      />

      {/* Account & Order History Modal */}
      <OrderHistory
        isOpen={orderHistoryOpen}
        initialTab={orderHistoryInitialTab}
        onClose={() => setOrderHistoryOpen(false)}
        orders={orders}
        allProducts={products}
        currentUser={currentUser}
        onTrackOrder={handleTrackOrder}
        onBuyAgain={handleBuyAgain}
        onCancelOrder={handleCancelOrder}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        onTrackOrder={handleTrackOrder}
        defaultEmail={currentUser?.email || ''}
      />

      {/* Out-of-Stock 'Notify Me' Modal */}
      <AnimatePresence>
        {notifyModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifyModalProduct(null)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative z-10 w-full max-w-md rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden"
            >
              <div className="p-5 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#631828] text-[#C5A06E] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Restock Notification
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifyModalProduct(null)}
                  className="p-2 rounded-xl text-[#1F181A] hover:bg-[#631828]/10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!notifyModalEmail.trim()) return;
                  setNotifyModalSubmitting(true);
                  try {
                    await handleRequestRestock(
                      notifyModalProduct,
                      notifyModalEmail.trim(),
                      notifyModalSize,
                      notifyModalColor
                    );
                    setNotifyModalProduct(null);
                  } catch (err: any) {
                    showToast(err?.message || 'Could not save notification request.');
                  } finally {
                    setNotifyModalSubmitting(false);
                  }
                }}
                className="p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15">
                  <img
                    src={notifyModalProduct.image_url}
                    alt={notifyModalProduct.title}
                    className="w-14 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded bg-red-900 text-[#F7F3EB] text-[10px] font-mono-code font-bold uppercase">
                      Out of Stock
                    </span>
                    <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] truncate mt-0.5">
                      {notifyModalProduct.title}
                    </h4>
                    <span className="font-mono-code text-xs font-bold text-[#631828]">
                      Rs. {notifyModalProduct.price_pkr.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#66585B] leading-relaxed">
                  Enter your email address to be notified as soon as this item is restocked.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                      Size
                    </label>
                    <select
                      value={notifyModalSize}
                      onChange={(e) => setNotifyModalSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                    >
                      {(notifyModalProduct.sizes || ['Standard']).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                      Color
                    </label>
                    <select
                      value={notifyModalColor}
                      onChange={(e) => setNotifyModalColor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                    >
                      {(notifyModalProduct.colors || [{ name: 'Standard', hex: '#631828' }]).map(
                        (c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={notifyModalEmail}
                    onChange={(e) => setNotifyModalEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 text-xs focus:outline-none focus:border-[#631828]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNotifyModalProduct(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#EFE9DC] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notifyModalSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#C5A06E]" />
                    <span>{notifyModalSubmitting ? 'Saving...' : 'Notify Me'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wishlist Modal */}
      <AnimatePresence>
        {wishlistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWishlistModalOpen(false)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-5 sm:p-6 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-[#631828] fill-[#631828]" />
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Wishlist ({wishlistedProducts.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setWishlistModalOpen(false)}
                  className="p-2 rounded-xl text-[#1F181A] hover:bg-[#631828]/10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
                {wishlistedProducts.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <p className="text-sm text-[#66585B]">Your wishlist is empty.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistModalOpen(false);
                        navigateToCategory('all', 'all');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest"
                    >
                      Shop Now
                    </button>
                  </div>
                ) : (
                  wishlistedProducts.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-16 h-20 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] truncate">
                            {item.title}
                          </h4>
                          <p className="font-mono-code text-sm font-bold text-[#631828]">
                            Rs. {item.price_pkr.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setWishlistModalOpen(false);
                            openProductDetailPage(item);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#F7F3EB] text-[#631828] border border-[#631828]/25 text-xs font-semibold hover:bg-[#E5DCCB]"
                        >
                          View Product
                        </button>
                        {item.stock <= 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setWishlistModalOpen(false);
                              openNotifyMeModal(item);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B]"
                          >
                            Notify Me
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleAddToCart(
                                item,
                                item.sizes?.[0] || 'M',
                                item.colors?.[0]?.name || 'Standard',
                                1,
                                false
                              );
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B]"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Info Modals (FAQ, Shipping & Returns, Contact) */}
      <AnimatePresence>
        {activeInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative z-10 w-full max-w-xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-5 sm:p-6 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {activeInfoModal === 'shipping' && <Truck className="w-5 h-5 text-[#631828]" />}
                  {activeInfoModal === 'faq' && <HelpCircle className="w-5 h-5 text-[#631828]" />}
                  {activeInfoModal === 'contact' && <Phone className="w-5 h-5 text-[#631828]" />}
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {activeInfoModal === 'shipping' && 'Shipping & Returns'}
                    {activeInfoModal === 'faq' && 'Frequently Asked Questions'}
                    {activeInfoModal === 'contact' && 'Contact Us'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal(null)}
                  className="p-2 rounded-xl text-[#1F181A] hover:bg-[#631828]/10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-[#1F181A] leading-relaxed">
                {activeInfoModal === 'shipping' && (
                  <>
                    <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-1.5">
                      <h4 className="font-serif-editorial text-lg font-bold text-[#631828]">
                        Nationwide Delivery
                      </h4>
                      <p className="text-[#66585B]">
                        Standard delivery across Pakistan is a flat Rs. {settings.delivery_fee_pkr} per order. Orders are dispatched within 24–48 hours and arrive within 2–4 business days.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-1.5">
                      <h4 className="font-serif-editorial text-lg font-bold text-[#631828]">
                        Exchanges &amp; Returns
                      </h4>
                      <p className="text-[#66585B]">
                        Unworn items in original packaging with tags attached can be exchanged or returned within 14 days of delivery. Contact {getEffectiveBusinessContact(settings).email} with your order number to initiate a return.
                      </p>
                    </div>
                  </>
                )}

                {activeInfoModal === 'faq' && (
                  <>
                    <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-1">
                      <h4 className="font-bold text-[#1F181A]">What payment methods do you accept?</h4>
                      <p className="text-[#66585B]">
                        We accept Cash on Delivery (COD), JazzCash, EasyPaisa, Debit/Credit Cards, and direct Bank Transfer.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-1">
                      <h4 className="font-bold text-[#1F181A]">How much is shipping?</h4>
                      <p className="text-[#66585B]">
                        Shipping is a flat rate of Rs. {settings.delivery_fee_pkr} across all cities in Pakistan.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-1">
                      <h4 className="font-bold text-[#1F181A]">How do restock notifications work?</h4>
                      <p className="text-[#66585B]">
                        Select &ldquo;Notify Me&rdquo; on any out-of-stock item and enter your email address. You will receive an alert as soon as the item returns to stock.
                      </p>
                    </div>
                  </>
                )}

                {activeInfoModal === 'contact' && (() => {
                  const modalContact = getEffectiveBusinessContact(settings);
                  return (
                    <div className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-3">
                      {modalContact.hasPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-[#631828]" />
                          <div>
                            <span className="block text-[11px] text-[#66585B]">Phone</span>
                            <a
                              href={`tel:${modalContact.phone}`}
                              className="font-mono-code font-bold hover:text-[#631828]"
                            >
                              {modalContact.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#631828]" />
                        <div>
                          <span className="block text-[11px] text-[#66585B]">Email</span>
                          <a
                            href={`mailto:${modalContact.email}`}
                            className="font-semibold hover:text-[#631828]"
                          >
                            {modalContact.email}
                          </a>
                        </div>
                      </div>
                      {modalContact.hasAddress && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-[#631828]" />
                          <div>
                            <span className="block text-[11px] text-[#66585B]">Address</span>
                            <span className="font-semibold">{modalContact.address}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
