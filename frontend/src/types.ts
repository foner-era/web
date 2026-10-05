export type UserRole = 'admin' | 'manager' | 'editor' | 'customer';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  postal_code?: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  avatar?: string;
  total_orders: number;
  total_spent_pkr: number;
  loyalty_points: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  accent_color?: string;
  product_count?: number;
  featured: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  parent_category_slug: string;
  description: string;
  image_url: string;
  featured: boolean;
  sort_order?: number;
  created_at?: string;
}

export type BannerDeviceTarget = 'both' | 'desktop' | 'mobile';

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  badge_text: string;
  cta_text: string;
  cta_link: string;
  desktop_image_url: string;
  mobile_image_url: string;
  device_target: BannerDeviceTarget;
  theme_style?: string;
  overlay_opacity: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price_pkr?: number | null;
}

export interface Product {
  id: number;
  title: string;
  slug?: string;
  sku: string;
  category_slug: string;
  subcategory_slug?: string;
  price_pkr: number;
  compare_at_price_pkr: number | null;
  description: string;
  fabric_care: string;
  seo_title?: string;
  meta_description?: string;
  image_url: string;
  gallery_urls: string[];
  sizes: string[];
  colors: ProductColor[];
  variants?: ProductVariant[];
  stock: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  rating: number;
  reviews_count: number;
  units_sold?: number;
  revenue_pkr?: number;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  variantId?: string;
  variantSku?: string;
  variantPricePkr?: number;
  variantStock?: number;
}

export interface RestockNotification {
  id: number;
  product_id: number;
  product_title: string;
  product_sku: string;
  customer_email: string;
  preferred_size: string;
  preferred_color: string;
  status: 'pending' | 'notified';
  notified_at: string | null;
  created_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_pkr: number;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  expires_at?: string | null;
  is_active: boolean;
  usage_count: number;
  created_at?: string;
}

export interface OrderItem {
  product_id: number;
  title: string;
  sku: string;
  variant_id?: string;
  variant_sku?: string;
  price_pkr?: number;
  unit_price_pkr?: number;
  quantity: number;
  selected_size: string;
  selected_color: string;
  image_url: string;
}

export enum PaymentMethod {
  COD = 'COD',
  JAZZCASH = 'JAZZCASH',
  EASYPAISA = 'EASYPAISA',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CRAFTING = 'processing',
  PROCESSING = 'processing',
  DISPATCHED = 'shipped',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_area?: string;
  city?: string;
  postal_code: string;
  order_notes: string;
  payment_method: PaymentMethod | 'COD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'CARD';
  payment_status: PaymentStatus | 'pending' | 'paid' | 'refunded';
  order_status: OrderStatus | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  status?: OrderStatus | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal_pkr: number;
  discount_pkr: number;
  coupon_code: string | null;
  delivery_fee_pkr: number;
  total_pkr: number;
  idempotency_key?: string | null;
  loyalty_points_awarded?: number;
  items_json: OrderItem[];
  items?: OrderItem[];
  created_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  customer_name: string;
  customer_city: string;
  rating: number;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface FooterLinkItem {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
}

export interface FooterSection {
  id: string;
  heading: string;
  links: FooterLinkItem[];
}

export interface FaqItem {
  id: string;
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface InformationalPage {
  slug: 'shipping-returns' | 'contact' | 'faq' | 'track-orders' | 'about' | string;
  title: string;
  subtitle: string;
  content: string;
  secondary_title?: string;
  secondary_content?: string;
  updated_at?: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  tagline: string;
  footer_description?: string;
  footer_brand_tagline?: string;
  footer_brand_badge?: string;
  footer_concierge_heading?: string;
  currency: string;
  currency_symbol: string;
  delivery_fee_pkr: number;
  free_shipping_note?: string;
  announcement_bar: string;
  announcement_bg_color?: string;
  announcement_text_color?: string;
  announcement_enabled?: boolean;
  announcement_link?: string;
  homepage_featured_title?: string;
  homepage_new_arrivals_title?: string;
  faq_json?: string;
  faq_items?: FaqItem[];
  footer_sections_json?: string;
  footer_sections?: FooterSection[];
  pages_json?: string;
  informational_pages?: Record<string, InformationalPage>;
  footer_copyright_text?: string;
  footer_bottom_note?: string;
  contactEmail?: string;
  contact_email?: string;
  business_email?: string;
  business_phone?: string;
  business_address?: string;
  support_phone?: string;
  support_email?: string;
  atelier_address?: string;
  flagship_address?: string;
  working_hours?: string;
  instagramUrl?: string;
  instagram_handle?: string;
  instagram_url?: string;
  facebook_url?: string;
  whatsapp_number?: string;
  social_instagram_url?: string;
  social_facebook_url?: string;
  social_whatsapp_url?: string;
  social_tiktok_url?: string;
}

export interface AuditLog {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  details: string;
  created_at: string;
}

export interface DatabaseTableStatus {
  table_name: string;
  row_count: number;
  columns_count: number;
}

export interface DatabaseStatusInfo {
  engine: 'postgresql';
  connected: boolean;
  database_name: string;
  database_user: string;
  host: string;
  port: number;
  connection_label: string;
  auto_schema_initialized: boolean;
  last_synced_at: string;
  tables: DatabaseTableStatus[];
  schema_sql: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  databaseName: string;
  databaseUser?: string;
  host?: string;
  port?: number;
  serverTime?: string;
}

export type AnalyticsRange = '7d' | '30d' | '3m' | '6m' | '1y';

export interface TopSellingProductStat {
  product_id: number;
  title: string;
  slug?: string;
  sku: string;
  image_url: string;
  category_slug: string;
  units_sold: number;
  revenue_pkr: number;
  orders_count?: number;
  stock?: number;
  price_pkr?: number;
}

export interface CategoryPerformanceStat {
  category_slug: string;
  category_name: string;
  products_sold: number;
  orders_count: number;
  revenue_pkr: number;
}

export interface StoreStatistics {
  total_revenue_pkr: number;
  completed_revenue_pkr: number;
  pending_revenue_pkr: number;
  confirmed_revenue_pkr: number;
  excluded_cancelled_revenue_pkr: number;
  total_orders: number;
  valid_orders_count: number;
  pending_orders_count: number;
  confirmed_orders_count: number;
  processing_orders_count: number;
  shipped_orders_count: number;
  delivered_orders_count: number;
  cancelled_orders_count: number;
  customers_count?: number;
  total_customers?: number;
  products_sold_count?: number;
  top_selling_products?: TopSellingProductStat[];
  category_performance?: CategoryPerformanceStat[];
  order_counts_by_status?: {
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_threshold: number;
  low_stock_products: {
    id: number;
    title: string;
    sku: string;
    stock: number;
    price_pkr: number;
  }[];
  average_order_value_pkr: number;
  totalRevenue?: number;
  completedRevenue?: number;
  totalOrders?: number;
  orderCountsByStatus?: {
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  lowStockCount?: number;
  outOfStockCount?: number;
  updated_at: string;
}

export interface RevenueAnalyticsBucket {
  label: string;
  tooltipDate: string;
  startMs?: number;
  endMs?: number;
  revenue_pkr: number;
  completed_revenue_pkr?: number;
  valid_orders: number;
  completed_orders?: number;
  cancelled_orders: number;
  cancelled_pkr: number;
  products_sold?: number;
}

export interface RevenueAnalyticsResponse {
  range: AnalyticsRange;
  daysCount: number;
  allTimeTotalRevenuePkr: number;
  allTimeExcludedCancelledPkr: number;
  totalRevenuePkr: number;
  completedRevenuePkr: number;
  validOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  excludedCancelledPkr: number;
  averageOrderValuePkr: number;
  productsSoldCount?: number;
  customersCount?: number;
  topSellingProducts?: TopSellingProductStat[];
  categoryPerformance?: CategoryPerformanceStat[];
  buckets: RevenueAnalyticsBucket[];
}

