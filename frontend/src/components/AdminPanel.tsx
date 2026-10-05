import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Database,
  Settings,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Shield,
  Monitor,
  Smartphone,
  RefreshCw,
  Copy,
  Check,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  UserPlus,
  Award,
  AlertTriangle,
  Calendar,
  X,
  Bell,
  Layers,
  Send,
  Upload,
  HelpCircle,
  FileText,
  ArrowUp,
  ArrowDown,
  Globe,
  Printer,
  Loader2,
  KeyRound,
  Activity,
  Server,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { AnimatedPrice } from './AnimationSystem';
import {
  AnalyticsRange,
  AuditLog,
  Banner,
  Category,
  CategoryPerformanceStat,
  Coupon,
  DatabaseStatusInfo,
  FaqItem,
  FooterLinkItem,
  FooterSection,
  InformationalPage,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductVariant,
  RestockNotification,
  RevenueAnalyticsResponse,
  StoreSettings,
  StoreStatistics,
  Subcategory,
  TopSellingProductStat,
  User,
  UserRole,
  UserStatus,
} from '../types';
import {
  apiFetch,
  fetchStoreStatistics,
  fetchRevenueAnalytics,
  uploadImageFromComputer,
  changeAdminCredentials,
  testBackendConnection,
  testDatabaseConnection,
} from '../api';
import { resolveImageUrl } from '../utils/imageUrl';

interface AdminPanelProps {
  settings: StoreSettings;
  categories: Category[];
  subcategories: Subcategory[];
  banners: Banner[];
  products: Product[];
  coupons: Coupon[];
  users: User[];
  orders: Order[];
  restockNotifications: RestockNotification[];
  auditLogs: AuditLog[];
  dbStatus: DatabaseStatusInfo | null;
  storeStats?: StoreStatistics | null;
  onStatsUpdated?: (stats: StoreStatistics) => void;
  currentUser: User | null;
  initialTab?: AdminTab;
  onAdminLogin?: (email: string, password: string) => Promise<void>;
  onAdminLogout?: () => Promise<void> | void;
  onRefreshStore: () => Promise<void>;
  onSwitchToStorefront: () => void;
}

export type AdminTab =
  | 'overview'
  | 'revenue'
  | 'banners'
  | 'products'
  | 'subcategories'
  | 'restock'
  | 'orders'
  | 'users'
  | 'coupons'
  | 'faq'
  | 'settings'
  | 'database';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  categories,
  subcategories,
  banners,
  products,
  coupons,
  users,
  orders,
  restockNotifications,
  auditLogs,
  dbStatus,
  storeStats: initialStoreStats = null,
  onStatsUpdated,
  currentUser,
  initialTab = 'overview',
  onAdminLogin,
  onAdminLogout,
  onRefreshStore,
  onSwitchToStorefront,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [revenueRange, setRevenueRange] = useState<AnalyticsRange>('30d');
  const [ordersRange, setOrdersRange] = useState<AnalyticsRange>('30d');
  const [revenueChartMode, setRevenueChartMode] = useState<'area' | 'bar'>('area');
  const [dbStoreStats, setDbStoreStats] = useState<StoreStatistics | null>(initialStoreStats);
  const [backendRevenueData, setBackendRevenueData] = useState<RevenueAnalyticsResponse | null>(
    null
  );
  const [refreshingStats, setRefreshingStats] = useState<boolean>(false);
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<Order | null>(null);
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  const [savingUser, setSavingUser] = useState<boolean>(false);
  const [savingCoupon, setSavingCoupon] = useState<boolean>(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Close admin modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProductModalOpen(false);
        setUserModalOpen(false);
        setCouponModalOpen(false);
        setPrintingInvoiceOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync prop updates from parent store refresh
  useEffect(() => {
    if (initialStoreStats) {
      setDbStoreStats(initialStoreStats);
    }
  }, [initialStoreStats]);

  // Fetch aggregated store statistics & revenue analytics from PostgreSQL on mount & state refresh
  const loadAggregatedDashboardStats = async (rangeOverride?: AnalyticsRange) => {
    const activeRange = rangeOverride || revenueRange;
    try {
      const [statsData, analyticsData] = await Promise.all([
        fetchStoreStatistics(3),
        fetchRevenueAnalytics(activeRange),
      ]);
      if (statsData) {
        setDbStoreStats(statsData);
        onStatsUpdated?.(statsData);
      }
      if (analyticsData && Array.isArray(analyticsData.buckets)) {
        setBackendRevenueData(analyticsData);
      }
    } catch {
      // fallback to local state calculation if network request fails
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStoreStatistics(3), fetchRevenueAnalytics(revenueRange)])
      .then(([statsData, analyticsData]) => {
        if (cancelled) return;
        if (statsData) {
          setDbStoreStats(statsData);
          onStatsUpdated?.(statsData);
        }
        if (analyticsData && Array.isArray(analyticsData.buckets)) {
          setBackendRevenueData(analyticsData);
        }
      })
      .catch(() => {
        // fallback to local calculation if network request fails
      });
    return () => {
      cancelled = true;
    };
  }, [revenueRange, orders, products]);

  const handleRefreshDashboardStats = async () => {
    setRefreshingStats(true);
    try {
      await onRefreshStore();
      await loadAggregatedDashboardStats(revenueRange);
      showToast('Database revenue & store statistics refreshed.');
    } finally {
      setRefreshingStats(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ============================================================================
  // BANNER FORM STATE (DYNAMIC DESKTOP + MOBILE BANNERS)
  // ============================================================================
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploadingDesktopBanner, setUploadingDesktopBanner] = useState(false);
  const [uploadingMobileBanner, setUploadingMobileBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    badge_text: 'NEW COLLECTION',
    cta_text: 'Shop Collection',
    cta_link: 'all',
    desktop_image_url: '',
    mobile_image_url: '',
    device_target: 'both' as 'both' | 'desktop' | 'mobile',
    overlay_opacity: 42,
    sort_order: 1,
    is_active: true,
  });

  const startEditBanner = (b: Banner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      subtitle: b.subtitle,
      badge_text: b.badge_text,
      cta_text: b.cta_text,
      cta_link: b.cta_link,
      desktop_image_url: b.desktop_image_url,
      mobile_image_url: b.mobile_image_url,
      device_target: b.device_target,
      overlay_opacity: b.overlay_opacity,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
  };

  const resetBannerForm = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      subtitle: '',
      badge_text: 'NEW COLLECTION',
      cta_text: 'Shop Collection',
      cta_link: 'all',
      desktop_image_url: '',
      mobile_image_url: '',
      device_target: 'both',
      overlay_opacity: 42,
      sort_order: banners.length + 1,
      is_active: true,
    });
  };

  const handleUploadDesktopBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDesktopBanner(true);
    try {
      const uploadedUrl = await uploadImageFromComputer(file);
      setBannerForm((prev) => ({
        ...prev,
        desktop_image_url: uploadedUrl,
        mobile_image_url: prev.mobile_image_url || uploadedUrl,
      }));
      showToast('Desktop banner image uploaded from computer.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload desktop banner image.');
    } finally {
      setUploadingDesktopBanner(false);
      e.target.value = '';
    }
  };

  const handleUploadMobileBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobileBanner(true);
    try {
      const uploadedUrl = await uploadImageFromComputer(file);
      setBannerForm((prev) => ({
        ...prev,
        mobile_image_url: uploadedUrl,
        desktop_image_url: prev.desktop_image_url || uploadedUrl,
      }));
      showToast('Mobile banner image uploaded from computer.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload mobile banner image.');
    } finally {
      setUploadingMobileBanner(false);
      e.target.value = '';
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.desktop_image_url && !bannerForm.mobile_image_url) {
      showToast('Please choose a banner image from your computer first.');
      return;
    }
    const payload = {
      ...bannerForm,
      desktop_image_url: bannerForm.desktop_image_url || bannerForm.mobile_image_url,
      mobile_image_url: bannerForm.mobile_image_url || bannerForm.desktop_image_url,
    };
    const url = editingBanner ? `/api/banners/${editingBanner.id}` : '/api/banners';
    const method = editingBanner ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await onRefreshStore();
      resetBannerForm();
      showToast(editingBanner ? 'Banner updated.' : 'Banner created.');
    }
  };

  const handleDeleteBanner = async (id: number) => {
    const res = await apiFetch(`/api/banners/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      showToast('Banner deleted.');
    }
  };

  // ============================================================================
  // PRODUCT FORM STATE (MULTI-IMAGE LOCAL UPLOAD SYSTEM)
  // ============================================================================
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const LOW_STOCK_THRESHOLD = 3;
  const [productForm, setProductForm] = useState({
    title: '',
    slug: '',
    sku: 'FNR-NEW-101',
    category_slug: 'outerwear',
    subcategory_slug: 'cashmere-overcoats',
    price_pkr: 22500,
    compare_at_price_pkr: 27000,
    description: '',
    fabric_care: '100% Pure Atelier Wool & Silk. Dry clean only.',
    seo_title: '',
    meta_description: '',
    sizes: 'XS, S, M, L, XL',
    colors: 'Oxblood:#4A121F, Sand:#DECBB7',
    stock: 20,
    is_featured: true,
    is_new_arrival: true,
    is_bestseller: false,
  });

  const openEditProduct = (p?: Product) => {
    if (p) {
      setEditingProduct(p);
      const existingGallery =
        Array.isArray(p.gallery_urls) && p.gallery_urls.length > 0
          ? p.gallery_urls
          : p.image_url
          ? [p.image_url]
          : [];
      const uniqueImages = Array.from(
        new Set([p.image_url, ...existingGallery].filter(Boolean))
      );
      setProductImages(uniqueImages);
      setProductVariants(Array.isArray(p.variants) ? p.variants.map((v) => ({ ...v })) : []);
      const formattedColors =
        Array.isArray(p.colors) && p.colors.length > 0
          ? p.colors.map((c) => `${c.name}:${c.hex || '#631828'}`).join(', ')
          : 'Oxblood:#4A121F, Sand:#DECBB7';
      setProductForm({
        title: p.title,
        slug: p.slug || '',
        sku: p.sku,
        category_slug: p.category_slug,
        subcategory_slug: p.subcategory_slug || '',
        price_pkr: p.price_pkr,
        compare_at_price_pkr: p.compare_at_price_pkr || Math.round(p.price_pkr * 1.2),
        description: p.description,
        fabric_care: p.fabric_care,
        seo_title: p.seo_title || `${p.title} | Foner`,
        meta_description: p.meta_description || p.description || '',
        sizes: p.sizes.join(', '),
        colors: formattedColors,
        stock: p.stock,
        is_featured: p.is_featured,
        is_new_arrival: p.is_new_arrival,
        is_bestseller: p.is_bestseller,
      });
    } else {
      setEditingProduct(null);
      setProductImages([]);
      setProductVariants([]);
      setProductForm({
        title: '',
        slug: '',
        sku: `FNR-${Math.floor(100 + Math.random() * 899)}`,
        category_slug: categories[0]?.slug || 'outerwear',
        subcategory_slug: subcategories[0]?.slug || 'cashmere-overcoats',
        price_pkr: 24500,
        compare_at_price_pkr: 29500,
        description: '',
        fabric_care: 'Specialist dry clean only.',
        seo_title: '',
        meta_description: '',
        sizes: 'XS, S, M, L, XL',
        colors: 'Oxblood:#4A121F, Sand:#DECBB7',
        stock: 25,
        is_featured: true,
        is_new_arrival: true,
        is_bestseller: false,
      });
    }
    setProductModalOpen(true);
  };

  const handleAddProductImagesFromComputer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploadingProductImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImageFromComputer(file);
        uploadedUrls.push(url);
      }
      setProductImages((prev) => [...prev, ...uploadedUrls]);
      showToast(
        uploadedUrls.length === 1
          ? '1 product image uploaded from computer.'
          : `${uploadedUrls.length} product images uploaded from computer.`
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to upload product images.');
    } finally {
      setUploadingProductImages(false);
      e.target.value = '';
    }
  };

  const handleReplaceProductImageAt = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProductImages(true);
    try {
      const url = await uploadImageFromComputer(file);
      setProductImages((prev) => prev.map((item, idx) => (idx === index ? url : item)));
      showToast(`Image ${index + 1} replaced.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to replace image.');
    } finally {
      setUploadingProductImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveProductImageAt = (index: number) => {
    setProductImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveProductImage = (index: number, direction: -1 | 1) => {
    setProductImages((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleGenerateVariantMatrix = () => {
    const parsedSizes = productForm.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedColors = productForm.colors
      .split(',')
      .map((c) => c.trim().split(':')[0]?.trim())
      .filter(Boolean);
    const sizesList = parsedSizes.length > 0 ? parsedSizes : ['Standard'];
    const colorsList = parsedColors.length > 0 ? parsedColors : ['Standard'];
    const baseSku = (productForm.sku || 'FNR-100').trim().toUpperCase();
    const generated: ProductVariant[] = [];
    for (const colorName of colorsList) {
      for (const sizeName of sizesList) {
        const existing = productVariants.find(
          (v) =>
            v.size.toLowerCase() === sizeName.toLowerCase() &&
            v.color.toLowerCase() === colorName.toLowerCase()
        );
        if (existing) {
          generated.push(existing);
        } else {
          const cCode =
            colorName
              .replace(/[^a-zA-Z0-9]/g, '')
              .toUpperCase()
              .slice(0, 3) || 'STD';
          const sCode =
            sizeName
              .replace(/[^a-zA-Z0-9]/g, '')
              .toUpperCase()
              .slice(0, 4) || 'STD';
          generated.push({
            size: sizeName,
            color: colorName,
            sku: `${baseSku}-${cCode}-${sCode}`,
            stock: Math.max(0, Math.floor(Number(productForm.stock || 10) / Math.max(1, sizesList.length * colorsList.length))),
            price_pkr: Number(productForm.price_pkr || 0),
          });
        }
      }
    }
    setProductVariants(generated);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productImages.length === 0) {
      showToast('Please add at least one product image from your computer.');
      return;
    }
    const parsedColors = productForm.colors
      .split(',')
      .map((entry) => {
        const [rawName, rawHex] = entry.split(':');
        const name = (rawName || '').trim();
        const hex = (rawHex || '#631828').trim();
        return name ? { name, hex: hex.startsWith('#') ? hex : `#${hex}` } : null;
      })
      .filter(Boolean) as { name: string; hex: string }[];

    const computedStock =
      productVariants.length > 0
        ? productVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stock || 0)), 0)
        : Number(productForm.stock || 0);

    const payload = {
      ...productForm,
      slug: productForm.slug.trim() || undefined,
      seo_title: productForm.seo_title.trim() || `${productForm.title.trim()} | Foner`,
      meta_description: productForm.meta_description.trim() || productForm.description.trim(),
      image_url: productImages[0],
      gallery_urls: productImages,
      price_pkr: Number(productForm.price_pkr),
      compare_at_price_pkr: productForm.compare_at_price_pkr
        ? Number(productForm.compare_at_price_pkr)
        : null,
      stock: computedStock,
      sizes: productForm.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colors:
        parsedColors.length > 0
          ? parsedColors
          : editingProduct?.colors && editingProduct.colors.length > 0
          ? editingProduct.colors
          : [
              { name: 'Signature Bordeaux', hex: '#631828' },
              { name: 'Warm Sand', hex: '#E5DCCB' },
            ],
      variants: productVariants,
    };

    const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const method = editingProduct ? 'PUT' : 'POST';
    setSavingProduct(true);
    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        await onRefreshStore();
        await loadAggregatedDashboardStats(revenueRange);
        setProductModalOpen(false);
        if (data.restockNotificationsSent && data.restockNotificationsSent > 0) {
          showToast(
            `Product saved and ${data.restockNotificationsSent} customer(s) notified of restock.`
          );
        } else {
          showToast(editingProduct ? 'Product updated.' : 'Product added.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Could not save product.');
      }
    } finally {
      setSavingProduct(false);
    }
  };

  // ============================================================================
  // CATEGORIES, SUBCATEGORIES & RESTOCK NOTIFICATIONS HANDLERS
  // ============================================================================
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    accent_color: '#631828',
    product_count: 12,
  });

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image_url: cat.image_url,
      accent_color: cat.accent_color || '#631828',
      product_count: cat.product_count || 12,
    });
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      accent_color: '#631828',
      product_count: 12,
    });
  };

  const handleUploadCategoryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCategoryImage(true);
    try {
      const uploadedUrl = await uploadImageFromComputer(file);
      setCategoryForm((prev) => ({ ...prev, image_url: uploadedUrl }));
      showToast('Category image uploaded from computer.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload category image.');
    } finally {
      setUploadingCategoryImage(false);
      e.target.value = '';
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    if (!categoryForm.image_url) {
      showToast('Please choose a category image from your computer.');
      return;
    }
    const computedSlug =
      categoryForm.slug.trim() ||
      categoryForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify({ ...categoryForm, slug: computedSlug }),
    });
    if (res.ok) {
      await onRefreshStore();
      resetCategoryForm();
      showToast(editingCategory ? 'Category updated in PostgreSQL.' : 'Category created in PostgreSQL.');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      if (editingCategory?.id === id) resetCategoryForm();
      showToast('Category deleted from database.');
    }
  };

  const [uploadingSubcatImage, setUploadingSubcatImage] = useState(false);
  const [subcatForm, setSubcatForm] = useState({
    name: '',
    slug: '',
    parent_category_slug: categories[0]?.slug || 'outerwear',
    description: '',
    image_url: '',
    featured: true,
  });

  const handleUploadSubcatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSubcatImage(true);
    try {
      const uploadedUrl = await uploadImageFromComputer(file);
      setSubcatForm((prev) => ({ ...prev, image_url: uploadedUrl }));
      showToast('Subcategory image uploaded from computer.');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload subcategory image.');
    } finally {
      setUploadingSubcatImage(false);
      e.target.value = '';
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatForm.name.trim()) return;
    const computedSlug =
      subcatForm.slug.trim() ||
      subcatForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const res = await apiFetch('/api/subcategories', {
      method: 'POST',
      body: JSON.stringify({
        ...subcatForm,
        slug: computedSlug,
        image_url: subcatForm.image_url || categories[0]?.image_url || '',
      }),
    });
    if (res.ok) {
      await onRefreshStore();
      setSubcatForm({
        name: '',
        slug: '',
        parent_category_slug: categories[0]?.slug || 'outerwear',
        description: '',
        image_url: '',
        featured: true,
      });
      showToast(`Subcategory "${subcatForm.name}" created!`);
    }
  };

  const handleDeleteSubcategory = async (id: number) => {
    const res = await apiFetch(`/api/subcategories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      showToast('Subcategory deleted from database');
    }
  };

  const [restockFilter, setRestockFilter] = useState<'all' | 'pending' | 'notified'>('all');

  const handleSendRestockAlert = async (productId: number, productTitle: string) => {
    const res = await apiFetch(`/api/restock-notifications/notify/${productId}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      await onRefreshStore();
      showToast(
        data.notifiedCount > 0
          ? `Sent restock email alerts to ${data.notifiedCount} subscriber(s) for "${productTitle}"!`
          : `All subscribers for "${productTitle}" have been marked as notified.`
      );
    }
  };

  const handleDeleteRestockRequest = async (id: number) => {
    const res = await apiFetch(`/api/restock-notifications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      showToast('Restock notification entry removed');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      showToast('Product removed from catalog');
    }
  };

  // ============================================================================
  // USER & ROLE MANAGEMENT STATE (MODIFY ANY USER & PROMOTE TO ADMIN)
  // ============================================================================
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '+92 300 ',
    city: 'Lahore',
    address: '',
    role: 'customer' as UserRole,
    status: 'active' as UserStatus,
  });

  const openEditUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUserForm({
        name: u.name,
        email: u.email,
        phone: u.phone,
        city: u.city,
        address: u.address,
        role: u.role,
        status: u.status,
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        phone: '+92 300 ',
        city: 'Lahore',
        address: '',
        role: 'admin',
        status: 'active',
      });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';
    setSavingUser(true);
    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        await onRefreshStore();
        setUserModalOpen(false);
        showToast(
          editingUser
            ? `Updated ${userForm.name} (Role: ${userForm.role.toUpperCase()})`
            : `Created new ${userForm.role.toUpperCase()} account: ${userForm.name}`
        );
      }
    } finally {
      setSavingUser(false);
    }
  };

  const [confirmRoleDialog, setConfirmRoleDialog] = useState<{user: User; newRole: UserRole} | null>(null);

  const handleQuickRoleChange = async (user: User, newRole: UserRole) => {
    // Self-change protection
    if (currentUser && currentUser.id === user.id) {
      showToast('You cannot change your own administrator role.');
      return;
    }
    // Confirmation for admin -> customer (stronger)
    if (user.role === 'admin' && newRole === 'customer') {
      setConfirmRoleDialog({ user, newRole });
      return;
    }
    // Standard confirmation for other role changes
    const currLabel = user.role === 'admin' ? 'Admin' : 'Customer';
    const newLabel = newRole === 'admin' ? 'Admin' : 'Customer';
    if (!window.confirm(`Change User Role?\n\nUser: ${user.email}\nCurrent role: ${currLabel}\nNew role: ${newLabel}\n\nThis will immediately change this user's permissions.`)) {
      return;
    }
    await doRoleUpdate(user, newRole);
  };

  const doRoleUpdate = async (user: User, newRole: UserRole) => {
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Role update failed.';
        showToast(msg);
        return;
      }
      await onRefreshStore();
      if (data.message) showToast(data.message);
      else showToast(`${user.name} role updated to ${newRole.toUpperCase()}!`);
    } catch (err: any) {
      showToast(err?.message || 'Network error during role update.');
    }
  };

  // ============================================================================
  // ORDERS MANAGEMENT
  // ============================================================================
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const handleUpdateOrderStatus = async (order: Order, order_status: OrderStatus, payment_status: PaymentStatus) => {
    setUpdatingOrderId(order.id);
    try {
      const res = await apiFetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify({ order_status, payment_status }),
      });
      if (res.ok) {
        await onRefreshStore();
        await loadAggregatedDashboardStats(revenueRange);
        showToast(`Order ${order.order_number} updated to ${order_status.toUpperCase()}`);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ============================================================================
  // SETTINGS, FOOTER SETTINGS, INFORMATIONAL PAGES, FAQ & COUPONS STATE
  // ============================================================================
  const DEFAULT_ADMIN_FOOTER_SECTIONS: FooterSection[] = [
    {
      id: 'collections',
      heading: 'Collections',
      links: [
        { id: 'all-products', label: 'All Luxury Pieces', path: '/all-products', enabled: true },
        { id: 'categories', label: 'Shop by Categories', path: '/categories', enabled: true },
        { id: 'new-arrivals', label: 'New Seasonal Arrivals', path: '/new-arrivals', enabled: true },
        { id: 'featured', label: 'Featured Atelier Reserve', path: '/featured', enabled: true },
      ],
    },
    {
      id: 'client-care',
      heading: 'Client Care & Information',
      links: [
        { id: 'track-orders', label: 'Track Orders', path: '/track-orders', enabled: true },
        { id: 'shipping-returns', label: 'Shipping & Returns', path: '/shipping-returns', enabled: true },
        { id: 'faq', label: 'FAQ', path: '/faq', enabled: true },
        { id: 'contact', label: 'Contact', path: '/contact', enabled: true },
      ],
    },
  ];

  const DEFAULT_ADMIN_PAGES: Record<string, InformationalPage> = {
    'shipping-returns': {
      slug: 'shipping-returns',
      title: 'Shipping & Returns',
      subtitle: 'Transparent nationwide PKR delivery, careful garment packaging, and hassle-free 7-day exchanges.',
      content:
        'Nationwide Delivery Across Pakistan: Every Foner order is dispatched from our Lahore flagship atelier in protective garment packaging. Standard nationwide shipping is a flat Rs. 300 across all cities in Pakistan (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, and beyond).\n\nDispatch & Transit Timelines: Confirmed orders are steamed, inspected, and handed to our courier partners within 24 hours. Delivery takes 2 to 4 working days for major metropolitan cities and 3 to 5 working days for regional destinations.\n\n7-Day Size Exchange & Return Guarantee: If your garment requires a size exchange or return, you may initiate a request within 7 days of receiving your parcel. Items must remain unworn, unwashed, and in original atelier condition with all tags attached.',
      updated_at: new Date().toISOString(),
    },
    contact: {
      slug: 'contact',
      title: 'Contact Foner Atelier',
      subtitle: 'Private client concierge, sizing consultations, and customer order assistance.',
      content:
        'Our Client Concierge team is available Monday through Saturday (11:00 AM – 9:00 PM PKT) to assist with garment measurements, fabric care, bespoke sizing, and nationwide order dispatch inquiries.\n\nContact our atelier team directly by telephone, email, or the client inquiry form on this page.',
      updated_at: new Date().toISOString(),
    },
    faq: {
      slug: 'faq',
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about Foner fabrics, sizing, PKR billing, and nationwide delivery.',
      content:
        'Browse our comprehensive guide to Foner garments, ordering, payment methods, and return policies below. Every question is maintained directly by our atelier team.',
      updated_at: new Date().toISOString(),
    },
    'track-orders': {
      slug: 'track-orders',
      title: 'Track Your Foner Order',
      subtitle: 'Real-time dispatch and courier status for your Foner purchases.',
      content:
        'Sign in to your customer account or verify your order with the email address or phone number used at checkout to inspect live dispatch milestones and item details.',
      updated_at: new Date().toISOString(),
    },
    about: {
      slug: 'about',
      title: 'About Foner Atelier',
      subtitle: 'Architectural wool tailoring, pure cashmere, and modern Pakistani luxury.',
      content:
        'Founded in Lahore, Foner crafts heirloom-grade outerwear, fine merino knitwear, and structured silhouettes engineered for longevity and timeless poise.',
      updated_at: new Date().toISOString(),
    },
  };

  const [settingsSubSection, setSettingsSubSection] = useState<
    'footer' | 'pages' | 'general' | 'security' | 'diagnostics'
  >('footer');

  // System Diagnostics State (Real live tests to backend & PostgreSQL)
  const [diagBackend, setDiagBackend] = useState<{
    tested: boolean;
    connected: boolean;
    statusText: string;
    latencyMs?: number;
    error?: string;
    loading: boolean;
  }>({
    tested: false,
    connected: false,
    statusText: 'Not Tested',
    loading: false,
  });

  const [diagDatabase, setDiagDatabase] = useState<{
    tested: boolean;
    connected: boolean;
    statusText: string;
    databaseName?: string;
    latencyMs?: number;
    error?: string;
    loading: boolean;
  }>({
    tested: false,
    connected: false,
    statusText: 'Not Tested',
    loading: false,
  });

  const [diagLastChecked, setDiagLastChecked] = useState<string | null>(null);

  const handleTestBackend = async () => {
    setDiagBackend((prev) => ({ ...prev, loading: true }));
    const res = await testBackendConnection();
    setDiagBackend({
      tested: true,
      connected: res.connected,
      statusText: res.statusText,
      latencyMs: res.latencyMs,
      error: res.error,
      loading: false,
    });
    setDiagLastChecked(res.checkedAt);
  };

  const handleTestDatabase = async () => {
    setDiagDatabase((prev) => ({ ...prev, loading: true }));
    const res = await testDatabaseConnection();
    setDiagDatabase({
      tested: true,
      connected: res.connected,
      statusText: res.statusText,
      databaseName: res.databaseName,
      latencyMs: res.latencyMs,
      error: res.error,
      loading: false,
    });
    setDiagLastChecked(res.checkedAt);
  };

  const handleRunFullDiagnostics = async () => {
    setDiagBackend((prev) => ({ ...prev, loading: true }));
    setDiagDatabase((prev) => ({ ...prev, loading: true }));
    const [bRes, dRes] = await Promise.all([
      testBackendConnection(),
      testDatabaseConnection(),
    ]);
    setDiagBackend({
      tested: true,
      connected: bRes.connected,
      statusText: bRes.statusText,
      latencyMs: bRes.latencyMs,
      error: bRes.error,
      loading: false,
    });
    setDiagDatabase({
      tested: true,
      connected: dRes.connected,
      statusText: dRes.statusText,
      databaseName: dRes.databaseName,
      latencyMs: dRes.latencyMs,
      error: dRes.error,
      loading: false,
    });
    setDiagLastChecked(dRes.checkedAt || bRes.checkedAt);
  };

  // Auto-run first connection check when entering diagnostics or settings
  useEffect(() => {
    if (activeTab === 'settings' && !diagBackend.tested && !diagBackend.loading) {
      handleRunFullDiagnostics();
    }
  }, [activeTab]);

  // Admin Credentials & Security State
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewEmail, setAdminNewEmail] = useState(currentUser?.email || '');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminSecuritySaving, setAdminSecuritySaving] = useState(false);
  const [adminSecurityError, setAdminSecurityError] = useState<string | null>(null);
  const [adminSecuritySuccess, setAdminSecuritySuccess] = useState<string | null>(null);

  const handleChangeAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSecurityError(null);
    setAdminSecuritySuccess(null);

    if (!adminCurrentPassword) {
      setAdminSecurityError('Current password is required to verify administrator authorization.');
      return;
    }

    if (adminNewPassword) {
      if (adminNewPassword.length < 6 || adminNewPassword.length > 128) {
        setAdminSecurityError('New password must be between 6 and 128 characters.');
        return;
      }
      if (adminNewPassword !== adminConfirmPassword) {
        setAdminSecurityError('New password and confirmation password do not match.');
        return;
      }
    }

    if (!adminNewPassword && adminNewEmail === currentUser?.email) {
      setAdminSecurityError('Please enter a new email address or new password to update.');
      return;
    }

    setAdminSecuritySaving(true);
    try {
      const res = await changeAdminCredentials({
        currentPassword: adminCurrentPassword,
        newEmail: adminNewEmail !== currentUser?.email ? adminNewEmail : undefined,
        newPassword: adminNewPassword || undefined,
      });

      setAdminSecuritySuccess(res.message || 'Admin credentials updated successfully in PostgreSQL.');
      showToast('Admin credentials updated.');
      setAdminCurrentPassword('');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
      await onRefreshStore();
    } catch (err: any) {
      setAdminSecurityError(err?.message || 'Failed to update admin credentials.');
    } finally {
      setAdminSecuritySaving(false);
    }
  };

  const [settingsForm, setSettingsForm] = useState({
    store_name: settings.store_name || 'FONER',
    tagline: settings.tagline || 'Pakistan Luxury Knitwear & Tailored Wool House',
    delivery_fee_pkr: settings.delivery_fee_pkr ?? 300,
    announcement_bar: settings.announcement_bar || '',
    contactEmail:
      settings.contactEmail ||
      settings.contact_email ||
      settings.support_email ||
      settings.business_email ||
      'fonerera@gmail.com',
    support_email:
      settings.contactEmail ||
      settings.contact_email ||
      settings.support_email ||
      settings.business_email ||
      'fonerera@gmail.com',
    support_phone: settings.business_phone || settings.support_phone || '',
    atelier_address: settings.business_address || settings.atelier_address || settings.flagship_address || '',
    flagship_address: settings.business_address || settings.atelier_address || settings.flagship_address || '',
    working_hours: settings.working_hours || 'Mon - Sat: 11:00 AM - 9:00 PM PKT',
    footer_description:
      settings.footer_description ||
      'Crafted for discerning patrons across Pakistan. Every garment is priced transparently in Pakistani Rupees (PKR) with fixed Rs. 300 nationwide courier dispatch.',
    footer_copyright_text:
      settings.footer_copyright_text ||
      '© 2025 FONER ATELIER PAKISTAN. All prices in PKR (Rs.). Fixed Delivery Rs. 300.',
    footer_brand_tagline:
      settings.footer_brand_tagline ||
      settings.tagline ||
      'Pakistan Luxury Knitwear & Tailored Wool House',
    footer_brand_badge: settings.footer_brand_badge || '100% Pure Merino & Cashmere',
    footer_bottom_note: settings.footer_bottom_note || 'PostgreSQL Connected • Dynamic Responsive Hero',
    footer_concierge_heading: settings.footer_concierge_heading || 'Client Concierge & Inquiries',
    instagramUrl: settings.instagramUrl || settings.instagram_url || settings.social_instagram_url || '',
    instagram_handle: settings.instagram_handle || '',
    social_instagram_url: settings.instagramUrl || settings.instagram_url || settings.social_instagram_url || '',
    social_facebook_url: settings.facebook_url || settings.social_facebook_url || '',
    social_whatsapp_url: settings.whatsapp_number || settings.social_whatsapp_url || '',
    social_tiktok_url: settings.social_tiktok_url || '',
  });

  const [footerSections, setFooterSections] = useState<FooterSection[]>(
    Array.isArray(settings.footer_sections) && settings.footer_sections.length > 0
      ? settings.footer_sections
      : DEFAULT_ADMIN_FOOTER_SECTIONS
  );

  const [informationalPages, setInformationalPages] = useState<Record<string, InformationalPage>>(
    settings.informational_pages && Object.keys(settings.informational_pages).length > 0
      ? { ...DEFAULT_ADMIN_PAGES, ...settings.informational_pages }
      : DEFAULT_ADMIN_PAGES
  );
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>('shipping-returns');
  const [pageEditorForm, setPageEditorForm] = useState<InformationalPage>(
    (settings.informational_pages && settings.informational_pages['shipping-returns']) ||
      DEFAULT_ADMIN_PAGES['shipping-returns']
  );
  const [savingPageContent, setSavingPageContent] = useState(false);

  const [faqItems, setFaqItems] = useState<FaqItem[]>(
    Array.isArray(settings.faq_items) ? settings.faq_items : []
  );
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'Shipping & Delivery',
  });
  const [savingFaq, setSavingFaq] = useState(false);

  // Keep admin forms synced when settings prop refreshes from PostgreSQL
  useEffect(() => {
    setSettingsForm({
      store_name: settings.store_name || 'FONER',
      tagline: settings.tagline || 'Pakistan Luxury Knitwear & Tailored Wool House',
      delivery_fee_pkr: settings.delivery_fee_pkr ?? 300,
      announcement_bar: settings.announcement_bar || '',
      contactEmail:
        settings.contactEmail ||
        settings.contact_email ||
        settings.support_email ||
        settings.business_email ||
        'fonerera@gmail.com',
      support_email:
        settings.contactEmail ||
        settings.contact_email ||
        settings.support_email ||
        settings.business_email ||
        'fonerera@gmail.com',
      support_phone: settings.business_phone || settings.support_phone || '',
      atelier_address: settings.business_address || settings.atelier_address || settings.flagship_address || '',
      flagship_address: settings.business_address || settings.atelier_address || settings.flagship_address || '',
      working_hours: settings.working_hours || 'Mon - Sat: 11:00 AM - 9:00 PM PKT',
      footer_description:
        settings.footer_description ||
        'Crafted for discerning patrons across Pakistan. Every garment is priced transparently in Pakistani Rupees (PKR) with fixed Rs. 300 nationwide courier dispatch.',
      footer_copyright_text:
        settings.footer_copyright_text ||
        '© 2025 FONER ATELIER PAKISTAN. All prices in PKR (Rs.). Fixed Delivery Rs. 300.',
      footer_brand_tagline:
        settings.footer_brand_tagline ||
        settings.tagline ||
        'Pakistan Luxury Knitwear & Tailored Wool House',
      footer_brand_badge: settings.footer_brand_badge || '100% Pure Merino & Cashmere',
      footer_bottom_note: settings.footer_bottom_note || 'PostgreSQL Connected • Dynamic Responsive Hero',
      footer_concierge_heading: settings.footer_concierge_heading || 'Client Concierge & Inquiries',
      instagramUrl: settings.instagramUrl || settings.instagram_url || settings.social_instagram_url || '',
      instagram_handle: settings.instagram_handle || '',
      social_instagram_url: settings.instagramUrl || settings.instagram_url || settings.social_instagram_url || '',
      social_facebook_url: settings.facebook_url || settings.social_facebook_url || '',
      social_whatsapp_url: settings.whatsapp_number || settings.social_whatsapp_url || '',
      social_tiktok_url: settings.social_tiktok_url || '',
    });
    if (Array.isArray(settings.footer_sections) && settings.footer_sections.length > 0) {
      setFooterSections(settings.footer_sections);
    }
    if (settings.informational_pages && Object.keys(settings.informational_pages).length > 0) {
      const mergedPages = { ...DEFAULT_ADMIN_PAGES, ...settings.informational_pages };
      setInformationalPages(mergedPages);
      if (mergedPages[selectedPageSlug]) {
        setPageEditorForm(mergedPages[selectedPageSlug]);
      }
    }
    if (Array.isArray(settings.faq_items)) {
      setFaqItems(settings.faq_items);
    }
  }, [settings]);

  const handleSelectPageForEditing = (slug: string) => {
    setSelectedPageSlug(slug);
    const pageObj = informationalPages[slug] || DEFAULT_ADMIN_PAGES[slug] || {
      slug,
      title: slug,
      subtitle: '',
      content: '',
      updated_at: new Date().toISOString(),
    };
    setPageEditorForm(pageObj);
  };

  const handleSaveInformationalPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPageContent(true);
    try {
      const updatedPage: InformationalPage = {
        ...pageEditorForm,
        slug: selectedPageSlug,
        updated_at: new Date().toISOString(),
      };
      const nextPages = {
        ...informationalPages,
        [selectedPageSlug]: updatedPage,
      };
      const res = await apiFetch(`/api/pages/${selectedPageSlug}`, {
        method: 'PUT',
        body: JSON.stringify(updatedPage),
      });
      if (res.ok) {
        setInformationalPages(nextPages);
        await onRefreshStore();
        showToast(`Page "${updatedPage.title}" saved to PostgreSQL!`);
      } else {
        showToast('Failed to save page content.');
      }
    } finally {
      setSavingPageContent(false);
    }
  };

  const handleUpdateSectionHeading = (sectionIndex: number, heading: string) => {
    setFooterSections((prev) =>
      prev.map((sec, idx) => (idx === sectionIndex ? { ...sec, heading } : sec))
    );
  };

  const handleUpdateSectionLink = (
    sectionIndex: number,
    linkIndex: number,
    patch: Partial<FooterLinkItem>
  ) => {
    setFooterSections((prev) =>
      prev.map((sec, idx) => {
        if (idx !== sectionIndex) return sec;
        const nextLinks = sec.links.map((lnk, lIdx) =>
          lIdx === linkIndex ? { ...lnk, ...patch } : lnk
        );
        return { ...sec, links: nextLinks };
      })
    );
  };

  const handleAddLinkToSection = (sectionIndex: number) => {
    setFooterSections((prev) =>
      prev.map((sec, idx) => {
        if (idx !== sectionIndex) return sec;
        const newLink: FooterLinkItem = {
          id: `link-${Date.now()}`,
          label: 'New Footer Link',
          path: '/all-products',
          enabled: true,
        };
        return { ...sec, links: [...sec.links, newLink] };
      })
    );
  };

  const handleRemoveLinkFromSection = (sectionIndex: number, linkIndex: number) => {
    setFooterSections((prev) =>
      prev.map((sec, idx) => {
        if (idx !== sectionIndex) return sec;
        return { ...sec, links: sec.links.filter((_, lIdx) => lIdx !== linkIndex) };
      })
    );
  };

  const persistFaqList = async (nextFaqs: FaqItem[], successToast: string) => {
    setSavingFaq(true);
    try {
      const res = await apiFetch('/api/faqs', {
        method: 'PUT',
        body: JSON.stringify({ faqs: nextFaqs }),
      });
      if (res.ok) {
        setFaqItems(nextFaqs);
        await onRefreshStore();
        showToast(successToast);
      } else {
        showToast('Failed to save FAQs to PostgreSQL.');
      }
    } finally {
      setSavingFaq(false);
    }
  };

  const handleSaveFaqItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
    let nextFaqs: FaqItem[];
    if (editingFaqId) {
      nextFaqs = faqItems.map((item) =>
        item.id === editingFaqId
          ? {
              ...item,
              q: faqForm.question.trim(),
              a: faqForm.answer.trim(),
              question: faqForm.question.trim(),
              answer: faqForm.answer.trim(),
              category: faqForm.category.trim() || 'General',
            }
          : item
      );
    } else {
      const newFaq: FaqItem = {
        id: `faq-${Date.now()}`,
        q: faqForm.question.trim(),
        a: faqForm.answer.trim(),
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category.trim() || 'General',
        sort_order: faqItems.length + 1,
      };
      nextFaqs = [...faqItems, newFaq];
    }
    await persistFaqList(
      nextFaqs,
      editingFaqId ? 'FAQ updated in PostgreSQL!' : 'New FAQ added to PostgreSQL!'
    );
    setEditingFaqId(null);
    setFaqForm({ question: '', answer: '', category: 'Shipping & Delivery' });
  };

  const handleEditFaqItem = (item: FaqItem) => {
    setEditingFaqId(item.id);
    setFaqForm({
      question: item.question || item.q || '',
      answer: item.answer || item.a || '',
      category: item.category || 'General',
    });
  };

  const handleDeleteFaqItem = async (id: string) => {
    const nextFaqs = faqItems
      .filter((item) => item.id !== id)
      .map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    if (editingFaqId === id) {
      setEditingFaqId(null);
      setFaqForm({ question: '', answer: '', category: 'Shipping & Delivery' });
    }
    await persistFaqList(nextFaqs, 'FAQ removed from PostgreSQL.');
  };

  const handleMoveFaqItem = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= faqItems.length) return;
    const copy = [...faqItems];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reordered = copy.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    await persistFaqList(reordered, 'FAQ order updated in PostgreSQL.');
  };

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 15,
    min_order_pkr: 10000,
    usage_limit: '' as string | number,
    per_customer_limit: '' as string | number,
    expires_at: '',
    is_active: true,
  });

  const openEditCouponModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_pkr: coupon.min_order_pkr,
        usage_limit: coupon.usage_limit ?? '',
        per_customer_limit: coupon.per_customer_limit ?? '',
        expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
        is_active: coupon.is_active,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 15,
        min_order_pkr: 10000,
        usage_limit: 100,
        per_customer_limit: '',
        expires_at: '',
        is_active: true,
      });
    }
    setCouponModalOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = (
      settingsForm.contactEmail ||
      settingsForm.support_email ||
      'fonerera@gmail.com'
    ).trim() || 'fonerera@gmail.com';
    const cleanPhone = (settingsForm.support_phone || '').trim();
    const cleanAddress = (settingsForm.atelier_address || '').trim();
    const cleanInstagram = (
      settingsForm.instagramUrl ||
      settingsForm.social_instagram_url ||
      ''
    ).trim();

    const payload = {
      ...settingsForm,
      contactEmail: cleanEmail,
      contact_email: cleanEmail,
      business_email: cleanEmail,
      support_email: cleanEmail,
      business_phone: cleanPhone,
      support_phone: cleanPhone,
      business_address: cleanAddress,
      atelier_address: cleanAddress,
      flagship_address: cleanAddress,
      instagramUrl: cleanInstagram,
      instagram_url: cleanInstagram,
      social_instagram_url: cleanInstagram,
      footer_sections: footerSections,
      footer_sections_json: JSON.stringify(footerSections),
      informational_pages: informationalPages,
      informational_pages_json: JSON.stringify(informationalPages),
    };
    const res = await apiFetch('/api/store_settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await onRefreshStore();
      showToast('Footer & Store settings saved to PostgreSQL!');
    } else {
      showToast('Failed to save settings.');
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) return;
    const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
    const method = editingCoupon ? 'PUT' : 'POST';
    const payload = {
      ...couponForm,
      code: couponForm.code.toUpperCase().trim(),
      discount_value: Number(couponForm.discount_value),
      min_order_pkr: Number(couponForm.min_order_pkr || 0),
      usage_limit:
        couponForm.usage_limit !== '' && Number(couponForm.usage_limit) > 0
          ? Number(couponForm.usage_limit)
          : null,
      per_customer_limit:
        couponForm.per_customer_limit !== '' && Number(couponForm.per_customer_limit) > 0
          ? Number(couponForm.per_customer_limit)
          : null,
      expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
    };

    setSavingCoupon(true);
    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await onRefreshStore();
        setCouponModalOpen(false);
        setEditingCoupon(null);
        setCouponForm({
          code: '',
          description: '',
          discount_type: 'percentage',
          discount_value: 15,
          min_order_pkr: 10000,
          usage_limit: 100,
          per_customer_limit: '',
          expires_at: '',
          is_active: true,
        });
        showToast(editingCoupon ? `Coupon ${payload.code} updated.` : `Coupon ${payload.code} created.`);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Failed to save coupon.');
      }
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    const res = await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefreshStore();
      showToast('Coupon deleted.');
    }
  };

  // ============================================================================
  // POSTGRESQL DATABASE CONNECTION & SCHEMA MIGRATION
  // ============================================================================
  const [syncingDb, setSyncingDb] = useState(false);
  const [dbError, setDbError] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedDbTable, setSelectedDbTable] = useState<string>('products');
  const [liveTableData, setLiveTableData] = useState<{
    table_name: string;
    sql_executed: string;
    row_count: number;
    columns: string[];
    rows: Record<string, any>[];
    fetched_at: string;
  } | null>(null);
  const [loadingTableData, setLoadingTableData] = useState(false);

  const fetchLiveTableRows = async (tableName: string) => {
    setSelectedDbTable(tableName);
    setLoadingTableData(true);
    try {
      const res = await apiFetch(`/api/admin/database/table/${tableName}`);
      if (res.ok) {
        const data = await res.json();
        setLiveTableData(data);
      }
    } catch (err) {
      console.error('Failed to inspect table:', err);
    } finally {
      setLoadingTableData(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'database') {
      fetchLiveTableRows(selectedDbTable || 'products');
    }
  }, [activeTab]);

  const handleInitializePostgres = async () => {
    setSyncingDb(true);
    setDbError('');
    try {
      const res = await apiFetch('/api/admin/database/initialize', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setDbError(data.error || 'Could not verify PostgreSQL schema');
      } else {
        await onRefreshStore();
        showToast('PostgreSQL Schema Verified on GHSOY-SERVER!');
      }
    } catch (err: any) {
      setDbError(err.message || 'Database connection error');
    } finally {
      setSyncingDb(false);
    }
  };

  // Computed metrics (excluding cancelled orders from total revenue)
  const validStoreOrders = useMemo(
    () =>
      orders.filter(
        (o) => String(o.order_status || o.status || '').toLowerCase() !== 'cancelled'
      ),
    [orders]
  );
  const cancelledStoreOrders = useMemo(
    () =>
      orders.filter(
        (o) => String(o.order_status || o.status || '').toLowerCase() === 'cancelled'
      ),
    [orders]
  );
  const completedStoreOrders = useMemo(
    () =>
      validStoreOrders.filter((o) => {
        const st = String(o.order_status || o.status || '').toLowerCase();
        const paySt = String(o.payment_status || '').toLowerCase();
        return st === 'delivered' || st === 'completed' || paySt === 'paid';
      }),
    [validStoreOrders]
  );
  const totalRevenuePkr = useMemo(
    () => validStoreOrders.reduce((sum, o) => sum + Number(o.total_pkr || 0), 0),
    [validStoreOrders]
  );
  const completedStoreRevenuePkr = useMemo(
    () => completedStoreOrders.reduce((sum, o) => sum + Number(o.total_pkr || 0), 0),
    [completedStoreOrders]
  );
  const pendingStoreRevenuePkr = useMemo(
    () =>
      validStoreOrders
        .filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'pending')
        .reduce((sum, o) => sum + Number(o.total_pkr || 0), 0),
    [validStoreOrders]
  );
  const confirmedStoreRevenuePkr = useMemo(
    () =>
      validStoreOrders
        .filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'confirmed')
        .reduce((sum, o) => sum + Number(o.total_pkr || 0), 0),
    [validStoreOrders]
  );
  const totalCancelledExcludedPkr = useMemo(
    () => cancelledStoreOrders.reduce((sum, o) => sum + Number(o.total_pkr || 0), 0),
    [cancelledStoreOrders]
  );
  const adminCount = users.filter((u) => u.role === 'admin').length;

  // Aggregated store statistics from PostgreSQL service layer (with instant local fallback)
  const effectiveTotalRevenuePkr = dbStoreStats?.total_revenue_pkr ?? totalRevenuePkr;
  const effectiveCompletedRevenuePkr =
    dbStoreStats?.completed_revenue_pkr ?? completedStoreRevenuePkr;
  const effectivePendingRevenuePkr = dbStoreStats?.pending_revenue_pkr ?? pendingStoreRevenuePkr;
  const effectiveConfirmedRevenuePkr =
    dbStoreStats?.confirmed_revenue_pkr ?? confirmedStoreRevenuePkr;
  const effectiveExcludedCancelledPkr =
    dbStoreStats?.excluded_cancelled_revenue_pkr ?? totalCancelledExcludedPkr;
  const effectiveTotalOrders = dbStoreStats?.total_orders ?? orders.length;
  const effectiveValidOrdersCount = dbStoreStats?.valid_orders_count ?? validStoreOrders.length;
  const effectivePendingCount =
    dbStoreStats?.pending_orders_count ??
    orders.filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'pending')
      .length;
  const effectiveConfirmedCount =
    dbStoreStats?.confirmed_orders_count ??
    orders.filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'confirmed')
      .length;
  const effectiveProcessingCount =
    dbStoreStats?.processing_orders_count ??
    orders.filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'processing')
      .length;
  const effectiveShippedCount =
    dbStoreStats?.shipped_orders_count ??
    orders.filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'shipped')
      .length;
  const effectiveDeliveredCount =
    dbStoreStats?.delivered_orders_count ??
    orders.filter((o) => String(o.order_status || o.status || '').toLowerCase() === 'delivered')
      .length;
  const effectiveCancelledCount =
    dbStoreStats?.cancelled_orders_count ?? cancelledStoreOrders.length;
  const effectiveLowStockCount =
    dbStoreStats?.low_stock_count ?? products.filter((p) => p.stock < LOW_STOCK_THRESHOLD).length;
  const effectiveOutOfStockCount =
    dbStoreStats?.out_of_stock_count ?? products.filter((p) => p.stock <= 0).length;
  const effectiveAvgOrderValuePkr =
    dbStoreStats?.average_order_value_pkr ??
    (validStoreOrders.length > 0 ? Math.round(totalRevenuePkr / validStoreOrders.length) : 0);

  const computedProductsSoldCount = useMemo(
    () =>
      validStoreOrders.reduce(
        (sum, o) =>
          sum +
          (Array.isArray(o.items_json)
            ? o.items_json.reduce((s, item) => s + Math.max(1, Number(item.quantity || 1)), 0)
            : 0),
        0
      ),
    [validStoreOrders]
  );
  const effectiveProductsSoldCount =
    dbStoreStats?.products_sold_count ?? computedProductsSoldCount;
  const effectiveCustomersCount =
    dbStoreStats?.total_customers ??
    (users.filter((u) => u.role === 'customer').length || users.length);

  const buildTimeBuckets = (range: AnalyticsRange) => {
    const daysCount =
      range === '7d'
        ? 7
        : range === '30d'
        ? 30
        : range === '3m'
        ? 90
        : range === '6m'
        ? 180
        : 365;
    const bucketSpanDays =
      range === '1y' ? 30 : range === '6m' ? 15 : range === '3m' ? 6 : 1;
    const bucketCount = Math.ceil(daysCount / bucketSpanDays);

    const now = new Date();
    const todayStartMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    const todayEndMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    ).getTime();
    const rangeStartMs = todayStartMs - (daysCount - 1) * 86400000;

    const formatShortDate = (ms: number) =>
      new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const buckets = Array.from({ length: bucketCount }, (_, idx) => {
      const bucketStartDayOffset = idx * bucketSpanDays;
      const bucketEndDayOffset = Math.min(daysCount - 1, (idx + 1) * bucketSpanDays - 1);
      const startMs = rangeStartMs + bucketStartDayOffset * 86400000;
      const endMs = rangeStartMs + bucketEndDayOffset * 86400000 + 86399999;

      const label = formatShortDate(endMs);
      const tooltipDate =
        bucketSpanDays === 1
          ? new Date(startMs).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : `${formatShortDate(startMs)} – ${formatShortDate(endMs)}`;

      return {
        label,
        tooltipDate,
        startMs,
        endMs,
        revenue_pkr: 0,
        valid_orders: 0,
        cancelled_orders: 0,
        cancelled_pkr: 0,
      };
    });

    let rangeNetRevenuePkr = 0;
    let rangeValidCount = 0;
    let rangeCancelledCount = 0;
    let rangeCancelledPkr = 0;

    for (const order of orders) {
      const createdMs = new Date(order.created_at).getTime();
      if (!Number.isFinite(createdMs) || createdMs < rangeStartMs || createdMs > todayEndMs) {
        continue;
      }

      const isCancelled =
        String(order.order_status || order.status || '').toLowerCase() === 'cancelled';
      const orderTotal = Number(order.total_pkr || 0);

      if (isCancelled) {
        rangeCancelledCount += 1;
        rangeCancelledPkr += orderTotal;
      } else {
        rangeNetRevenuePkr += orderTotal;
        rangeValidCount += 1;
      }

      const dayIndex = Math.max(
        0,
        Math.min(daysCount - 1, Math.floor((createdMs - rangeStartMs) / 86400000))
      );
      const bucketIndex = Math.min(bucketCount - 1, Math.floor(dayIndex / bucketSpanDays));
      const targetBucket = buckets[bucketIndex];
      if (targetBucket) {
        if (isCancelled) {
          targetBucket.cancelled_orders += 1;
          targetBucket.cancelled_pkr += orderTotal;
        } else {
          targetBucket.revenue_pkr += orderTotal;
          targetBucket.valid_orders += 1;
        }
      }
    }

    return {
      buckets,
      netRevenuePkr: rangeNetRevenuePkr,
      completedRevenuePkr: rangeNetRevenuePkr,
      validOrdersCount: rangeValidCount,
      completedOrdersCount: rangeValidCount,
      cancelledOrdersCount: rangeCancelledCount,
      excludedCancelledPkr: rangeCancelledPkr,
      avgOrderValuePkr:
        rangeValidCount > 0 ? Math.round(rangeNetRevenuePkr / rangeValidCount) : 0,
    };
  };

  // Real PostgreSQL Order Revenue Analytics Series (7d, 30d, 3m, 6m, 1y)
  const revenueAnalytics = useMemo(() => {
    const computed = buildTimeBuckets(revenueRange);
    if (backendRevenueData && backendRevenueData.range === revenueRange) {
      return {
        buckets: backendRevenueData.buckets,
        netRevenuePkr: backendRevenueData.totalRevenuePkr,
        completedRevenuePkr:
          backendRevenueData.completedRevenuePkr ?? backendRevenueData.totalRevenuePkr,
        validOrdersCount: backendRevenueData.validOrdersCount,
        completedOrdersCount:
          backendRevenueData.completedOrdersCount ?? backendRevenueData.validOrdersCount,
        cancelledOrdersCount: backendRevenueData.cancelledOrdersCount,
        excludedCancelledPkr: backendRevenueData.excludedCancelledPkr,
        avgOrderValuePkr: backendRevenueData.averageOrderValuePkr,
      };
    }
    return computed;
  }, [orders, revenueRange, backendRevenueData]);

  // Separate Orders Over Time Series (7d, 30d, 3m, 6m, 1y)
  const ordersAnalytics = useMemo(() => {
    return buildTimeBuckets(ordersRange);
  }, [orders, ordersRange]);

  // Top-Selling Products & Best-Performing Categories from real PostgreSQL order records
  const topSellingProducts: TopSellingProductStat[] = useMemo(() => {
    if (dbStoreStats?.top_selling_products && dbStoreStats.top_selling_products.length > 0) {
      return dbStoreStats.top_selling_products;
    }
    const map = new Map<number, TopSellingProductStat>();
    for (const order of validStoreOrders) {
      for (const item of order.items_json || []) {
        const pid = Number(item.product_id || 0);
        const qty = Math.max(1, Number(item.quantity || 1));
        const lineRev = Number(item.price_pkr || 0) * qty;
        const matchedProd = products.find((p) => p.id === pid);
        const existing = map.get(pid);
        if (existing) {
          existing.units_sold += qty;
          existing.revenue_pkr += lineRev;
          existing.orders_count = (existing.orders_count || 0) + 1;
        } else {
          map.set(pid, {
            product_id: pid,
            title: item.title || matchedProd?.title || `Product #${pid}`,
            sku: item.variant_sku || item.sku || matchedProd?.sku || '',
            image_url: item.image_url || matchedProd?.image_url || '',
            category_slug: matchedProd?.category_slug || 'uncategorized',
            units_sold: qty,
            revenue_pkr: lineRev,
            orders_count: 1,
          });
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.units_sold - a.units_sold || b.revenue_pkr - a.revenue_pkr)
      .slice(0, 8);
  }, [dbStoreStats, validStoreOrders, products]);

  const categoryPerformance: CategoryPerformanceStat[] = useMemo(() => {
    if (dbStoreStats?.category_performance && dbStoreStats.category_performance.length > 0) {
      return dbStoreStats.category_performance;
    }
    const map = new Map<string, CategoryPerformanceStat>();
    for (const order of validStoreOrders) {
      for (const item of order.items_json || []) {
        const pid = Number(item.product_id || 0);
        const qty = Math.max(1, Number(item.quantity || 1));
        const lineRev = Number(item.price_pkr || 0) * qty;
        const matchedProd = products.find((p) => p.id === pid);
        const catSlug = matchedProd?.category_slug || 'uncategorized';
        const matchedCat = categories.find((c) => c.slug === catSlug);
        const catName = matchedCat?.name || catSlug;
        const existing = map.get(catSlug);
        if (existing) {
          existing.products_sold += qty;
          existing.revenue_pkr += lineRev;
          existing.orders_count += 1;
        } else {
          map.set(catSlug, {
            category_slug: catSlug,
            category_name: catName,
            products_sold: qty,
            revenue_pkr: lineRev,
            orders_count: 1,
          });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.revenue_pkr - a.revenue_pkr || b.products_sold - a.products_sold
    );
  }, [dbStoreStats, validStoreOrders, products, categories]);

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesQuery =
      !userSearch.trim() ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.city.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesQuery;
  });

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => Number(p.stock ?? 0) < LOW_STOCK_THRESHOLD)
        .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0) || a.id - b.id),
    [products]
  );
  const lowStockCount = lowStockProducts.length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !productSearch.trim() ||
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category_slug.toLowerCase().includes(productSearch.toLowerCase());
    const matchesStock = stockFilter === 'all' || p.stock < LOW_STOCK_THRESHOLD;
    return matchesSearch && matchesStock;
  });

  const filteredOrders = orders.filter(
    (o) => orderStatusFilter === 'all' || o.order_status === orderStatusFilter
  );

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#F7F3EB]">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#631828] text-[#C5A06E] flex items-center justify-center mx-auto font-bold">
            403
          </div>
          <h2 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
            Access Denied
          </h2>
          <p className="text-xs text-[#66585B] leading-relaxed">
            Administrator privileges in PostgreSQL are required to access the Admin Dashboard.
          </p>
          <button
            type="button"
            onClick={onSwitchToStorefront}
            className="px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] text-[#1F181A] pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#430F1B] text-[#F7F3EB] border border-[#C5A06E] shadow-2xl text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-[#C5A06E]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-[#430F1B] via-[#631828] to-[#430F1B] text-[#F7F3EB] border-b border-[#C5A06E]/30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif-editorial text-3xl sm:text-4xl font-bold tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-[#E5DCCB]/85 mt-1">
                Manage products, subcategories, banners, orders, restock alerts, coupons, and users
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-[#1F181A]/55 border border-[#C5A06E]/40 text-xs">
                <span className="text-[#C5A06E] block text-[10px] font-bold uppercase tracking-wider">
                  Total Store Revenue (PKR)
                </span>
                <span className="font-mono-code font-bold text-sm text-[#F7F3EB]">
                  Rs. {effectiveTotalRevenuePkr.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshDashboardStats}
                disabled={refreshingStats}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#1F181A]/60 hover:bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/35 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C5A06E] ${refreshingStats ? 'animate-spin' : ''}`} />
                <span>{refreshingStats ? 'Refreshing...' : 'Refresh Stats'}</span>
              </button>
              <div className="px-4 py-2.5 rounded-2xl bg-[#1F181A]/45 border border-[#C5A06E]/30 text-xs">
                <span className="text-[#E5DCCB] block text-[10px] uppercase tracking-wider">Signed in as</span>
                <span className="font-semibold text-[#F7F3EB]">
                  {currentUser?.name || 'Admin'} ({currentUser?.role.toUpperCase() || 'ADMIN'})
                </span>
              </div>
              {onAdminLogout && (
                <button
                  type="button"
                  onClick={() => onAdminLogout()}
                  className="px-4 py-3 rounded-xl bg-[#1F181A]/60 hover:bg-red-950 text-[#F7F3EB] border border-[#C5A06E]/30 text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Sign Out Admin
                </button>
              )}
              <button
                onClick={onSwitchToStorefront}
                className="px-5 py-3 rounded-xl bg-[#F7F3EB] text-[#430F1B] hover:bg-[#C5A06E] hover:text-[#1F181A] text-xs font-bold uppercase tracking-wider transition-all shadow-lg"
              >
                Back to Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar + Main Content Area Layout */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Vertical Admin Sidebar Navigation (Not a horizontal sliding bar) */}
        <aside
          aria-label="Admin Features Sidebar"
          className="w-full lg:w-72 shrink-0 lg:sticky lg:top-24 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 p-4 sm:p-5 shadow-xs space-y-5"
        >
          <div className="px-2 pb-3 border-b border-[#631828]/15 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#631828] block">
                Atelier Control
              </span>
              <h2 className="font-serif-editorial text-xl font-bold text-[#1F181A]">
                Admin Features
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRefreshDashboardStats}
              disabled={refreshingStats}
              title="Refresh store statistics from PostgreSQL"
              className="p-2 rounded-xl bg-[#F7F3EB] hover:bg-[#631828] text-[#631828] hover:text-[#F7F3EB] border border-[#631828]/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-1.5">
            {[
              {
                id: 'overview',
                label: 'Overview',
                badge: null,
                icon: LayoutDashboard,
              },
              {
                id: 'revenue',
                label: 'Revenue',
                badge: `Rs. ${effectiveTotalRevenuePkr.toLocaleString()}`,
                icon: TrendingUp,
              },
              {
                id: 'orders',
                label: 'Orders',
                badge: String(effectiveTotalOrders),
                icon: ShoppingCart,
              },
              {
                id: 'products',
                label: 'Products',
                badge: String(products.length),
                icon: Package,
              },
              {
                id: 'subcategories',
                label: 'Categories & Subcategories',
                badge: String(categories.length + subcategories.length),
                icon: Layers,
              },
              {
                id: 'banners',
                label: 'Banners',
                badge: String(banners.length),
                icon: ImageIcon,
              },
              {
                id: 'restock',
                label: 'Restock Alerts',
                badge: String(restockNotifications.filter((r) => r.status === 'pending').length),
                icon: Bell,
              },
              {
                id: 'coupons',
                label: 'Coupons',
                badge: String(coupons.length),
                icon: Tag,
              },
              {
                id: 'users',
                label: 'Users & Roles',
                badge: String(users.length),
                icon: Users,
              },
              {
                id: 'faq',
                label: 'FAQ Manager',
                badge: String(faqItems.length),
                icon: HelpCircle,
              },
              {
                id: 'settings',
                label: 'Settings & Footer',
                badge: null,
                icon: Settings,
              },
              {
                id: 'database',
                label: 'Database',
                badge: dbStatus?.connected ? 'LIVE' : null,
                icon: Database,
              },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as AdminTab)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition-all ${
                    active
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB]/70 text-[#1F181A] hover:bg-[#F7F3EB] hover:text-[#631828] border border-transparent hover:border-[#631828]/20'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-[#C5A06E]' : 'text-[#631828]'
                      }`}
                    />
                    <span className="truncate">{t.label}</span>
                  </span>
                  {t.badge !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-lg font-mono-code text-[10px] font-bold shrink-0 ${
                        active
                          ? 'bg-[#1F181A]/40 text-[#C5A06E]'
                          : 'bg-[#EFE9DC] text-[#631828]'
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Live Aggregated Store Statistics Snapshot */}
          <div className="p-4 rounded-2xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A06E]">
                Live DB Store Stats
              </span>
              <span className="text-[10px] font-mono-code text-emerald-400">PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#E5DCCB]/80">Net Revenue:</span>
              <span className="font-mono-code font-bold text-[#C5A06E]">
                Rs. {effectiveTotalRevenuePkr.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#E5DCCB]/80">Total Orders:</span>
              <span className="font-mono-code font-semibold">{effectiveTotalOrders}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#E5DCCB]/80">P / C / D:</span>
              <span className="font-mono-code">
                {effectivePendingCount}P · {effectiveConfirmedCount}C · {effectiveDeliveredCount}D
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#E5DCCB]/80">Low Stock (&lt;{LOW_STOCK_THRESHOLD}):</span>
              <span className="font-mono-code font-bold text-red-300">
                {effectiveLowStockCount} items
              </span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <div className="flex-1 w-full min-w-0">
        {/* ===================================================================
            TAB 1 & REVENUE TAB: EXECUTIVE OVERVIEW & REVENUE ANALYTICS
           =================================================================== */}
        {(activeTab === 'overview' || activeTab === 'revenue') && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* 5 Professional Ecommerce KPI Cards (Calculated from real PostgreSQL records) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Revenue */}
              <div className="foner-card-lift p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#66585B]">
                    Revenue
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#631828]" />
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#631828] mt-2.5">
                  <AnimatedPrice value={effectiveTotalRevenuePkr} prefix="PKR " />
                </p>
                <p className="text-[11px] text-[#66585B] mt-1">
                  Excludes {effectiveCancelledCount} cancelled (PKR{' '}
                  {effectiveExcludedCancelledPkr.toLocaleString()})
                </p>
              </div>

              {/* 2. Orders */}
              <div className="foner-card-lift p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#66585B]">
                    Orders
                  </span>
                  <ShoppingCart className="w-4 h-4 text-[#631828]" />
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#1F181A] mt-2.5">
                  {effectiveValidOrdersCount.toLocaleString()}
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-amber-900/15 text-amber-950">
                    {effectivePendingCount}P
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#631828]/15 text-[#631828]">
                    {effectiveConfirmedCount}C
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-900/15 text-emerald-900">
                    {effectiveDeliveredCount}D
                  </span>
                </div>
              </div>

              {/* 3. Customers */}
              <div className="foner-card-lift p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#66585B]">
                    Customers
                  </span>
                  <Users className="w-4 h-4 text-[#631828]" />
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#1F181A] mt-2.5">
                  {effectiveCustomersCount.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#66585B] mt-1">
                  {users.length} total accounts ({adminCount} Admins)
                </p>
              </div>

              {/* 4. Products Sold */}
              <div className="foner-card-lift p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#66585B]">
                    Products Sold
                  </span>
                  <Package className="w-4 h-4 text-[#631828]" />
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#1F181A] mt-2.5">
                  {effectiveProductsSoldCount.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#66585B] mt-1">
                  Units sold across {products.length} catalog SKUs
                </p>
              </div>

              {/* 5. Average Order Value */}
              <div className="foner-card-lift p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#66585B]">
                    Average Order Value
                  </span>
                  <Award className="w-4 h-4 text-[#631828]" />
                </div>
                <p className="font-mono-code text-2xl font-bold text-[#631828] mt-2.5">
                  <AnimatedPrice value={effectiveAvgOrderValuePkr} prefix="PKR " />
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-[#66585B]">
                  <span>Completed: PKR {effectiveCompletedRevenuePkr.toLocaleString()}</span>
                  {effectiveLowStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStockFilter('low');
                        setActiveTab('products');
                      }}
                      className="text-red-900 font-bold hover:underline"
                    >
                      {effectiveLowStockCount} Low
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Low Stock Products Alert List (Stock < 3) with Direct Edit Links */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#631828]/15 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-900">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Inventory Replenishment Watchlist</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-code">Stock &lt; {LOW_STOCK_THRESHOLD} units</span>
                  </div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A] mt-1">
                    Low Stock Products ({lowStockProducts.length})
                  </h3>
                  <p className="text-xs text-[#66585B] mt-0.5">
                    Products with fewer than {LOW_STOCK_THRESHOLD} units remaining in PostgreSQL inventory. Click Edit Product Details to update stock or product information.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setStockFilter('low');
                      setActiveTab('products');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#F7F3EB] hover:bg-[#631828] text-[#631828] hover:text-[#F7F3EB] border border-[#631828]/25 text-xs font-semibold transition-colors"
                  >
                    Filter in Products Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditProduct()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-800 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1F181A]">
                        All catalog items have {LOW_STOCK_THRESHOLD} or more units in stock
                      </p>
                      <p className="text-xs text-[#66585B]">
                        No products currently fall below the {LOW_STOCK_THRESHOLD}-unit threshold.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStockFilter('all');
                      setActiveTab('products');
                    }}
                    className="text-xs font-semibold text-[#631828] hover:underline"
                  >
                    View Full Catalog →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#631828]/10 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 overflow-hidden">
                  {lowStockProducts.map((product) => {
                    const isOutOfStock = Number(product.stock ?? 0) <= 0;
                    const pendingWaitlistCount = restockNotifications.filter(
                      (r) => r.product_id === product.id && r.status === 'pending'
                    ).length;

                    return (
                      <div
                        key={product.id}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#EFE9DC]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.title}
                            className="w-14 h-16 rounded-xl object-cover border border-[#631828]/20 shrink-0 bg-[#1F181A]"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#66585B]">
                              <span className="font-mono-code font-bold text-[#631828]">
                                {product.sku}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{product.category_slug.replace(/-/g, ' ')}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-code font-semibold text-[#1F181A]">
                                Rs. {Number(product.price_pkr || 0).toLocaleString()}
                              </span>
                            </div>

                            <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] truncate">
                              {product.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                              <span
                                className={`font-mono-code font-bold ${
                                  isOutOfStock ? 'text-red-900' : 'text-amber-900'
                                }`}
                              >
                                {isOutOfStock
                                  ? '0 units remaining (Out of Stock)'
                                  : `${product.stock} ${product.stock === 1 ? 'unit' : 'units'} remaining`}
                              </span>
                              {pendingWaitlistCount > 0 && (
                                <>
                                  <span aria-hidden="true" className="text-[#66585B]">
                                    ·
                                  </span>
                                  <span className="text-[#631828] font-medium">
                                    {pendingWaitlistCount} restock alert{' '}
                                    {pendingWaitlistCount === 1 ? 'request' : 'requests'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Product Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStockFilter('low');
                              setActiveTab('products');
                              openEditProduct(product);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] hover:bg-[#631828]/15 text-[#631828] border border-[#631828]/20 text-xs font-semibold transition-colors"
                          >
                            <span>Open in Products</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Consolidated Order Counts by Status Strip */}
            <div className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#631828]">
                  Consolidated Order Counts by Status (PostgreSQL)
                </span>
                <span className="text-xs text-[#66585B] font-mono-code">
                  Total Orders: {effectiveTotalOrders} • Low Stock Products (&lt;{LOW_STOCK_THRESHOLD}):{' '}
                  {effectiveLowStockCount}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: 'Pending',
                    count: effectivePendingCount,
                    status: 'pending',
                    tone: 'bg-amber-900/10 border-amber-800/25 text-amber-950',
                  },
                  {
                    label: 'Confirmed',
                    count: effectiveConfirmedCount,
                    status: 'confirmed',
                    tone: 'bg-[#631828]/10 border-[#631828]/25 text-[#631828]',
                  },
                  {
                    label: 'Processing',
                    count: effectiveProcessingCount,
                    status: 'processing',
                    tone: 'bg-[#1F181A]/10 border-[#1F181A]/20 text-[#1F181A]',
                  },
                  {
                    label: 'Shipped',
                    count: effectiveShippedCount,
                    status: 'shipped',
                    tone: 'bg-sky-900/10 border-sky-800/25 text-sky-950',
                  },
                  {
                    label: 'Delivered',
                    count: effectiveDeliveredCount,
                    status: 'delivered',
                    tone: 'bg-emerald-900/10 border-emerald-800/25 text-emerald-900',
                  },
                  {
                    label: 'Cancelled',
                    count: effectiveCancelledCount,
                    status: 'cancelled',
                    tone: 'bg-red-900/10 border-red-800/25 text-red-900',
                  },
                ].map((s) => (
                  <button
                    key={s.status}
                    type="button"
                    onClick={() => {
                      setOrderStatusFilter(s.status);
                      setActiveTab('orders');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-transform hover:-translate-y-0.5 ${s.tone}`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                      {s.label}
                    </span>
                    <span className="font-mono-code text-2xl font-bold mt-1 block">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ===============================================================
                RECHARTS REVENUE ANALYTICS (POSTGRESQL ORDERS, EXCL. CANCELLED)
               =============================================================== */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#631828]/15 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#631828]">
                    <TrendingUp className="w-4 h-4" />
                    <span>PostgreSQL Order Revenue Analytics</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#66585B] font-normal">
                      Cancelled orders excluded from revenue
                    </span>
                  </div>
                  <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A] mt-1">
                    Revenue Over Time (
                    {revenueRange === '7d'
                      ? 'Last 7 Days'
                      : revenueRange === '30d'
                      ? 'Last 30 Days'
                      : revenueRange === '3m'
                      ? 'Last 3 Months'
                      : revenueRange === '6m'
                      ? 'Last 6 Months'
                      : 'Last 1 Year'}
                    )
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Range Filter Controls: 7 Days, 30 Days, 3 Months, 6 Months, 1 Year */}
                  <div
                    role="group"
                    aria-label="Filter revenue by date range"
                    className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/20"
                  >
                    {(
                      [
                        { id: '7d', label: '7 Days' },
                        { id: '30d', label: '30 Days' },
                        { id: '3m', label: '3 Months' },
                        { id: '6m', label: '6 Months' },
                        { id: '1y', label: '1 Year' },
                      ] as const
                    ).map((opt) => {
                      const active = revenueRange === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRevenueRange(opt.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                              : 'text-[#66585B] hover:text-[#1F181A]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Chart Mode Toggle: Area / Bar */}
                  <div
                    role="group"
                    aria-label="Select chart visualization style"
                    className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/20"
                  >
                    {(
                      [
                        { id: 'area', label: 'Area' },
                        { id: 'bar', label: 'Bar' },
                      ] as const
                    ).map((mode) => {
                      const active = revenueChartMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setRevenueChartMode(mode.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[#1F181A] text-[#C5A06E]'
                              : 'text-[#66585B] hover:text-[#1F181A]'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Range Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15">
                  <span className="text-xs text-[#66585B] block">
                    Net Revenue ({revenueRange === '7d' ? '7 Days' : revenueRange === '30d' ? '30 Days' : '3 Months'})
                  </span>
                  <span className="font-mono-code text-2xl font-bold text-[#631828] mt-1 block">
                    Rs. {revenueAnalytics.netRevenuePkr.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15">
                  <span className="text-xs text-[#66585B] block">Valid Orders in Range</span>
                  <span className="font-mono-code text-2xl font-bold text-[#1F181A] mt-1 block">
                    {revenueAnalytics.validOrdersCount}{' '}
                    <span className="text-xs font-normal text-[#66585B]">
                      {revenueAnalytics.validOrdersCount === 1 ? 'order' : 'orders'}
                    </span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15">
                  <span className="text-xs text-[#66585B] block">Average Order Value</span>
                  <span className="font-mono-code text-2xl font-bold text-[#1F181A] mt-1 block">
                    Rs. {revenueAnalytics.avgOrderValuePkr.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15">
                  <span className="text-xs text-[#66585B] block">Cancelled Excluded</span>
                  <span className="font-mono-code text-lg font-bold text-red-900 mt-1 block">
                    {revenueAnalytics.cancelledOrdersCount} cancelled · Rs.{' '}
                    {revenueAnalytics.excludedCancelledPkr.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Recharts Canvas */}
              <div className="w-full h-[340px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {revenueChartMode === 'area' ? (
                    <AreaChart
                      data={revenueAnalytics.buckets}
                      margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="fonerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#631828" stopOpacity={0.42} />
                          <stop offset="95%" stopColor="#631828" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#631828" strokeOpacity={0.12} />
                      <XAxis
                        dataKey="label"
                        stroke="#66585B"
                        tick={{ fill: '#66585B', fontSize: 11 }}
                        tickLine={false}
                        minTickGap={16}
                      />
                      <YAxis
                        stroke="#66585B"
                        tick={{ fill: '#66585B', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val: number) =>
                          val >= 1000 ? `Rs. ${Math.round(val / 1000)}k` : `Rs. ${val}`
                        }
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const pt = payload[0].payload;
                          return (
                            <div className="p-3.5 rounded-2xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/40 shadow-xl text-xs space-y-1.5">
                              <p className="font-semibold text-[#C5A06E]">{pt.tooltipDate}</p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#E5DCCB]">Net Revenue:</span>
                                <span className="font-mono-code font-bold text-[#F7F3EB]">
                                  Rs. {Number(pt.revenue_pkr || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#E5DCCB]">Valid Orders:</span>
                                <span className="font-mono-code font-semibold">
                                  {pt.valid_orders}
                                </span>
                              </div>
                              {pt.cancelled_orders > 0 && (
                                <div className="flex items-center justify-between gap-4 text-red-300 pt-1 border-t border-white/10">
                                  <span>Cancelled (Excluded):</span>
                                  <span className="font-mono-code">
                                    {pt.cancelled_orders} (Rs.{' '}
                                    {Number(pt.cancelled_pkr || 0).toLocaleString()})
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue_pkr"
                        name="Net Revenue (PKR)"
                        stroke="#631828"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#fonerRevenueFill)"
                        activeDot={{ r: 5, fill: '#631828', stroke: '#F7F3EB', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={revenueAnalytics.buckets}
                      margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#631828" strokeOpacity={0.12} />
                      <XAxis
                        dataKey="label"
                        stroke="#66585B"
                        tick={{ fill: '#66585B', fontSize: 11 }}
                        tickLine={false}
                        minTickGap={16}
                      />
                      <YAxis
                        stroke="#66585B"
                        tick={{ fill: '#66585B', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val: number) =>
                          val >= 1000 ? `Rs. ${Math.round(val / 1000)}k` : `Rs. ${val}`
                        }
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const pt = payload[0].payload;
                          return (
                            <div className="p-3.5 rounded-2xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/40 shadow-xl text-xs space-y-1.5">
                              <p className="font-semibold text-[#C5A06E]">{pt.tooltipDate}</p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#E5DCCB]">Net Revenue:</span>
                                <span className="font-mono-code font-bold text-[#F7F3EB]">
                                  Rs. {Number(pt.revenue_pkr || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[#E5DCCB]">Valid Orders:</span>
                                <span className="font-mono-code font-semibold">
                                  {pt.valid_orders}
                                </span>
                              </div>
                              {pt.cancelled_orders > 0 && (
                                <div className="flex items-center justify-between gap-4 text-red-300 pt-1 border-t border-white/10">
                                  <span>Cancelled (Excluded):</span>
                                  <span className="font-mono-code">
                                    {pt.cancelled_orders} (Rs.{' '}
                                    {Number(pt.cancelled_pkr || 0).toLocaleString()})
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="revenue_pkr"
                        name="Net Revenue (PKR)"
                        fill="#631828"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===============================================================
                3. ORDERS OVER TIME CHART (SEPARATE CHART WITH RANGE SELECTOR)
               =============================================================== */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#631828]/15 pb-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#631828]">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Order Volume Telemetry</span>
                  </div>
                  <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A] mt-1">
                    Orders Over Time (
                    {ordersRange === '7d'
                      ? 'Last 7 Days'
                      : ordersRange === '30d'
                      ? 'Last 30 Days'
                      : ordersRange === '3m'
                      ? 'Last 3 Months'
                      : ordersRange === '6m'
                      ? 'Last 6 Months'
                      : 'Last 1 Year'}
                    )
                  </h2>
                </div>

                <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/20">
                  {(
                    [
                      { id: '7d', label: '7 Days' },
                      { id: '30d', label: '30 Days' },
                      { id: '3m', label: '3 Months' },
                      { id: '6m', label: '6 Months' },
                      { id: '1y', label: '1 Year' },
                    ] as const
                  ).map((opt) => {
                    const active = ordersRange === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOrdersRange(opt.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          active
                            ? 'bg-[#1F181A] text-[#C5A06E] shadow-xs'
                            : 'text-[#66585B] hover:text-[#1F181A]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-full h-[280px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ordersAnalytics.buckets}
                    margin={{ top: 12, right: 18, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#631828" strokeOpacity={0.12} />
                    <XAxis
                      dataKey="label"
                      stroke="#66585B"
                      tick={{ fill: '#66585B', fontSize: 11 }}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      stroke="#66585B"
                      allowDecimals={false}
                      tick={{ fill: '#66585B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const pt = payload[0].payload;
                        return (
                          <div className="p-3.5 rounded-2xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/40 shadow-xl text-xs space-y-1.5">
                            <p className="font-semibold text-[#C5A06E]">{pt.tooltipDate}</p>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[#E5DCCB]">Orders:</span>
                              <span className="font-mono-code font-bold text-[#F7F3EB]">
                                {pt.valid_orders}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[#E5DCCB]">Revenue:</span>
                              <span className="font-mono-code font-semibold text-[#C5A06E]">
                                PKR {Number(pt.revenue_pkr || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="valid_orders"
                      name="Orders"
                      fill="#1F181A"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===============================================================
                4. TOP-SELLING PRODUCTS & 5. BEST-PERFORMING CATEGORIES
               =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Top Selling Products */}
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono-code uppercase tracking-widest text-[#631828] font-bold">
                      Ranked by Actual Quantity Sold
                    </span>
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Top Selling Products
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#F7F3EB] border border-[#631828]/20 font-mono-code text-xs font-bold text-[#631828]">
                    {topSellingProducts.length} Products
                  </span>
                </div>

                {topSellingProducts.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 text-center text-xs text-[#66585B]">
                    No product sales recorded in non-cancelled orders yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#631828]/15 bg-[#F7F3EB]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#631828]/15 bg-[#E5DCCB]/60 text-[10px] font-bold uppercase tracking-wider text-[#66585B]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-3 text-right">Units Sold</th>
                          <th className="py-3 px-4 text-right">Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#631828]/10">
                        {topSellingProducts.map((tp, idx) => (
                          <tr key={`${tp.product_id}-${idx}`} className="hover:bg-[#EFE9DC]/60">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                {tp.image_url ? (
                                  <img
                                    src={resolveImageUrl(tp.image_url)}
                                    alt={tp.title}
                                    className="w-10 h-12 rounded-lg object-cover border border-[#631828]/20 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-12 rounded-lg bg-[#E5DCCB] border border-[#631828]/20 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-[#1F181A] truncate">{tp.title}</p>
                                  <p className="text-[10px] font-mono-code text-[#66585B]">
                                    {tp.sku ? `SKU: ${tp.sku} • ` : ''}
                                    {tp.category_slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono-code font-bold text-[#1F181A]">
                              {tp.units_sold.toLocaleString()} {tp.units_sold === 1 ? 'unit' : 'units'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-code font-bold text-[#631828]">
                              PKR {tp.revenue_pkr.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Best-Performing Categories */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] font-mono-code uppercase tracking-widest text-[#631828] font-bold">
                    Real Category Sales Breakdown
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Best-Performing Categories
                  </h3>
                </div>

                {categoryPerformance.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 text-center text-xs text-[#66585B]">
                    No category sales recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryPerformance.map((cp, idx) => {
                      const maxCatRev = Math.max(
                        ...categoryPerformance.map((c) => c.revenue_pkr),
                        1
                      );
                      const pct = Math.max(8, Math.round((cp.revenue_pkr / maxCatRev) * 100));
                      return (
                        <div
                          key={cp.category_slug}
                          className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#631828] text-[#F7F3EB] font-mono-code text-[10px] font-bold">
                                #{idx + 1}
                              </span>
                              <span className="font-serif-editorial text-base font-bold text-[#1F181A]">
                                {cp.category_name}
                              </span>
                            </div>
                            <span className="font-mono-code text-xs font-bold text-[#631828]">
                              PKR {cp.revenue_pkr.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#EFE9DC] overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-[#631828] to-[#C5A06E]"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#66585B] font-mono-code">
                            <span>{cp.products_sold} products sold</span>
                            <span>{cp.orders_count} order items</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Order Revenue Ledger (Displayed on Revenue Tab & Overview) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    PostgreSQL Order Revenue Ledger
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Live order-level revenue breakdown — cancelled orders are explicitly excluded from store revenue totals
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-colors self-start sm:self-auto"
                >
                  Manage Orders ({effectiveTotalOrders})
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#631828]/15 text-[11px] font-bold uppercase tracking-wider text-[#66585B]">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Customer &amp; City</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Order Total</th>
                      <th className="py-3 px-4 text-right">Net Revenue Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#631828]/10">
                    {orders.slice(0, activeTab === 'revenue' ? orders.length : 6).map((o) => {
                      const isCancelled =
                        String(o.order_status || o.status || '').toLowerCase() === 'cancelled';
                      return (
                        <tr
                          key={o.id}
                          className={`transition-colors ${
                            isCancelled ? 'bg-red-950/[0.05] text-[#66585B]' : 'hover:bg-[#F7F3EB]/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono-code font-bold text-[#631828]">
                            {o.order_number}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#1F181A] block">
                              {o.customer_name}
                            </span>
                            <span className="text-[11px] text-[#66585B]">{o.shipping_city}</span>
                          </td>
                          <td className="py-3 px-4 font-mono-code text-[11px] text-[#66585B]">
                            {new Date(o.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCancelled
                                  ? 'bg-red-900/15 text-red-900'
                                  : o.order_status === 'delivered'
                                  ? 'bg-emerald-900/15 text-emerald-900'
                                  : o.order_status === 'confirmed'
                                  ? 'bg-[#631828]/15 text-[#631828]'
                                  : 'bg-amber-900/15 text-amber-950'
                              }`}
                            >
                              {o.order_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 uppercase font-mono-code text-[11px]">
                            {o.payment_method} ({o.payment_status})
                          </td>
                          <td className="py-3 px-4 text-right font-mono-code">
                            Rs. {Number(o.total_pkr || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-code font-bold">
                            {isCancelled ? (
                              <span className="text-red-900">Rs. 0 (Excluded)</span>
                            ) : (
                              <span className="text-emerald-900">
                                +Rs. {Number(o.total_pkr || 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Action Shortcut Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-[#631828] text-[#F7F3EB] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A06E] font-bold">
                    Responsive Campaign Studio
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-bold mt-1">
                    Desktop &amp; Mobile Hero Banners
                  </h3>
                  <p className="text-xs text-[#E5DCCB] mt-2 leading-relaxed">
                    Configure dedicated widescreen desktop banners and vertical portrait mobile banners with real-time device preview.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('banners')}
                  className="mt-5 w-full py-3 rounded-xl bg-[#F7F3EB] text-[#631828] text-xs font-bold uppercase tracking-wider hover:bg-[#C5A06E] hover:text-[#1F181A] transition-colors"
                >
                  Manage Desktop &amp; Mobile Banners
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#631828] font-bold">
                    Role-Based Access Control
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A] mt-1">
                    Modify Users &amp; Promote to Admin
                  </h3>
                  <p className="text-xs text-[#66585B] mt-2 leading-relaxed">
                    Edit any user profile, update contact details, or promote any customer to Admin or Manager with a single click.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('users')}
                  className="mt-5 w-full py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider hover:bg-[#430F1B] transition-colors"
                >
                  Open User &amp; Role Manager
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#631828] font-bold">
                    PostgreSQL Auto-Migration Engine
                  </span>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A] mt-1">
                    Auto-Created Tables &amp; Schema
                  </h3>
                  <p className="text-xs text-[#66585B] mt-2 leading-relaxed">
                    Whenever you connect a fresh PostgreSQL database, Foner automatically creates all 9 tables and seeds initial data if empty.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('database')}
                  className="mt-5 w-full py-3 rounded-xl bg-[#1F181A] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider hover:bg-[#631828] transition-colors"
                >
                  Inspect PostgreSQL Schema
                </button>
              </div>
            </div>

            {/* Recent Audit Logs & Activity */}
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
              <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A] mb-4">
                Live PostgreSQL Activity &amp; Audit Trail
              </h3>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#631828] text-[#F7F3EB] font-mono-code text-[10px] font-bold">
                        {log.action}
                      </span>
                      <span className="font-semibold text-[#1F181A]">{log.details}</span>
                    </div>
                    <span className="text-[11px] text-[#66585B] font-mono-code">
                      {log.actor_name} ({log.actor_role})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 2: DYNAMIC BANNERS STUDIO (SEPARATE DESKTOP & MOBILE BANNERS)
           =================================================================== */}
        {activeTab === 'banners' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left: Banner Editor Form with Separate Desktop & Mobile Previews */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 h-fit">
              <div className="flex items-center justify-between pb-4 border-b border-[#631828]/15">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {editingBanner ? `Edit Banner #${editingBanner.id}` : 'Add Dynamic Hero Banner'}
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Configure separate Desktop (16:9) &amp; Mobile (9:16) visuals
                  </p>
                </div>
                {editingBanner && (
                  <button
                    onClick={resetBannerForm}
                    className="text-xs font-semibold text-[#631828] underline"
                  >
                    + New Banner
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveBanner} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">Banner Headline *</label>
                  <input
                    type="text"
                    required
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    placeholder="e.g. The Oxblood & Travertine Reserve"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">Editorial Subtitle *</label>
                  <textarea
                    rows={2}
                    required
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    placeholder="Architectural wool tailoring meets warm oat cashmere..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={bannerForm.badge_text}
                      onChange={(e) => setBannerForm({ ...bannerForm, badge_text: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Target Device</label>
                    <select
                      value={bannerForm.device_target}
                      onChange={(e) =>
                        setBannerForm({
                          ...bannerForm,
                          device_target: e.target.value as 'both' | 'desktop' | 'mobile',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    >
                      <option value="both">Both (Desktop + Mobile Separate)</option>
                      <option value="desktop">Desktop Only</option>
                      <option value="mobile">Mobile Only</option>
                    </select>
                  </div>
                </div>

                {/* DESKTOP BANNER UPLOAD FROM COMPUTER */}
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#631828]">
                      <Monitor className="w-4 h-4" />
                      Desktop Banner (16:9) *
                    </label>
                    {bannerForm.desktop_image_url && (
                      <span className="text-[10px] font-bold uppercase text-emerald-900 bg-emerald-900/15 px-2 py-0.5 rounded-full">
                        Image Ready
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingDesktopBanner
                          ? 'Uploading...'
                          : bannerForm.desktop_image_url
                          ? 'Replace Desktop Image from Computer'
                          : 'Choose Desktop Image from Computer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadDesktopBannerImage}
                        disabled={uploadingDesktopBanner}
                        className="hidden"
                      />
                    </label>
                    {bannerForm.desktop_image_url && (
                      <button
                        type="button"
                        onClick={() => setBannerForm((prev) => ({ ...prev, desktop_image_url: '' }))}
                        className="px-3 py-2 rounded-xl bg-[#EFE9DC] hover:bg-red-900 text-red-900 hover:text-white text-[11px] font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* MOBILE BANNER UPLOAD FROM COMPUTER */}
                <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#631828]">
                      <Smartphone className="w-4 h-4" />
                      Mobile Banner (9:16) *
                    </label>
                    {bannerForm.mobile_image_url && (
                      <span className="text-[10px] font-bold uppercase text-emerald-900 bg-emerald-900/15 px-2 py-0.5 rounded-full">
                        Image Ready
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingMobileBanner
                          ? 'Uploading...'
                          : bannerForm.mobile_image_url
                          ? 'Replace Mobile Image from Computer'
                          : 'Choose Mobile Image from Computer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadMobileBannerImage}
                        disabled={uploadingMobileBanner}
                        className="hidden"
                      />
                    </label>
                    {bannerForm.mobile_image_url && (
                      <button
                        type="button"
                        onClick={() => setBannerForm((prev) => ({ ...prev, mobile_image_url: '' }))}
                        className="px-3 py-2 rounded-xl bg-[#EFE9DC] hover:bg-red-900 text-red-900 hover:text-white text-[11px] font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Dual Preview (Desktop 16:9 + Mobile 9:16) */}
                <div className="grid grid-cols-12 gap-3 items-center bg-[#F7F3EB] p-3 rounded-2xl border border-[#631828]/15">
                  <div className="col-span-8">
                    <p className="text-[10px] uppercase font-bold text-[#66585B] mb-1">Desktop Preview (16:9)</p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-[#1F181A] border border-[#631828]/20 relative flex items-center justify-center">
                      {bannerForm.desktop_image_url ? (
                        <>
                          <img
                            src={resolveImageUrl(bannerForm.desktop_image_url)}
                            alt="Desktop preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35 flex items-end p-2.5">
                            <p className="text-[11px] font-serif-editorial text-[#F7F3EB] font-bold truncate">
                              {bannerForm.title || 'Desktop Headline'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] text-[#E5DCCB]/70 px-3 text-center">
                          No desktop image selected yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <p className="text-[10px] uppercase font-bold text-[#66585B] mb-1">Mobile (9:16)</p>
                    <div className="aspect-[9/16] max-h-32 mx-auto rounded-xl overflow-hidden bg-[#1F181A] border border-[#631828]/20 relative flex items-center justify-center">
                      {bannerForm.mobile_image_url ? (
                        <img
                          src={resolveImageUrl(bannerForm.mobile_image_url)}
                          alt="Mobile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#E5DCCB]/70 px-2 text-center">
                          No mobile image
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={bannerForm.cta_text}
                      onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Link Category</label>
                    <select
                      value={bannerForm.cta_link}
                      onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    >
                      <option value="all">All Collections</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F181A]">
                    <input
                      type="checkbox"
                      checked={bannerForm.is_active}
                      onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
                      className="rounded accent-[#631828]"
                    />
                    Active on Storefront Hero
                  </label>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                  >
                    {editingBanner ? 'Save Banner Changes' : 'Publish Banner'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Existing Dynamic Banners List */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                Active Storefront Banners ({banners.length})
              </h3>
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col sm:flex-row gap-5 items-center justify-between"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Desktop Thumb */}
                    <div className="relative w-36 h-24 rounded-2xl overflow-hidden border border-[#631828]/20 shrink-0">
                      <img src={resolveImageUrl(b.desktop_image_url)} alt={b.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono-code">
                        Desktop 16:9
                      </span>
                    </div>
                    {/* Mobile Thumb */}
                    <div className="relative w-16 h-24 rounded-2xl overflow-hidden border border-[#631828]/20 shrink-0">
                      <img src={resolveImageUrl(b.mobile_image_url)} alt={b.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-[#631828]/90 text-[8px] text-white font-mono-code">
                        Mob 9:16
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.is_active
                              ? 'bg-emerald-900/15 text-emerald-900'
                              : 'bg-neutral-400/20 text-neutral-600'
                          }`}
                        >
                          {b.is_active ? 'Active' : 'Hidden'}
                        </span>
                        <span className="text-[10px] font-mono-code uppercase text-[#631828] font-bold">
                          Target: {b.device_target}
                        </span>
                      </div>
                      <h4 className="font-serif-editorial text-xl font-bold text-[#1F181A] mt-1">{b.title}</h4>
                      <p className="text-xs text-[#66585B] line-clamp-2 mt-0.5">{b.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                      onClick={() => startEditBanner(b)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#F7F3EB] text-red-800 border border-red-800/20 text-xs font-semibold hover:bg-red-900 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 3: PRODUCTS & INVENTORY MANAGER
           =================================================================== */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#631828] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by title, SKU, or category..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/20">
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      stockFilter === 'all'
                        ? 'bg-[#631828] text-[#F7F3EB]'
                        : 'text-[#66585B] hover:text-[#1F181A]'
                    }`}
                  >
                    All Products ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter('low')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      stockFilter === 'low'
                        ? 'bg-red-900 text-[#F7F3EB]'
                        : 'text-red-900 hover:bg-red-900/10'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Low Stock &lt; {LOW_STOCK_THRESHOLD} ({lowStockCount})</span>
                  </button>
                </div>

                <button
                  onClick={() => openEditProduct()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>

            {/* Product Management Table */}
            <div className="rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#631828]/15 bg-[#E5DCCB]/60 text-[11px] font-bold uppercase tracking-wider text-[#66585B]">
                      <th className="py-3.5 px-5">Product</th>
                      <th className="py-3.5 px-4">SKU &amp; Category</th>
                      <th className="py-3.5 px-4">Price (PKR)</th>
                      <th className="py-3.5 px-4">Inventory &amp; Stock Alert</th>
                      <th className="py-3.5 px-4">Tags</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#631828]/10 text-xs">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[#66585B]">
                          No products match the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isOutOfStock = p.stock <= 0;
                        const isLowStock = p.stock < LOW_STOCK_THRESHOLD;

                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors ${
                              isLowStock
                                ? 'bg-red-950/[0.06] hover:bg-red-950/[0.1]'
                                : 'hover:bg-[#F7F3EB]/60'
                            }`}
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3.5">
                                <div className="relative shrink-0">
                                  <img
                                    src={resolveImageUrl(p.image_url)}
                                    alt={p.title}
                                    className={`w-14 h-16 rounded-xl object-cover border ${
                                      isLowStock ? 'border-red-800/50' : 'border-[#631828]/15'
                                    }`}
                                  />
                                  {isLowStock && (
                                    <span
                                      title={`Low stock: ${p.stock} units remaining`}
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-900 text-[#F7F3EB] flex items-center justify-center shadow-xs"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-semibold text-sm text-[#1F181A] truncate">
                                      {p.title}
                                    </h4>
                                    {isLowStock && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/15 border border-red-800/30 text-red-900 text-[10px] font-bold uppercase tracking-wider">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#66585B] truncate max-w-xs mt-0.5">
                                    Sizes: {p.sizes.join(', ')}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="font-mono-code text-xs font-bold text-[#631828] block">
                                {p.sku}
                              </span>
                              <span className="text-[11px] uppercase tracking-wider text-[#66585B]">
                                {p.category_slug}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <span className="font-mono-code text-sm font-bold text-[#631828] block">
                                Rs. {p.price_pkr.toLocaleString()}
                              </span>
                              {p.compare_at_price_pkr ? (
                                <span className="font-mono-code text-[11px] text-[#66585B] line-through">
                                  Rs. {p.compare_at_price_pkr.toLocaleString()}
                                </span>
                              ) : null}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`font-mono-code text-xs font-bold ${
                                    isLowStock ? 'text-red-900' : 'text-[#1F181A]'
                                  }`}
                                >
                                  {p.stock} {p.stock === 1 ? 'unit' : 'units'}
                                </span>

                                {isOutOfStock ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-900 text-[#F7F3EB] text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                                    <AlertTriangle className="w-3 h-3" />
                                    Out of Stock (0 left)
                                  </span>
                                ) : isLowStock ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900/15 border border-amber-800/35 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                                    <AlertTriangle className="w-3 h-3 text-red-800" />
                                    Low Stock (&lt; {LOW_STOCK_THRESHOLD} units)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/10 border border-emerald-800/20 text-emerald-900 text-[10px] font-semibold">
                                    In Stock
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {p.is_featured && (
                                  <span className="px-2 py-0.5 rounded bg-[#631828]/10 text-[#631828] text-[10px] font-semibold">
                                    Featured
                                  </span>
                                )}
                                {p.is_new_arrival && (
                                  <span className="px-2 py-0.5 rounded bg-[#1F181A]/10 text-[#1F181A] text-[10px] font-semibold">
                                    New
                                  </span>
                                )}
                                {p.is_bestseller && (
                                  <span className="px-2 py-0.5 rounded bg-[#C5A06E]/25 text-[#430F1B] text-[10px] font-semibold">
                                    Bestseller
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditProduct(p)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-semibold transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F7F3EB] hover:bg-red-900 text-red-800 hover:text-white border border-red-800/20 text-[11px] font-semibold transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 4: ORDERS & PKR FULFILLMENT
           =================================================================== */}
        {activeTab === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Orders Tab Revenue Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] block">
                  Total Net Revenue (Excl. Cancelled)
                </span>
                <span className="font-mono-code text-2xl font-bold text-[#631828] mt-1 block">
                  Rs. {effectiveTotalRevenuePkr.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#66585B]">
                  Across {effectiveValidOrdersCount} active/completed orders
                </span>
              </div>
              <div className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] block">
                  Delivered / Paid Revenue
                </span>
                <span className="font-mono-code text-2xl font-bold text-emerald-900 mt-1 block">
                  Rs. {effectiveCompletedRevenuePkr.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#66585B]">
                  {effectiveDeliveredCount} Delivered orders
                </span>
              </div>
              <div className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] block">
                  Pending &amp; Confirmed Revenue
                </span>
                <span className="font-mono-code text-2xl font-bold text-[#1F181A] mt-1 block">
                  Rs. {(effectivePendingRevenuePkr + effectiveConfirmedRevenuePkr).toLocaleString()}
                </span>
                <span className="text-[11px] text-[#66585B]">
                  {effectivePendingCount} Pending · {effectiveConfirmedCount} Confirmed
                </span>
              </div>
              <div className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] block">
                  Cancelled Orders (Excluded)
                </span>
                <span className="font-mono-code text-2xl font-bold text-red-900 mt-1 block">
                  Rs. {effectiveExcludedCancelledPkr.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#66585B]">
                  {effectiveCancelledCount} Cancelled orders excluded
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
              <div>
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Customer Orders &amp; PKR Dispatch
                </h3>
                <p className="text-xs text-[#66585B]">
                  All orders include fixed Rs. {settings.delivery_fee_pkr} nationwide delivery fee
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                      orderStatusFilter === st
                        ? 'bg-[#631828] text-[#F7F3EB]'
                        : 'bg-[#F7F3EB] text-[#66585B] hover:text-[#1F181A]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-xs font-bold">
                        {order.order_number}
                      </span>
                      <span className="font-semibold text-sm text-[#1F181A]">{order.customer_name}</span>
                      <span className="text-xs text-[#66585B] font-mono-code">{order.customer_phone}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F7F3EB] border border-[#631828]/20 text-xs font-semibold text-[#631828]">
                        {order.shipping_city}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#631828] block">
                        Delivery Address (Checkout Snapshot)
                      </span>
                      <p className="text-[#1F181A] font-semibold">
                        {order.shipping_address}
                        {order.shipping_area ? `, ${order.shipping_area}` : ''}
                        {', '}
                        {order.shipping_city || order.city}
                        {order.postal_code ? ` (${order.postal_code})` : ''}
                      </p>
                      <p className="text-[11px] text-[#66585B]">
                        Recipient: <span className="font-medium text-[#1F181A]">{order.customer_name}</span> • Phone:{' '}
                        <span className="font-mono-code font-medium text-[#1F181A]">{order.customer_phone}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.items_json.map((item, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/15 text-xs"
                        >
                          <img src={item.image_url} alt="" className="w-6 h-7 object-cover rounded" />
                          <span className="font-medium text-[#1F181A]">
                            {item.quantity}x {item.title} ({item.selected_size})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#631828]/15">
                    <div className="text-left lg:text-right">
                      <p className="text-[11px] text-[#66585B] font-mono-code">
                        Subtotal: Rs. {order.subtotal_pkr.toLocaleString()} + Delivery: Rs. {order.delivery_fee_pkr}
                      </p>
                      <p className="font-mono-code text-lg font-bold text-[#631828]">
                        Total: Rs. {order.total_pkr.toLocaleString()}
                      </p>
                      <p className="text-[11px] font-semibold uppercase text-[#1F181A]">
                        Method: {order.payment_method}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#66585B]">
                          Order Status {updatingOrderId === order.id && '• Updating...'}
                        </label>
                        <select
                          value={order.order_status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) =>
                            handleUpdateOrderStatus(
                              order,
                              e.target.value as OrderStatus,
                              order.payment_status as PaymentStatus
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs font-semibold text-[#1F181A] disabled:opacity-60 transition-opacity"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#66585B]">Payment Status</label>
                        <select
                          value={order.payment_status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) =>
                            handleUpdateOrderStatus(
                              order,
                              order.order_status as OrderStatus,
                              e.target.value as PaymentStatus
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs font-semibold text-[#1F181A] disabled:opacity-60 transition-opacity"
                        >
                          <option value="pending">Pending (PKR)</option>
                          <option value="paid">Paid (PKR)</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrintingInvoiceOrder(order)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        {updatingOrderId === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        Print Invoice
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 5: USERS & ROLE MANAGEMENT (MODIFY ANY USER & PROMOTE TO ADMIN)
           =================================================================== */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#631828]">
                  <Award className="w-4 h-4" />
                  Role-Based Access Control (RBAC)
                </div>
                <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A] mt-0.5">
                  Modify Any User &amp; Update Role to Admin
                </h3>
                <p className="text-xs text-[#66585B]">
                  Click "Make Admin" or use the Role selector on any user row to grant or modify administrative permissions immediately.
                </p>
              </div>

              <button
                onClick={() => openEditUserModal()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Create User / Admin
              </button>
            </div>

            {/* Role Change Confirmation Dialog */}
            {confirmRoleDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F181A]/60 backdrop-blur-sm p-4" onClick={() => setConfirmRoleDialog(null)}>
                <div className="w-full max-w-md p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="font-serif-editorial text-xl font-bold text-[#1F181A]">Remove administrator access?</h3>
                  <p className="text-xs text-[#66585B] leading-relaxed">This user will immediately lose access to the Admin Dashboard and admin APIs.</p>
                  <div className="bg-[#F7F3EB] rounded-xl p-3 text-xs space-y-1">
                    <p><strong>User:</strong> {confirmRoleDialog.user.email}</p>
                    <p><strong>Current role:</strong> Admin</p>
                    <p><strong>New role:</strong> Customer</p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setConfirmRoleDialog(null)} className="flex-1 py-2.5 rounded-xl bg-[#F7F3EB] text-[#631828] border border-[#631828]/25 text-xs font-bold uppercase tracking-wider">Cancel</button>
                    <button onClick={() => { doRoleUpdate(confirmRoleDialog.user, confirmRoleDialog.newRole); setConfirmRoleDialog(null); }} className="flex-1 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider">Remove Admin Access</button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#631828] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name, email, or city..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {['all', 'admin', 'manager', 'editor', 'customer'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                      roleFilter === r
                        ? 'bg-[#631828] text-[#F7F3EB]'
                        : 'bg-[#EFE9DC] text-[#66585B] hover:text-[#1F181A]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table / Cards */}
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        resolveImageUrl(u.avatar_url || '/favicon.svg')
                      }
                      alt={u.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#631828]/30 shrink-0"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-base text-[#1F181A]">{u.name}</h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-[#631828] text-[#F7F3EB]'
                              : u.role === 'manager'
                              ? 'bg-[#822337] text-[#F7F3EB]'
                              : 'bg-[#F7F3EB] text-[#631828] border border-[#631828]/25'
                          }`}
                        >
                          {u.role}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-900/15 text-emerald-900'
                              : 'bg-red-900/15 text-red-900'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#66585B] mt-0.5">
                        {u.email} • {u.phone || 'No phone'} • {u.city}
                      </p>
                      <p className="text-[11px] font-mono-code text-[#631828] mt-1">
                        Orders: {u.total_orders} • Lifetime Spend: Rs. {u.total_spent_pkr.toLocaleString()} • Loyalty Points:{' '}
                        {(u.loyalty_points || 0).toLocaleString()} pts
                      </p>
                    </div>
                  </div>

                  {/* Role Controls & Modify User Button */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-[#F7F3EB] px-3 py-1.5 rounded-xl border border-[#631828]/20">
                      <span className="text-[10px] uppercase font-bold text-[#66585B]">Role:</span>
                      <select
                        value={u.role}
                        onChange={(e) => handleQuickRoleChange(u, e.target.value as UserRole)}
                        className="bg-transparent text-xs font-bold text-[#631828] focus:outline-none uppercase"
                      >
                        <option value="customer">Customer</option>
                        <option value="editor">Editor</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {u.role !== 'admin' ? (
                      <button
                        onClick={() => handleQuickRoleChange(u, 'admin')}
                        className="px-3.5 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleQuickRoleChange(u, 'customer')}
                        className="px-3.5 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#E5DCCB] text-[#631828] border border-[#631828]/25 text-xs font-semibold"
                      >
                        Demote to Customer
                      </button>
                    )}

                    <button
                      onClick={() => openEditUserModal(u)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F181A] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#C5A06E]" />
                      Modify User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB: FAQ MANAGER (POSTGRESQL PERSISTED)
           =================================================================== */}
        {activeTab === 'faq' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-5 p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 h-fit space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#631828]/15">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {editingFaqId ? 'Edit FAQ Item' : 'Add New FAQ'}
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Changes save directly to PostgreSQL and appear on the /faq page
                  </p>
                </div>
                {editingFaqId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFaqId(null);
                      setFaqForm({ question: '', answer: '', category: 'Shipping & Delivery' });
                    }}
                    className="text-xs font-semibold text-[#631828] underline"
                  >
                    + New Question
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveFaqItem} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">Category</label>
                  <input
                    type="text"
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    placeholder="e.g. Shipping & Delivery, Sizing & Care"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">Question *</label>
                  <input
                    type="text"
                    required
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="Enter customer question..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">Answer *</label>
                  <textarea
                    rows={4}
                    required
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    placeholder="Provide clear, helpful answer..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs leading-relaxed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingFaq}
                  className="w-full py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
                >
                  {savingFaq ? 'Saving to PostgreSQL...' : editingFaqId ? 'Update FAQ Item' : 'Add FAQ Item'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Storefront FAQs ({faqItems.length})
                </h3>
                <span className="text-xs font-mono-code text-[#631828] font-bold">
                  PostgreSQL Persisted
                </span>
              </div>
              {faqItems.length === 0 ? (
                <div className="p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 text-center text-xs text-[#66585B]">
                  No FAQ items yet. Add your first question on the left.
                </div>
              ) : (
                <div className="space-y-3">
                  {faqItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#631828]/10 text-[#631828] text-[10px] font-bold uppercase">
                            {item.category || 'General'}
                          </span>
                          <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] mt-1">
                            {item.question}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveFaqItem(idx, -1)}
                            disabled={idx === 0 || savingFaq}
                            title="Move Up"
                            className="p-1.5 rounded-lg bg-[#F7F3EB] text-[#1F181A] hover:bg-[#631828] hover:text-[#F7F3EB] disabled:opacity-35"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFaqItem(idx, 1)}
                            disabled={idx === faqItems.length - 1 || savingFaq}
                            title="Move Down"
                            className="p-1.5 rounded-lg bg-[#F7F3EB] text-[#1F181A] hover:bg-[#631828] hover:text-[#F7F3EB] disabled:opacity-35"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditFaqItem(item)}
                            className="px-3 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-[11px] font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaqItem(item.id)}
                            className="p-1.5 rounded-xl bg-[#F7F3EB] text-red-800 hover:bg-red-900 hover:text-white border border-red-800/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#66585B] leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 6: SETTINGS → FOOTER SETTINGS, INFORMATIONAL PAGES & STORE CONFIG
           =================================================================== */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Sub-navigation bar inside Settings */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#631828] block">
                  PostgreSQL Storefront &amp; Footer Control
                </span>
                <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                  Settings &amp; Footer Management
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSettingsSubSection('footer')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    settingsSubSection === 'footer'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Footer Settings
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubSection('pages')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    settingsSubSection === 'pages'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Footer / Pages Content
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubSection('general')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    settingsSubSection === 'general'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Store &amp; Coupons
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubSection('security')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    settingsSubSection === 'security'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Security &amp; Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubSection('diagnostics')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    settingsSubSection === 'diagnostics'
                      ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                      : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  System Diagnostics
                </button>
              </div>
            </div>

            {/* COMBINED SYSTEM STATUS CARD (REAL LIVE POSTGRESQL & BACKEND CONNECTION STATUS) */}
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#631828]/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#631828] block">
                    Live System Telemetry
                  </span>
                  <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    System Diagnostics
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleRunFullDiagnostics}
                  disabled={diagBackend.loading || diagDatabase.loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagBackend.loading || diagDatabase.loading ? 'animate-spin' : ''}`} />
                  Run Full Diagnostics
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Backend Status */}
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] mb-1">
                      Backend
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          diagBackend.tested
                            ? diagBackend.connected
                              ? 'bg-emerald-600'
                              : 'bg-rose-600 animate-pulse'
                            : 'bg-neutral-400'
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          diagBackend.tested
                            ? diagBackend.connected
                              ? 'text-emerald-800'
                              : 'text-rose-800'
                            : 'text-[#66585B]'
                        }`}
                      >
                        {diagBackend.tested
                          ? diagBackend.connected
                            ? '● Connected'
                            : '● Not Connected'
                          : '● Not Tested'}
                      </span>
                    </div>
                    {diagBackend.latencyMs !== undefined && (
                      <span className="block text-[10px] text-[#66585B] mt-1 font-mono-code">
                        Latency: {diagBackend.latencyMs}ms (GET /api/health)
                      </span>
                    )}
                    {diagBackend.error && (
                      <div className="mt-1 text-[10px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 leading-tight">
                        {diagBackend.error}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleTestBackend}
                    disabled={diagBackend.loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#EFE9DC] hover:bg-[#E5DCCB] border border-[#631828]/25 text-[#631828] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {diagBackend.loading ? 'Testing Backend...' : 'Test Backend Connection'}
                  </button>
                </div>

                {/* 2. Database Status */}
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] mb-1">
                      Database
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          diagDatabase.tested
                            ? diagDatabase.connected
                              ? 'bg-emerald-600'
                              : 'bg-rose-600 animate-pulse'
                            : 'bg-neutral-400'
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          diagDatabase.tested
                            ? diagDatabase.connected
                              ? 'text-emerald-800'
                              : 'text-rose-800'
                            : 'text-[#66585B]'
                        }`}
                      >
                        {diagDatabase.tested
                          ? diagDatabase.connected
                            ? '● Connected'
                            : '● Not Connected'
                          : '● Not Tested'}
                      </span>
                    </div>
                    {diagDatabase.databaseName && (
                      <span className="block text-[10px] text-[#66585B] mt-1 font-mono-code">
                        PostgreSQL: {diagDatabase.databaseName} {diagDatabase.latencyMs !== undefined ? `(${diagDatabase.latencyMs}ms)` : ''}
                      </span>
                    )}
                    {diagDatabase.error && (
                      <div className="mt-1 text-[10px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 leading-tight">
                        {diagDatabase.error}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={diagDatabase.loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#EFE9DC] hover:bg-[#E5DCCB] border border-[#631828]/25 text-[#631828] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    {diagDatabase.loading ? 'Testing Database...' : 'Test Database Connection'}
                  </button>
                </div>

                {/* 3. Last Checked & Architecture */}
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#66585B] mb-1">
                      Last checked
                    </div>
                    <div className="text-sm font-bold font-mono text-[#1F181A]">
                      {diagLastChecked || 'Not run yet'}
                    </div>
                    <p className="text-[10px] text-[#66585B] mt-2 leading-relaxed">
                      Architecture: Admin Browser → Backend API → PostgreSQL. The frontend NEVER connects directly to PostgreSQL.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#631828]/10 text-[10px] text-[#631828] font-semibold">
                    Live minimal query: <code className="font-mono bg-[#EFE9DC] px-1 py-0.5 rounded">SELECT 1;</code>
                  </div>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 1: FOOTER SETTINGS */}
            {settingsSubSection === 'footer' && (
              <form
                onSubmit={handleSaveSettings}
                className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#631828]/15">
                  <div>
                    <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Footer Settings (Editable Storefront Footer)
                    </h4>
                    <p className="text-xs text-[#66585B]">
                      All footer text, contact details, section headings, links, social links, and copyright text persist in PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md"
                  >
                    Save Footer Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Footer Brand Name
                      </label>
                      <input
                        type="text"
                        value={settingsForm.store_name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Footer Brand Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={settingsForm.footer_brand_tagline}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            footer_brand_tagline: e.target.value,
                            tagline: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Footer Description
                      </label>
                      <textarea
                        rows={3}
                        value={settingsForm.footer_description}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, footer_description: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Footer Quality Badge Text
                        </label>
                        <input
                          type="text"
                          value={settingsForm.footer_brand_badge}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, footer_brand_badge: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Contact Column Heading
                        </label>
                        <input
                          type="text"
                          value={settingsForm.footer_concierge_heading}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, footer_concierge_heading: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Contact Email (Business Default)
                        </label>
                        <input
                          type="email"
                          value={settingsForm.contactEmail || settingsForm.support_email}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              contactEmail: e.target.value,
                              support_email: e.target.value,
                            })
                          }
                          placeholder="fonerera@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                        <span className="block text-[10px] text-[#66585B] mt-1">
                          Centralized business email for footer, contact page, support, and orders.
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Business Phone Number
                        </label>
                        <input
                          type="text"
                          value={settingsForm.support_phone}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, support_phone: e.target.value })
                          }
                          placeholder="e.g. +92 300 1234567"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                        <span className="block text-[10px] text-[#66585B] mt-1">
                          Leave empty to completely hide the phone section across the entire storefront.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Business Physical Address
                      </label>
                      <textarea
                        rows={2}
                        value={settingsForm.atelier_address}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            atelier_address: e.target.value,
                            flagship_address: e.target.value,
                          })
                        }
                        placeholder="Leave empty if no physical address is configured"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                      <span className="block text-[10px] text-[#66585B] mt-1">
                        Leave empty to completely hide address rows across the entire storefront. No placeholder or default address will be shown.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Working Hours
                        </label>
                        <input
                          type="text"
                          value={settingsForm.working_hours}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, working_hours: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Instagram Handle
                        </label>
                        <input
                          type="text"
                          value={settingsForm.instagram_handle}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, instagram_handle: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Copyright Text
                        </label>
                        <input
                          type="text"
                          value={settingsForm.footer_copyright_text}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, footer_copyright_text: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                          Footer Bottom Right Text
                        </label>
                        <input
                          type="text"
                          value={settingsForm.footer_bottom_note}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, footer_bottom_note: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="p-5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#631828]">
                    Social Media Links
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Instagram Profile URL
                      </label>
                      <input
                        type="text"
                        value={settingsForm.instagramUrl || settingsForm.social_instagram_url}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            instagramUrl: e.target.value,
                            social_instagram_url: e.target.value,
                          })
                        }
                        placeholder="e.g. https://instagram.com/foner"
                        className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                      <span className="block text-[10px] text-[#66585B] mt-0.5">
                        Leave empty to hide Instagram link.
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Facebook URL
                      </label>
                      <input
                        type="text"
                        value={settingsForm.social_facebook_url}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, social_facebook_url: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        WhatsApp URL
                      </label>
                      <input
                        type="text"
                        value={settingsForm.social_whatsapp_url}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, social_whatsapp_url: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        TikTok URL
                      </label>
                      <input
                        type="text"
                        value={settingsForm.social_tiktok_url}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, social_tiktok_url: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Sections & Links Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-serif-editorial text-xl font-bold text-[#1F181A]">
                        Footer Navigation Sections &amp; Links
                      </h5>
                      <p className="text-xs text-[#66585B]">
                        Edit section headings, link labels, destination routes, and enable/disable individual links.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {footerSections.map((section, sIdx) => (
                      <div
                        key={section.id}
                        className="p-5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-4"
                      >
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#631828]/15">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#631828] mb-1">
                              Section {sIdx + 1} Heading
                            </label>
                            <input
                              type="text"
                              value={section.heading}
                              onChange={(e) => handleUpdateSectionHeading(sIdx, e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-bold text-[#1F181A]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddLinkToSection(sIdx)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-[11px] font-bold uppercase tracking-wider shrink-0 mt-4"
                          >
                            <Plus className="w-3 h-3" />
                            Add Link
                          </button>
                        </div>

                        <div className="space-y-3">
                          {section.links.map((link, lIdx) => (
                            <div
                              key={link.id}
                              className="p-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/15 space-y-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#66585B]">
                                    Link Text
                                  </label>
                                  <input
                                    type="text"
                                    value={link.label}
                                    onChange={(e) =>
                                      handleUpdateSectionLink(sIdx, lIdx, { label: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#66585B]">
                                    Destination / Page Route
                                  </label>
                                  <select
                                    value={link.path}
                                    onChange={(e) =>
                                      handleUpdateSectionLink(sIdx, lIdx, { path: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                                  >
                                    <option value="/all-products">/all-products (All Luxury Pieces)</option>
                                    <option value="/categories">/categories (Shop by Categories)</option>
                                    <option value="/new-arrivals">/new-arrivals (New Arrivals)</option>
                                    <option value="/featured">/featured (Featured Reserve)</option>
                                    <option value="/track-orders">/track-orders (Track Orders)</option>
                                    <option value="/shipping-returns">/shipping-returns (Shipping &amp; Returns)</option>
                                    <option value="/faq">/faq (FAQ Page)</option>
                                    <option value="/contact">/contact (Contact Page)</option>
                                    <option value="/about">/about (About / Store Info)</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F181A]">
                                  <input
                                    type="checkbox"
                                    checked={link.enabled !== false}
                                    onChange={(e) =>
                                      handleUpdateSectionLink(sIdx, lIdx, { enabled: e.target.checked })
                                    }
                                    className="accent-[#631828]"
                                  />
                                  <span>{link.enabled !== false ? 'Enabled on Footer' : 'Hidden'}</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLinkFromSection(sIdx, lIdx)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 hover:underline"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-lg"
                  >
                    Save All Footer Settings to PostgreSQL
                  </button>
                </div>
              </form>
            )}

            {/* SUB-SECTION 2: INFORMATIONAL PAGES CONTENT MANAGER */}
            {settingsSubSection === 'pages' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 p-5 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-3 h-fit">
                  <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Informational Pages
                  </h4>
                  <p className="text-xs text-[#66585B]">
                    Select any customer-facing footer page below to edit its title, subtitle, and policy content.
                  </p>
                  <div className="space-y-2 pt-2">
                    {[
                      { slug: 'shipping-returns', label: 'Shipping & Returns', route: '/shipping-returns' },
                      { slug: 'contact', label: 'Contact', route: '/contact' },
                      { slug: 'faq', label: 'FAQ Page Header', route: '/faq' },
                      { slug: 'track-orders', label: 'Track Orders Page', route: '/track-orders' },
                      { slug: 'about', label: 'About / Store Information', route: '/about' },
                    ].map((pg) => {
                      const active = selectedPageSlug === pg.slug;
                      return (
                        <button
                          key={pg.slug}
                          type="button"
                          onClick={() => handleSelectPageForEditing(pg.slug)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[#631828] text-[#F7F3EB] shadow-sm'
                              : 'bg-[#F7F3EB] text-[#1F181A] hover:bg-[#E5DCCB]'
                          }`}
                        >
                          <span>{pg.label}</span>
                          <span
                            className={`font-mono-code text-[10px] ${
                              active ? 'text-[#C5A06E]' : 'text-[#66585B]'
                            }`}
                          >
                            {pg.route}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form
                  onSubmit={handleSaveInformationalPage}
                  className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#631828]/15">
                    <div>
                      <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#631828] font-bold">
                        Editing Route: /{selectedPageSlug}
                      </span>
                      <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                        {pageEditorForm.title || selectedPageSlug}
                      </h4>
                    </div>
                    <button
                      type="submit"
                      disabled={savingPageContent}
                      className="px-6 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-50"
                    >
                      {savingPageContent ? 'Saving...' : 'Save Page Content'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Page Title *</label>
                    <input
                      type="text"
                      required
                      value={pageEditorForm.title}
                      onChange={(e) => setPageEditorForm({ ...pageEditorForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      Page Subtitle / Lead Paragraph
                    </label>
                    <input
                      type="text"
                      value={pageEditorForm.subtitle}
                      onChange={(e) => setPageEditorForm({ ...pageEditorForm, subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      Page Content (Separate paragraphs with a blank line) *
                    </label>
                    <textarea
                      rows={10}
                      required
                      value={pageEditorForm.content}
                      onChange={(e) => setPageEditorForm({ ...pageEditorForm, content: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-[#66585B]">
                      Last updated: {new Date(pageEditorForm.updated_at || Date.now()).toLocaleString()}
                    </span>
                    <button
                      type="submit"
                      disabled={savingPageContent}
                      className="px-6 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md"
                    >
                      {savingPageContent ? 'Saving...' : 'Save Page Content'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-SECTION 3: GENERAL STORE CONFIG & COUPONS */}
            {settingsSubSection === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form
                  onSubmit={handleSaveSettings}
                  className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4 h-fit"
                >
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Store Configuration &amp; Delivery Fee (PKR)
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={settingsForm.store_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      Fixed Nationwide Delivery Fee (PKR) — Default: 300 Rs
                    </label>
                    <input
                      type="number"
                      value={settingsForm.delivery_fee_pkr}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, delivery_fee_pkr: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm font-mono-code font-bold text-[#631828]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      Top Announcement Bar Text
                    </label>
                    <textarea
                      rows={2}
                      value={settingsForm.announcement_bar}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, announcement_bar: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider"
                  >
                    Save Store Settings
                  </button>
                </form>

                <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                        Privilege Promo Coupons ({coupons.length})
                      </h3>
                      <p className="text-xs text-[#66585B]">
                        Configure discount codes, percentage values, and expiration dates
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditCouponModal()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Coupon
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {coupons.map((c) => {
                      const isExpired = c.expires_at
                        ? new Date(c.expires_at).getTime() < Date.now()
                        : false;
                      return (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-code text-sm font-bold text-[#631828]">
                                {c.code}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-[#631828]/10 text-[#631828] text-[10px] font-bold font-mono-code">
                                {c.discount_type === 'percentage'
                                  ? `${c.discount_value}% OFF`
                                  : `Rs. ${c.discount_value.toLocaleString()} OFF`}
                              </span>
                              {c.expires_at && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isExpired
                                      ? 'bg-red-900/15 text-red-900 border border-red-800/25'
                                      : 'bg-amber-900/10 text-amber-950 border border-amber-800/20'
                                  }`}
                                >
                                  <Calendar className="w-2.5 h-2.5" />
                                  {isExpired
                                    ? `Expired ${new Date(c.expires_at).toLocaleDateString()}`
                                    : `Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#66585B] mt-0.5">
                              Min Order Rs. {c.min_order_pkr.toLocaleString()} • Used: {c.usage_count}x
                              {c.description ? ` • ${c.description}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditCouponModal(c)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-[11px] font-semibold"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(c.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EFE9DC] text-red-800 border border-red-800/20 text-[11px] font-semibold"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ===================================================================
            TAB 6B: DEDICATED COUPONS MANAGER TAB
           =================================================================== */}
        {activeTab === 'coupons' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#631828]">
                  <Tag className="w-4 h-4" />
                  Atelier Privilege Promotions
                </div>
                <h3 className="font-serif-editorial text-3xl font-bold text-[#1F181A] mt-0.5">
                  Coupon Codes, Percentage Discounts &amp; Expiration Dates
                </h3>
                <p className="text-xs text-[#66585B]">
                  Create or edit promotional codes with percentage or fixed PKR values, minimum order thresholds, and expiration dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditCouponModal()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create New Coupon
              </button>
            </div>

            <div className="rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#631828]/15 bg-[#E5DCCB]/60 text-[11px] font-bold uppercase tracking-wider text-[#66585B]">
                      <th className="py-3.5 px-5">Code &amp; Description</th>
                      <th className="py-3.5 px-4">Discount Value</th>
                      <th className="py-3.5 px-4">Minimum Order</th>
                      <th className="py-3.5 px-4">Expiration Date</th>
                      <th className="py-3.5 px-4">Status &amp; Usage</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#631828]/10 text-xs">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[#66585B]">
                          No privilege coupons configured yet. Click &ldquo;Create New Coupon&rdquo; to add one.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((c) => {
                        const isExpired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
                        return (
                          <tr key={c.id} className="hover:bg-[#F7F3EB]/60 transition-colors">
                            <td className="py-4 px-5">
                              <span className="font-mono-code text-sm font-bold text-[#631828] block">
                                {c.code}
                              </span>
                              <span className="text-[11px] text-[#66585B]">
                                {c.description || 'Atelier promotional code'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#631828]/10 text-[#631828] font-mono-code text-xs font-bold">
                                {c.discount_type === 'percentage'
                                  ? `${c.discount_value}% OFF`
                                  : `Rs. ${c.discount_value.toLocaleString()} OFF`}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-mono-code text-xs text-[#1F181A]">
                              Rs. {c.min_order_pkr.toLocaleString()}
                            </td>
                            <td className="py-4 px-4">
                              {c.expires_at ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    isExpired
                                      ? 'bg-red-900/15 text-red-900 border border-red-800/30'
                                      : 'bg-[#F7F3EB] text-[#1F181A] border border-[#631828]/20'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-[#631828]" />
                                  {new Date(c.expires_at).toLocaleDateString()}
                                  {isExpired && ' (Expired)'}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#66585B] italic">No expiry</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    c.is_active && !isExpired
                                      ? 'bg-emerald-900/15 text-emerald-900'
                                      : 'bg-neutral-400/25 text-neutral-700'
                                  }`}
                                >
                                  {!c.is_active ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
                                </span>
                                <span className="font-mono-code text-[11px] text-[#66585B]">
                                  {c.usage_count}
                                  {c.usage_limit !== null && c.usage_limit !== undefined
                                    ? ` / ${c.usage_limit}`
                                    : ''}{' '}
                                  uses
                                </span>
                                {c.per_customer_limit !== null && c.per_customer_limit !== undefined && (
                                  <span className="text-[10px] font-mono-code text-[#631828]">
                                    (Max {c.per_customer_limit}/customer)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditCouponModal(c)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-semibold transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(c.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F7F3EB] hover:bg-red-900 text-red-800 hover:text-white border border-red-800/20 text-[11px] font-semibold transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-SECTION 4: ADMIN SECURITY & CREDENTIALS (POSTGRESQL RBAC) */}
        {settingsSubSection === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#631828]/15">
              <div>
                <span className="text-[10px] font-mono-code uppercase tracking-widest text-[#631828] font-bold block">
                  PostgreSQL Administrator Account Security
                </span>
                <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Admin Credentials &amp; Access Control
                </h4>
                <p className="text-xs text-[#66585B] mt-0.5">
                  Update your administrator email or password. Password changes are hashed with bcrypt in PostgreSQL and invalidate previous sessions.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold font-mono-code">
                <Shield className="w-3.5 h-3.5 text-[#C5A06E]" />
                <span>ROLE: ADMIN</span>
              </div>
            </div>

            {adminSecurityError && (
              <div className="p-4 rounded-2xl bg-red-900/10 border border-red-800/30 text-xs text-red-950 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-800 shrink-0" />
                <span>{adminSecurityError}</span>
              </div>
            )}

            {adminSecuritySuccess && (
              <div className="p-4 rounded-2xl bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-950 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>{adminSecuritySuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeAdminCredentials} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                  Current Admin Email
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.email || 'admin@foner.com'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#E5DCCB] border border-[#631828]/15 text-xs font-mono-code text-[#66585B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                  Current Password * (Required for verification)
                </label>
                <input
                  type="password"
                  required
                  value={adminCurrentPassword}
                  onChange={(e) => {
                    setAdminCurrentPassword(e.target.value);
                    if (adminSecurityError) setAdminSecurityError(null);
                  }}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs font-mono-code"
                />
                <p className="text-[11px] text-[#66585B] mt-1">
                  Your current password is required to authorize credential changes in PostgreSQL.
                </p>
              </div>

              <div className="pt-2 border-t border-[#631828]/15 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                    New Admin Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={adminNewEmail}
                    onChange={(e) => {
                      setAdminNewEmail(e.target.value);
                      if (adminSecurityError) setAdminSecurityError(null);
                    }}
                    placeholder="Enter new administrator email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs font-mono-code"
                  />
                  <p className="text-[11px] text-[#66585B] mt-1">
                    Changing your email invalidates the old email address as an admin login.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      New Password (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      maxLength={128}
                      value={adminNewPassword}
                      onChange={(e) => {
                        setAdminNewPassword(e.target.value);
                        if (adminSecurityError) setAdminSecurityError(null);
                      }}
                      placeholder="Leave blank to keep current"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      maxLength={128}
                      value={adminConfirmPassword}
                      onChange={(e) => {
                        setAdminConfirmPassword(e.target.value);
                        if (adminSecurityError) setAdminSecurityError(null);
                      }}
                      placeholder="Repeat new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/25 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={adminSecuritySaving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-50 transition-all"
                >
                  {adminSecuritySaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-[#C5A06E]" />
                      <span>Update Admin Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* SUB-SECTION 5: SYSTEM DIAGNOSTICS (DEDICATED CONSOLE) */}
        {activeTab === 'settings' && settingsSubSection === 'diagnostics' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#631828]/15">
              <div>
                <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  System Diagnostics &amp; Infrastructure Health
                </h4>
                <p className="text-xs text-[#66585B] mt-0.5">
                  Verify live HTTP communication with the backend service and transactional health of the PostgreSQL database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunFullDiagnostics}
                  disabled={diagBackend.loading || diagDatabase.loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagBackend.loading || diagDatabase.loading ? 'animate-spin' : ''}`} />
                  Run Full System Diagnostics
                </button>
              </div>
            </div>

            {/* Architecture Explanatory Box */}
            <div className="p-5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#631828] flex items-center gap-2">
                <Server className="w-3.5 h-3.5" />
                Diagnostic Architecture &amp; Security Boundary
              </h5>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#1F181A] bg-[#EFE9DC] p-3 rounded-xl border border-[#631828]/10">
                <span className="font-semibold text-[#631828]">Admin Browser (Frontend)</span>
                <span>───(HTTP /api/health)───►</span>
                <span className="font-semibold text-emerald-800">Backend Express API</span>
                <span>───(SELECT 1)───►</span>
                <span className="font-semibold text-blue-900">PostgreSQL Database</span>
              </div>
              <p className="text-[11px] text-[#66585B] leading-relaxed">
                The frontend never connects directly to PostgreSQL. Database credentials, connection strings, and passwords remain strictly isolated on the backend server.
              </p>
            </div>

            {/* Diagnostics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Backend Connection */}
              <div className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#631828]" />
                    <h5 className="text-sm font-bold text-[#1F181A]">Backend Service</h5>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      diagBackend.tested
                        ? diagBackend.connected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        diagBackend.tested
                          ? diagBackend.connected
                            ? 'bg-emerald-600'
                            : 'bg-rose-600'
                          : 'bg-neutral-400'
                      }`}
                    />
                    {diagBackend.tested ? (diagBackend.connected ? 'Connected' : 'Not Connected') : 'Not Tested'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#66585B]">
                  <div className="flex justify-between border-b border-[#631828]/10 pb-1.5">
                    <span>Diagnostic Endpoint:</span>
                    <span className="font-mono text-[#1F181A]">GET /api/health</span>
                  </div>
                  <div className="flex justify-between border-b border-[#631828]/10 pb-1.5">
                    <span>Latency:</span>
                    <span className="font-mono text-[#1F181A]">
                      {diagBackend.latencyMs !== undefined ? `${diagBackend.latencyMs} ms` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Result:</span>
                    <span className="font-semibold text-[#1F181A]">
                      {diagBackend.tested ? (diagBackend.connected ? 'HTTP 200 OK' : 'Failed') : 'Pending'}
                    </span>
                  </div>
                </div>

                {diagBackend.error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
                    <strong>Error:</strong> {diagBackend.error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTestBackend}
                  disabled={diagBackend.loading}
                  className="w-full py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                >
                  {diagBackend.loading ? 'Testing Backend Connection...' : 'Test Backend Connection'}
                </button>
              </div>

              {/* Card 2: Database Connection */}
              <div className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#631828]" />
                    <h5 className="text-sm font-bold text-[#1F181A]">PostgreSQL Database</h5>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      diagDatabase.tested
                        ? diagDatabase.connected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        diagDatabase.tested
                          ? diagDatabase.connected
                            ? 'bg-emerald-600'
                            : 'bg-rose-600'
                          : 'bg-neutral-400'
                      }`}
                    />
                    {diagDatabase.tested ? (diagDatabase.connected ? 'Connected' : 'Not Connected') : 'Not Tested'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#66585B]">
                  <div className="flex justify-between border-b border-[#631828]/10 pb-1.5">
                    <span>Diagnostic Endpoint:</span>
                    <span className="font-mono text-[#1F181A]">GET /api/admin/diagnostics/database</span>
                  </div>
                  <div className="flex justify-between border-b border-[#631828]/10 pb-1.5">
                    <span>Verified Query:</span>
                    <span className="font-mono text-[#1F181A]">SELECT 1;</span>
                  </div>
                  <div className="flex justify-between border-b border-[#631828]/10 pb-1.5">
                    <span>Database Name:</span>
                    <span className="font-mono text-[#1F181A]">{diagDatabase.databaseName || 'f'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Query Latency:</span>
                    <span className="font-mono text-[#1F181A]">
                      {diagDatabase.latencyMs !== undefined ? `${diagDatabase.latencyMs} ms` : '—'}
                    </span>
                  </div>
                </div>

                {diagDatabase.error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
                    <strong>Error:</strong> {diagDatabase.error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTestDatabase}
                  disabled={diagDatabase.loading}
                  className="w-full py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                >
                  {diagDatabase.loading ? 'Testing Database Connection...' : 'Test Database Connection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB: CATEGORIES & SUBCATEGORIES MANAGER (LOCAL COMPUTER UPLOAD)
           =================================================================== */}
        {activeTab === 'subcategories' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* MAIN STOREFRONT CATEGORIES MANAGER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 h-fit">
                <div className="flex items-center justify-between pb-4 border-b border-[#631828]/15">
                  <div>
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Storefront Category'}
                    </h3>
                    <p className="text-xs text-[#66585B]">
                      Upload category cover image directly from your computer
                    </p>
                  </div>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className="text-xs font-semibold text-[#631828] underline"
                    >
                      + New Category
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="e.g. Tailored Outerwear"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Brief description of this category..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>

                  {/* CATEGORY IMAGE LOCAL UPLOAD */}
                  <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-3">
                    <label className="block text-xs font-bold text-[#631828]">
                      Category Image *
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingCategoryImage
                            ? 'Uploading...'
                            : categoryForm.image_url
                            ? 'Replace Image from Computer'
                            : 'Choose Image from Computer'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadCategoryImage}
                          disabled={uploadingCategoryImage}
                          className="hidden"
                        />
                      </label>
                      {categoryForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setCategoryForm((prev) => ({ ...prev, image_url: '' }))}
                          className="px-3 py-2 rounded-xl bg-[#EFE9DC] hover:bg-red-900 text-red-900 hover:text-white text-[11px] font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {categoryForm.image_url && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={resolveImageUrl(categoryForm.image_url)}
                          alt="Category preview"
                          className="w-20 h-24 rounded-xl object-cover border border-[#631828]/20"
                        />
                        <span className="text-[11px] text-emerald-900 font-semibold">
                          Preview ready • Persisted to server storage
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                  >
                    {editingCategory ? 'Save Category Changes' : 'Create Category'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Storefront Categories ({categories.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-4 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={resolveImageUrl(cat.image_url)}
                          alt={cat.name}
                          className="w-16 h-20 rounded-2xl object-cover border border-[#631828]/20 shrink-0"
                        />
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-[#631828]/10 text-[#631828] font-mono-code text-[10px] font-bold uppercase">
                            {cat.slug}
                          </span>
                          <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] mt-1">
                            {cat.name}
                          </h4>
                          <p className="text-xs text-[#66585B] line-clamp-2 mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditCategory(cat)}
                          className="px-3 py-1.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-[11px] font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-xl bg-[#F7F3EB] text-red-800 hover:bg-red-900 hover:text-white border border-red-800/20 transition-colors self-end"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SUBCATEGORIES MANAGER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-[#631828]/15">
              <div className="lg:col-span-5 p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 h-fit">
                <div className="pb-4 border-b border-[#631828]/15">
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Add New Subcategory
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Organize products into specialized subcategories under parent collections
                  </p>
                </div>

                <form onSubmit={handleCreateSubcategory} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Subcategory Name *</label>
                    <input
                      type="text"
                      required
                      value={subcatForm.name}
                      onChange={(e) => setSubcatForm({ ...subcatForm, name: e.target.value })}
                      placeholder="e.g. Double-Breasted Overcoats"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Parent Category *</label>
                    <select
                      value={subcatForm.parent_category_slug}
                      onChange={(e) => setSubcatForm({ ...subcatForm, parent_category_slug: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F181A] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={subcatForm.description}
                      onChange={(e) => setSubcatForm({ ...subcatForm, description: e.target.value })}
                      placeholder="Brief description of this subcategory..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/20 space-y-2.5">
                    <label className="block text-xs font-bold text-[#631828]">Subcategory Image</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingSubcatImage
                            ? 'Uploading...'
                            : subcatForm.image_url
                            ? 'Replace Image from Computer'
                            : 'Choose Image from Computer'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadSubcatImage}
                          disabled={uploadingSubcatImage}
                          className="hidden"
                        />
                      </label>
                      {subcatForm.image_url && (
                        <button
                          type="button"
                          onClick={() => setSubcatForm((prev) => ({ ...prev, image_url: '' }))}
                          className="px-3 py-2 rounded-xl bg-[#EFE9DC] text-red-900 text-[11px] font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {subcatForm.image_url && (
                      <img
                        src={resolveImageUrl(subcatForm.image_url)}
                        alt="Subcategory preview"
                        className="w-16 h-20 rounded-xl object-cover border border-[#631828]/20 mt-2"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                  >
                    Create Subcategory
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Active Subcategories ({subcategories.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subcategories.map((sub) => {
                    const parentCat = categories.find((c) => c.slug === sub.parent_category_slug);
                    const productCount = products.filter((p) => p.subcategory_slug === sub.slug).length;
                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={resolveImageUrl(sub.image_url)}
                            alt={sub.name}
                            className="w-16 h-20 rounded-2xl object-cover border border-[#631828]/20 shrink-0"
                          />
                          <div>
                            <span className="px-2 py-0.5 rounded-full bg-[#631828]/10 text-[#631828] font-mono-code text-[10px] font-bold uppercase">
                              {parentCat?.name || sub.parent_category_slug}
                            </span>
                            <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] mt-1">
                              {sub.name}
                            </h4>
                            <p className="text-xs text-[#66585B] line-clamp-2 mt-0.5">{sub.description}</p>
                            <p className="text-[11px] font-mono-code text-[#631828] font-semibold mt-1.5">
                              {productCount} product(s) assigned
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          className="p-2 rounded-xl bg-[#F7F3EB] text-red-800 hover:bg-red-900 hover:text-white border border-red-800/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB: RESTOCK NOTIFICATIONS MANAGER
           =================================================================== */}
        {activeTab === 'restock' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#631828]">
                  <Bell className="w-4 h-4" />
                  Out-of-Stock Waitlist &amp; Restock Dispatch
                </div>
                <h3 className="font-serif-editorial text-3xl font-bold text-[#1F181A] mt-0.5">
                  Customer Restock Notification Requests ({restockNotifications.length})
                </h3>
                <p className="text-xs text-[#66585B] mt-1">
                  Customer emails registered via the &ldquo;Notify Me&rdquo; button on out-of-stock products. Updating a product&apos;s stock to &gt; 0 automatically marks waiting subscribers as notified, or you can trigger restock alerts manually below.
                </p>
              </div>

              <div className="inline-flex items-center p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 self-start">
                {(['all', 'pending', 'notified'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRestockFilter(status)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      restockFilter === status
                        ? 'bg-[#631828] text-[#F7F3EB]'
                        : 'text-[#66585B] hover:text-[#1F181A]'
                    }`}
                  >
                    {status} (
                    {status === 'all'
                      ? restockNotifications.length
                      : restockNotifications.filter((r) => r.status === status).length}
                    )
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#631828]/15 bg-[#E5DCCB]/60 text-[11px] font-bold uppercase tracking-wider text-[#66585B]">
                      <th className="py-3.5 px-5">Product &amp; SKU</th>
                      <th className="py-3.5 px-4">Customer Email</th>
                      <th className="py-3.5 px-4">Preferred Variant</th>
                      <th className="py-3.5 px-4">Current Stock</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#631828]/10 text-xs">
                    {restockNotifications.filter(
                      (r) => restockFilter === 'all' || r.status === restockFilter
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-[#66585B]">
                          No customer restock requests found for this filter.
                        </td>
                      </tr>
                    ) : (
                      restockNotifications
                        .filter((r) => restockFilter === 'all' || r.status === restockFilter)
                        .map((item) => {
                          const linkedProduct = products.find((p) => p.id === item.product_id);
                          const currentStock = linkedProduct ? linkedProduct.stock : 0;
                          return (
                            <tr key={item.id} className="hover:bg-[#F7F3EB]/60 transition-colors">
                              <td className="py-4 px-5">
                                <span className="font-serif-editorial text-base font-bold text-[#1F181A] block">
                                  {item.product_title}
                                </span>
                                <span className="font-mono-code text-[11px] text-[#631828]">
                                  SKU: {item.product_sku} (ID #{item.product_id})
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className="font-mono-code font-bold text-[#1F181A]">{item.customer_email}</span>
                                <span className="block text-[10px] text-[#66585B]">
                                  Requested {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono-code text-xs text-[#66585B]">
                                Size: <strong className="text-[#1F181A]">{item.preferred_size || 'Any'}</strong> • Color:{' '}
                                <strong className="text-[#1F181A]">{item.preferred_color || 'Default'}</strong>
                              </td>
                              <td className="py-4 px-4 font-mono-code">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    currentStock <= 0
                                      ? 'bg-red-900/15 text-red-900'
                                      : 'bg-emerald-900/15 text-emerald-900'
                                  }`}
                                >
                                  {currentStock <= 0 ? '0 (Out of Stock)' : `${currentStock} in stock`}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    item.status === 'notified'
                                      ? 'bg-emerald-900/15 text-emerald-900'
                                      : 'bg-amber-900/15 text-amber-900'
                                  }`}
                                >
                                  {item.status === 'notified' ? 'Notified ✓' : 'Pending Alert'}
                                </span>
                                {item.notified_at && (
                                  <span className="block text-[10px] text-[#66585B] mt-0.5">
                                    Sent {new Date(item.notified_at).toLocaleDateString()}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {item.status === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendRestockAlert(item.product_id, item.product_title)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                      <Send className="w-3 h-3" />
                                      Send Restock Alert
                                    </button>
                                  )}
                                  {linkedProduct && (
                                    <button
                                      type="button"
                                      onClick={() => openEditProduct(linkedProduct)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#E5DCCB] text-[#1F181A] border border-[#631828]/20 text-[11px] font-semibold transition-colors"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      Update Stock
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRestockRequest(item.id)}
                                    className="p-2 rounded-xl bg-[#F7F3EB] hover:bg-red-900 text-red-800 hover:text-white border border-red-800/20 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            TAB 7: POSTGRESQL DATABASE & AUTO-SCHEMA PROVISIONER
           =================================================================== */}
        {activeTab === 'database' && dbStatus && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/15 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  GHSOY-SERVER PostgreSQL Connected ({dbStatus.host}:{dbStatus.port}/{dbStatus.database_name} • User: {dbStatus.database_user})
                </div>
                <h3 className="font-serif-editorial text-3xl font-bold text-[#1F181A] mt-2">
                  Production PostgreSQL Schema &amp; Live Table Inspector
                </h3>
                <p className="text-xs text-[#66585B] max-w-2xl mt-1 leading-relaxed">
                  Connected strictly to PostgreSQL via server-side <code className="font-mono-code">DATABASE_URL</code> on{' '}
                  <code className="font-mono-code">GHSOY-SERVER</code>. No embedded, mock, or fallback database is active. Database credentials are isolated strictly on the backend.
                </p>
              </div>

              <button
                onClick={() => handleInitializePostgres()}
                disabled={syncingDb}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${syncingDb ? 'animate-spin' : ''}`} />
                {syncingDb ? 'Verifying Schema...' : 'Run Schema Migration Now'}
              </button>
            </div>

            {dbError && (
              <div className="p-4 rounded-2xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 font-semibold">
                {dbError}
              </div>
            )}

            {/* Live PostgreSQL Tables Status Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  All 9 PostgreSQL Tables (Click Any Table Below to Inspect Live Rows)
                </h4>
                <span className="text-xs font-mono-code text-[#631828] font-bold">
                  100% Fetched from PostgreSQL
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {dbStatus.tables.map((tbl) => {
                  const isSelected = selectedDbTable === tbl.table_name;
                  return (
                    <button
                      key={tbl.table_name}
                      type="button"
                      onClick={() => fetchLiveTableRows(tbl.table_name)}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-[#631828] text-[#F7F3EB] border-[#631828] shadow-lg scale-[1.02]'
                          : 'bg-[#EFE9DC] text-[#1F181A] border-[#631828]/20 hover:border-[#631828]'
                      }`}
                    >
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold ${
                          isSelected ? 'text-[#E5DCCB]' : 'text-emerald-800'
                        }`}
                      >
                        ● TABLE READY
                      </span>
                      <p className="font-mono-code text-sm font-bold mt-1">{tbl.table_name}</p>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-[#F7F3EB]/85' : 'text-[#66585B]'}`}>
                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-[#631828]'}`}>
                          {tbl.row_count}
                        </span>{' '}
                        rows • {tbl.columns_count} cols
                      </p>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider mt-2 ${
                          isSelected ? 'text-[#C5A06E]' : 'text-[#631828]'
                        }`}
                      >
                        {isSelected ? 'Viewing Live Rows ↓' : 'Click to View Data →'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live PostgreSQL Table Row Explorer */}
            <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/25 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono-code uppercase tracking-wider text-[#631828] font-bold">
                    LIVE POSTGRESQL QUERY EXPLORER
                  </span>
                  <h4 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Table: <span className="font-mono-code text-[#631828]">{selectedDbTable}</span>
                  </h4>
                  {liveTableData && (
                    <p className="text-xs font-mono-code text-[#66585B] mt-0.5">
                      Executed SQL: <code className="text-[#1F181A] font-bold">{liveTableData.sql_executed}</code> •{' '}
                      {liveTableData.row_count} rows returned at{' '}
                      {new Date(liveTableData.fetched_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fetchLiveTableRows(selectedDbTable)}
                  disabled={loadingTableData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider hover:bg-[#430F1B]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTableData ? 'animate-spin' : ''}`} />
                  {loadingTableData ? 'Querying DB...' : 'Run SELECT * Query Again'}
                </button>
              </div>

              {loadingTableData ? (
                <div className="p-8 text-center text-xs font-mono-code text-[#66585B]">
                  Running live PostgreSQL query on "{selectedDbTable}"...
                </div>
              ) : liveTableData && liveTableData.rows.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[#631828]/20 bg-[#F7F3EB] max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1F181A] text-[#F7F3EB] font-mono-code text-[11px]">
                        {liveTableData.columns.map((col) => (
                          <th key={col} className="py-2.5 px-3 border-b border-[#631828]/20 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#631828]/10 font-mono-code text-[11px]">
                      {liveTableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#EFE9DC]/70">
                          {liveTableData.columns.map((col) => {
                            const val = row[col];
                            const formatted =
                              val === null || val === undefined
                                ? 'NULL'
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            return (
                              <td
                                key={col}
                                className="py-2 px-3 text-[#1F181A] max-w-[260px] truncate"
                                title={formatted}
                              >
                                {formatted}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#66585B] bg-[#F7F3EB] rounded-2xl">
                  No rows currently in table <code className="font-mono-code">{selectedDbTable}</code>.
                </div>
              )}
            </div>

            {/* Full PostgreSQL DDL Schema Viewer */}
            <div className="p-6 rounded-3xl bg-[#1F181A] text-[#F7F3EB] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono-code text-xs uppercase tracking-wider text-[#C5A06E]">
                  PostgreSQL Auto-Executed DDL Schema (CREATE TABLE IF NOT EXISTS)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(dbStatus.schema_sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#631828] text-xs font-semibold"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied SQL' : 'Copy Schema SQL'}
                </button>
              </div>
              <pre className="text-[11px] font-mono-code text-[#E5DCCB] overflow-x-auto max-h-96 p-4 rounded-2xl bg-black/40">
                {dbStatus.schema_sql}
              </pre>
            </div>
          </motion.div>
        )}
        </div>
      </div>

      {/* ===================================================================
          MODAL: ADD / EDIT PRODUCT
         =================================================================== */}
      <AnimatePresence>
        {productModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              onClick={() => setProductModalOpen(false)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveProduct}
              className="relative z-10 w-full max-w-xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 p-6 sm:p-8 space-y-4 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#631828]/15">
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  {editingProduct ? `Edit Product: ${editingProduct.title}` : 'Add Product'}
                </h3>
                <button type="button" onClick={() => setProductModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Category</label>
                  <select
                    value={productForm.category_slug}
                    onChange={(e) => setProductForm({ ...productForm, category_slug: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Subcategory</label>
                  <select
                    value={productForm.subcategory_slug}
                    onChange={(e) => setProductForm({ ...productForm, subcategory_slug: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  >
                    <option value="">All / General Subcategory</option>
                    {subcategories
                      .filter(
                        (s) => !productForm.category_slug || s.parent_category_slug === productForm.category_slug
                      )
                      .map((s) => (
                        <option key={s.id} value={s.slug}>
                          {s.name} ({s.parent_category_slug})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Price in PKR (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price_pkr}
                    onChange={(e) => setProductForm({ ...productForm, price_pkr: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm font-mono-code font-bold text-[#631828]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Compare-at Price (PKR)</label>
                  <input
                    type="number"
                    value={productForm.compare_at_price_pkr}
                    onChange={(e) => setProductForm({ ...productForm, compare_at_price_pkr: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm font-mono-code"
                  />
                </div>
                <div className="sm:col-span-2 p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#631828]">
                        Product Images * ({productImages.length} selected)
                      </label>
                      <p className="text-[11px] text-[#66585B]">
                        Upload one or multiple images directly from your computer. First image is the primary cover.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadingProductImages ? 'Uploading...' : '+ Add Images from Computer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddProductImagesFromComputer}
                        disabled={uploadingProductImages}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {productImages.length === 0 ? (
                    <div className="p-5 rounded-xl bg-[#F7F3EB] border border-dashed border-[#631828]/30 text-center text-xs text-[#66585B]">
                      No product images uploaded yet. Click &ldquo;+ Add Images from Computer&rdquo; above to select images.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {productImages.map((imgUrl, idx) => (
                        <div
                          key={`${imgUrl}-${idx}`}
                          className="p-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 flex flex-col gap-2"
                        >
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#1F181A]">
                            <img
                              src={imgUrl}
                              alt={`Product ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#631828] text-[#F7F3EB] text-[9px] font-bold uppercase">
                              {idx === 0 ? 'Primary' : `Image ${idx + 1}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveProductImage(idx, -1)}
                                disabled={idx === 0}
                                title="Move earlier"
                                className="p-1 rounded bg-[#EFE9DC] text-[#1F181A] disabled:opacity-35"
                              >
                                <ArrowUp className="w-3 h-3 -rotate-90" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveProductImage(idx, 1)}
                                disabled={idx === productImages.length - 1}
                                title="Move later"
                                className="p-1 rounded bg-[#EFE9DC] text-[#1F181A] disabled:opacity-35"
                              >
                                <ArrowDown className="w-3 h-3 -rotate-90" />
                              </button>
                            </div>
                            <label className="px-2 py-1 rounded bg-[#EFE9DC] hover:bg-[#631828] hover:text-[#F7F3EB] text-[10px] font-semibold cursor-pointer transition-colors">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleReplaceProductImageAt(idx, e)}
                                disabled={uploadingProductImages}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveProductImageAt(idx)}
                              className="p-1 rounded bg-red-900/10 text-red-800 hover:bg-red-900 hover:text-white"
                              title="Remove image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Sizes (comma separated)</label>
                  <input
                    type="text"
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                </div>

                {/* PRODUCT VARIANTS BUILDER (SIZE, COLOR, VARIANT STOCK, VARIANT SKU, VARIANT PRICE) */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/25 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#631828] font-bold">
                        Flexible Variant Matrix (Size • Color • Stock • SKU • Optional Price)
                      </span>
                      <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A]">
                        Product Variants ({productVariants.length})
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateVariantMatrix}
                        className="px-3 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#E5DCCB] text-[#631828] border border-[#631828]/25 text-[11px] font-bold uppercase tracking-wider"
                      >
                        Auto-Generate from Sizes/Colors
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = productVariants.length + 1;
                          const baseSku = productForm.sku || 'FNR-VAR';
                          const firstColor =
                            productForm.colors.split(',')[0]?.split(':')[0]?.trim() || 'Black';
                          const newVariant: ProductVariant = {
                            id: `var-${Date.now()}-${nextIdx}`,
                            size: 'M',
                            color: firstColor,
                            stock: 10,
                            sku: `${baseSku}-${nextIdx}`,
                            price_pkr: null,
                          };
                          const updated = [...productVariants, newVariant];
                          const totalVariantStock = updated.reduce(
                            (sum, v) => sum + Math.max(0, Number(v.stock || 0)),
                            0
                          );
                          setProductVariants(updated);
                          setProductForm({
                            ...productForm,
                            stock: totalVariantStock,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-bold uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Variant
                      </button>
                    </div>
                  </div>

                  {productVariants.length === 0 ? (
                    <p className="text-xs text-[#66585B]">
                      No per-variant matrix rows added yet. Click &ldquo;Add Variant&rdquo; or &ldquo;Auto-Generate from Sizes/Colors&rdquo; to configure individual Size/Color stock, SKU, and optional variant price overrides.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {productVariants.map((v, vIdx) => (
                        <div
                          key={v.id || vIdx}
                          className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/15 text-xs"
                        >
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-[#66585B]">Size</label>
                            <input
                              type="text"
                              value={v.size}
                              onChange={(e) => {
                                const updated = [...productVariants];
                                updated[vIdx] = { ...updated[vIdx], size: e.target.value };
                                setProductVariants(updated);
                              }}
                              placeholder="M / 42"
                              className="w-full px-2 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[10px] font-semibold text-[#66585B]">Color</label>
                            <input
                              type="text"
                              value={v.color}
                              onChange={(e) => {
                                const updated = [...productVariants];
                                updated[vIdx] = { ...updated[vIdx], color: e.target.value };
                                setProductVariants(updated);
                              }}
                              placeholder="Black / Burgundy"
                              className="w-full px-2 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-[#66585B]">Stock</label>
                            <input
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) => {
                                const updated = [...productVariants];
                                updated[vIdx] = {
                                  ...updated[vIdx],
                                  stock: Math.max(0, Number(e.target.value || 0)),
                                };
                                const totalVariantStock = updated.reduce(
                                  (sum, item) => sum + Math.max(0, Number(item.stock || 0)),
                                  0
                                );
                                setProductVariants(updated);
                                setProductForm({
                                  ...productForm,
                                  stock: totalVariantStock,
                                });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code font-bold"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-[#66585B]">Variant SKU</label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const updated = [...productVariants];
                                updated[vIdx] = { ...updated[vIdx], sku: e.target.value };
                                setProductVariants(updated);
                              }}
                              placeholder="FNR-BLK-M"
                              className="w-full px-2 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-[11px] font-mono-code"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-semibold text-[#66585B]">
                              Price PKR
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={v.price_pkr ?? ''}
                              onChange={(e) => {
                                const updated = [...productVariants];
                                const raw = e.target.value.trim();
                                updated[vIdx] = {
                                  ...updated[vIdx],
                                  price_pkr: raw === '' ? null : Math.max(0, Number(raw)),
                                };
                                setProductVariants(updated);
                              }}
                              placeholder="Base"
                              className="w-full px-2 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = productVariants.filter((_, i) => i !== vIdx);
                                const totalVariantStock =
                                  updated.length > 0
                                    ? updated.reduce((s, item) => s + Math.max(0, Number(item.stock || 0)), 0)
                                    : productForm.stock;
                                setProductVariants(updated);
                                setProductForm({
                                  ...productForm,
                                  stock: totalVariantStock,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-red-900/10 hover:bg-red-900 text-red-900 hover:text-white transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PRODUCT SEO CONFIGURATION (SLUG, SEO TITLE, META DESCRIPTION) */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/25 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#631828] font-bold">
                      Search Engine Optimization &amp; Clean URL
                    </span>
                    <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A]">
                      Product SEO Metadata
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Clean URL Slug (Unique)
                      </label>
                      <input
                        type="text"
                        value={productForm.slug}
                        onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                        placeholder="e.g. premium-winter-overcoat"
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        SEO Title
                      </label>
                      <input
                        type="text"
                        value={productForm.seo_title}
                        onChange={(e) => setProductForm({ ...productForm, seo_title: e.target.value })}
                        placeholder={
                          productForm.title
                            ? `${productForm.title} | Foner`
                            : 'Premium Winter Overcoat | Foner'
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#1F181A] mb-1">
                        Meta Description
                      </label>
                      <textarea
                        rows={2}
                        value={productForm.meta_description}
                        onChange={(e) =>
                          setProductForm({ ...productForm, meta_description: e.target.value })
                        }
                        placeholder="Concise product description for search engines..."
                        className="w-full px-3 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={productForm.is_featured}
                    onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                    className="accent-[#631828]"
                  />
                  Featured
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={productForm.is_new_arrival}
                    onChange={(e) => setProductForm({ ...productForm, is_new_arrival: e.target.checked })}
                    className="accent-[#631828]"
                  />
                  New Arrival
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={productForm.is_bestseller}
                    onChange={(e) => setProductForm({ ...productForm, is_bestseller: e.target.checked })}
                    className="accent-[#631828]"
                  />
                  Bestseller
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#EFE9DC] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  {savingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />}
                  <span>{savingProduct ? 'Saving...' : 'Save Product'}</span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          MODAL: MODIFY USER & ROLE (ADMIN RBAC CONTROL)
         =================================================================== */}
      <AnimatePresence>
        {userModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              onClick={() => setUserModalOpen(false)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveUser}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 p-6 sm:p-8 space-y-4 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#631828]/15">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {editingUser ? `Modify User & Role: ${editingUser.name}` : 'Create New User / Admin'}
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Assign Admin, Manager, Editor, or Customer privileges in PostgreSQL
                  </p>
                </div>
                <button type="button" onClick={() => setUserModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={userForm.city}
                      onChange={(e) => setUserForm({ ...userForm, city: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#631828] mb-1">System Role *</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] font-bold text-xs uppercase"
                    >
                      <option value="customer">Customer</option>
                      <option value="editor">Editor</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Account Status</label>
                    <select
                      value={userForm.status}
                      onChange={(e) => setUserForm({ ...userForm, status: e.target.value as UserStatus })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#EFE9DC] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  {savingUser && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />}
                  <span>
                    {savingUser
                      ? 'Saving...'
                      : editingUser
                      ? 'Save User & Role'
                      : 'Create Account'}
                  </span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          MODAL: ADD / EDIT COUPON
         =================================================================== */}
      <AnimatePresence>
        {couponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              onClick={() => setCouponModalOpen(false)}
              className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-xs"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleSaveCoupon}
              className="relative z-10 w-full max-w-lg rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 p-6 sm:p-8 space-y-4 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#631828]/15">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Privilege Coupon'}
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Define discount code, percentage or fixed PKR value, and expiration date
                  </p>
                </div>
                <button type="button" onClick={() => setCouponModalOpen(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Discount Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ATELIER20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm font-mono-code font-bold text-[#631828] uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Discount Type</label>
                    <select
                      value={couponForm.discount_type}
                      onChange={(e) =>
                        setCouponForm({
                          ...couponForm,
                          discount_type: e.target.value as 'percentage' | 'fixed',
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-semibold"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed PKR (Rs.)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {couponForm.discount_type === 'percentage'
                        ? 'Percentage Value (%) *'
                        : 'Discount Amount (PKR) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={couponForm.discount_type === 'percentage' ? 100 : undefined}
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm font-mono-code font-bold text-[#631828]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Minimum Order (PKR)</label>
                    <input
                      type="number"
                      min={0}
                      value={couponForm.min_order_pkr}
                      onChange={(e) => setCouponForm({ ...couponForm, min_order_pkr: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-sm font-mono-code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Usage Limit (Optional)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 100 (Blank = unlimited)"
                      value={couponForm.usage_limit}
                      onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Per-Customer Limit (Optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 1 per customer"
                      value={couponForm.per_customer_limit}
                      onChange={(e) =>
                        setCouponForm({ ...couponForm, per_customer_limit: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={couponForm.expires_at}
                    onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                  />
                  <p className="text-[10px] text-[#66585B] mt-1">
                    Leave blank if this privilege code should never expire.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Private trunk show 15% privilege"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold pt-1">
                  <input
                    type="checkbox"
                    checked={couponForm.is_active}
                    onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })}
                    className="accent-[#631828]"
                  />
                  Active and redeemable at checkout
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#EFE9DC] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider disabled:opacity-60"
                >
                  {savingCoupon && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A06E]" />}
                  <span>
                    {savingCoupon
                      ? 'Saving...'
                      : editingCoupon
                      ? 'Save Coupon Changes'
                      : 'Create Coupon'}
                  </span>
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          MODAL: PRINTABLE ORDER INVOICE (FONER BRANDED)
         =================================================================== */}
      <AnimatePresence>
        {printingInvoiceOrder && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-3xl rounded-3xl bg-white text-[#1F181A] border border-[#631828]/30 p-8 shadow-2xl my-8 print:shadow-none print:border-none print:p-0 print:m-0"
            >
              {/* Top Action Bar (Hidden when printing) */}
              <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#631828]/15 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#631828]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#631828]">
                    Official Printable Order Invoice
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintingInvoiceOrder(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#EFE9DC] hover:bg-[#E5DCCB] text-[#1F181A] text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Invoice Header: Foner Branding + Order Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-[#631828]">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#631828] text-[#F7F3EB] flex items-center justify-center font-serif-editorial text-xl font-bold">
                      F
                    </div>
                    <div>
                      <h2 className="font-serif-editorial text-3xl font-bold tracking-tight text-[#1F181A]">
                        {settings.store_name || 'FONER'}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#631828] font-bold">
                        {settings.tagline || 'Oxblood & Travertine Atelier'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#66585B] mt-2">
                    {settings.atelier_address} • {settings.support_email} • {settings.support_phone}
                  </p>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] font-mono-code text-xs font-bold uppercase">
                    OFFICIAL ORDER INVOICE
                  </span>
                  <p className="font-mono-code text-lg font-bold text-[#1F181A] mt-1">
                    Order ID: {printingInvoiceOrder.order_number}
                  </p>
                  <p className="text-xs text-[#66585B] font-mono-code">
                    Date:{' '}
                    {new Date(printingInvoiceOrder.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs font-semibold uppercase text-[#1F181A]">
                    Status:{' '}
                    <span className="text-[#631828] font-bold">
                      {printingInvoiceOrder.order_status.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-xs font-semibold text-[#1F181A]">
                    Payment Method:{' '}
                    <span className="font-bold text-[#631828]">Cash on Delivery (COD)</span>
                  </p>
                </div>
              </div>

              {/* Customer & Delivery Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#631828]/20 text-xs">
                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#631828] block">
                    Customer Details
                  </span>
                  <p className="text-sm font-bold text-[#1F181A]">
                    {printingInvoiceOrder.customer_name}
                  </p>
                  <p className="text-[#66585B]">
                    Email:{' '}
                    <span className="font-mono-code text-[#1F181A]">
                      {printingInvoiceOrder.customer_email}
                    </span>
                  </p>
                  <p className="text-[#66585B]">
                    Phone:{' '}
                    <span className="font-mono-code text-[#1F181A]">
                      {printingInvoiceOrder.customer_phone}
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#631828] block">
                    Delivery Address
                  </span>
                  <p className="text-sm font-bold text-[#1F181A]">
                    {printingInvoiceOrder.shipping_address}
                  </p>
                  <p className="text-[#1F181A]">
                    Area / Region:{' '}
                    <span className="font-semibold">
                      {printingInvoiceOrder.shipping_area || 'Standard Delivery Zone'}
                    </span>
                  </p>
                  <p className="text-[#1F181A]">
                    City:{' '}
                    <span className="font-semibold">
                      {printingInvoiceOrder.shipping_city || printingInvoiceOrder.city}
                    </span>
                    {printingInvoiceOrder.postal_code
                      ? ` • Postal Code: ${printingInvoiceOrder.postal_code}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Products Table */}
              <div className="py-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#1F181A] text-[10px] font-bold uppercase tracking-wider text-[#66585B]">
                      <th className="py-2.5 px-2">Product</th>
                      <th className="py-2.5 px-2">Variant</th>
                      <th className="py-2.5 px-2">SKU</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Unit Price</th>
                      <th className="py-2.5 px-2 text-right">Discount</th>
                      <th className="py-2.5 px-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#631828]/15">
                    {printingInvoiceOrder.items_json.map((item, idx) => {
                      const matchedProd = products.find((p) => p.id === item.product_id);
                      const sku =
                        item.variant_sku ||
                        item.sku ||
                        matchedProd?.sku ||
                        `FNR-${item.product_id}`;
                      const unitPrice = Number(item.price_pkr || 0);
                      const qty = Math.max(1, Number(item.quantity || 1));
                      const lineSubtotal = unitPrice * qty;
                      const orderSub = Math.max(
                        1,
                        Number(printingInvoiceOrder.subtotal_pkr || lineSubtotal)
                      );
                      const orderDisc = Number(printingInvoiceOrder.discount_pkr || 0);
                      const proportionalDiscount =
                        orderDisc > 0 ? Math.round((lineSubtotal / orderSub) * orderDisc) : 0;
                      const lineTotal = Math.max(0, lineSubtotal - proportionalDiscount);

                      return (
                        <tr key={idx}>
                          <td className="py-3 px-2 font-semibold text-[#1F181A]">{item.title}</td>
                          <td className="py-3 px-2 font-mono-code text-[11px] text-[#66585B]">
                            {item.selected_size}
                            {item.selected_color ? ` / ${item.selected_color}` : ''}
                          </td>
                          <td className="py-3 px-2 font-mono-code text-[11px] text-[#631828] font-bold">
                            {sku}
                          </td>
                          <td className="py-3 px-2 text-center font-mono-code font-bold">{qty}</td>
                          <td className="py-3 px-2 text-right font-mono-code">
                            PKR {unitPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right font-mono-code text-emerald-900">
                            {proportionalDiscount > 0
                              ? `-PKR ${proportionalDiscount.toLocaleString()}`
                              : 'PKR 0'}
                          </td>
                          <td className="py-3 px-2 text-right font-mono-code font-bold text-[#1F181A]">
                            PKR {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Footer */}
              <div className="pt-4 border-t-2 border-[#1F181A] flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                <div className="space-y-1 text-xs">
                  <span className="inline-block px-3 py-1 rounded-lg bg-[#EFE9DC] border border-[#631828]/25 font-bold text-[#631828]">
                    Payment Method: Cash on Delivery (COD)
                  </span>
                  <p className="text-[11px] text-[#66585B] max-w-sm mt-1">
                    Thank you for shopping with {settings.store_name || 'Foner'}. Please retain this invoice for warranty, exchange, or delivery verification.
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Subtotal:</span>
                    <span className="font-mono-code font-semibold">
                      PKR {Number(printingInvoiceOrder.subtotal_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">
                      Discount
                      {printingInvoiceOrder.coupon_code
                        ? ` (${printingInvoiceOrder.coupon_code})`
                        : ''}
                      :
                    </span>
                    <span className="font-mono-code font-semibold text-emerald-900">
                      -PKR {Number(printingInvoiceOrder.discount_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Shipping:</span>
                    <span className="font-mono-code font-semibold">
                      PKR {Number(printingInvoiceOrder.delivery_fee_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#631828]/20 text-base font-bold text-[#631828]">
                    <span>Final Total:</span>
                    <span className="font-mono-code">
                      PKR {Number(printingInvoiceOrder.total_pkr || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
