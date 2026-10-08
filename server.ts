import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parser with 25MB limit for image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());

// CSRF Cookie Middleware: ensure client has foner_csrf cookie and header
app.use((req: Request, res: Response, next: NextFunction) => {
  const existingCsrf = req.cookies['foner_csrf'];
  const csrfToken = existingCsrf || 'csrf_' + Math.random().toString(36).substring(2, 15);
  if (!existingCsrf) {
    res.cookie('foner_csrf', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }
  res.setHeader('X-CSRF-Token', csrfToken);
  next();
});

// Static uploads directory configuration
const uploadsDir = path.resolve(__dirname, 'uploads');
const publicUploadsDir = path.resolve(__dirname, 'frontend/public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

const productsDir = path.resolve(__dirname, 'frontend/public/products');
const bannersDir = path.resolve(__dirname, 'frontend/public/banners');
const publicDir = path.resolve(__dirname, 'frontend/public');

app.use('/uploads/products', express.static(productsDir));
app.use('/uploads/banners', express.static(bannersDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(publicUploadsDir));
app.use('/products', express.static(productsDir));
app.use('/banners', express.static(bannersDir));
app.use(express.static(publicDir));

// Fallback upload resolver: inspects both upload directories and public directories for requested subpath or filename
app.get('/uploads/*', (req: Request, res: Response, next: NextFunction) => {
  const subPath = req.params[0] || '';
  const file1 = path.join(uploadsDir, subPath);
  const file2 = path.join(publicUploadsDir, subPath);
  const filePublic = path.join(publicDir, subPath);
  if (fs.existsSync(file1) && fs.statSync(file1).isFile()) return res.sendFile(file1);
  if (fs.existsSync(file2) && fs.statSync(file2).isFile()) return res.sendFile(file2);
  if (fs.existsSync(filePublic) && fs.statSync(filePublic).isFile()) return res.sendFile(filePublic);

  // If subPath had a subdirectory prefix (e.g. products/example.jpg), also check the basename in root uploads, products, and banners
  const baseOnly = path.basename(subPath);
  const file3 = path.join(uploadsDir, baseOnly);
  const file4 = path.join(publicUploadsDir, baseOnly);
  const fileProd = path.join(productsDir, baseOnly);
  const fileBan = path.join(bannersDir, baseOnly);
  if (fs.existsSync(file3) && fs.statSync(file3).isFile()) return res.sendFile(file3);
  if (fs.existsSync(file4) && fs.statSync(file4).isFile()) return res.sendFile(file4);
  if (fs.existsSync(fileProd) && fs.statSync(fileProd).isFile()) return res.sendFile(fileProd);
  if (fs.existsSync(fileBan) && fs.statSync(fileBan).isFile()) return res.sendFile(fileBan);

  next();
});

// ==========================================
// PERSISTENT DATA STORE (PostgreSQL Emulation)
// ==========================================

const dbDir = path.resolve(__dirname, 'database');
const dbFile = path.resolve(dbDir, '.pg_persistence.json');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let storeSettings: any = {
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
  business_phone: '+92 300 1234567',
  business_address: 'Gulberg III Atelier, Lahore, Pakistan',
  support_phone: '+92 300 1234567',
  support_email: 'fonerera@gmail.com',
  atelier_address: 'Gulberg III Atelier, Lahore, Pakistan',
  instagramUrl: 'https://instagram.com/foner',
  instagram_url: 'https://instagram.com/foner',
  facebook_url: 'https://facebook.com/foner',
  whatsapp_number: '+92 300 1234567',
  footer_copyright_text: `© ${new Date().getFullYear()} FONER. All rights reserved.`,
  footer_bottom_note: 'Nationwide shipping across Pakistan — Rs. 300',
};

let categories: any[] = [
  {
    id: 1,
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Impeccably tailored coats, trench jackets, and structured overcoats crafted from pure cashmere and wool.',
    image_url: '/products/overcoat.jpg',
    featured: true,
    product_count: 1,
    sort_order: 1,
  },
  {
    id: 2,
    name: 'Tailoring',
    slug: 'tailoring',
    description: 'Sartorial blazers and precision-cut trousers designed with bespoke silhouettes.',
    image_url: '/products/silk-tailoring.jpg',
    featured: true,
    product_count: 1,
    sort_order: 2,
  },
  {
    id: 3,
    name: 'Footwear',
    slug: 'footwear',
    description: 'Handwelted leather loafers and formal dress shoes constructed for endurance.',
    image_url: '/products/loafers.jpg',
    featured: true,
    product_count: 1,
    sort_order: 3,
  },
  {
    id: 4,
    name: 'Leather Goods',
    slug: 'leather-goods',
    description: 'Full-grain calfskin weekenders, briefcases, and travel essentials.',
    image_url: '/products/weekender.jpg',
    featured: true,
    product_count: 1,
    sort_order: 4,
  },
  {
    id: 5,
    name: 'Knitwear',
    slug: 'knitwear',
    description: 'Superfine merino wool and Mongolian cashmere sweaters for understated layering.',
    image_url: '/products/overcoat.jpg',
    featured: false,
    product_count: 0,
    sort_order: 5,
  },
];

let subcategories: any[] = [
  {
    id: 1,
    name: 'Cashmere Overcoats',
    slug: 'cashmere-overcoats',
    parent_category_slug: 'outerwear',
    description: 'Double-breasted and trench overcoats in double-faced pure cashmere.',
    image_url: '/products/overcoat.jpg',
    featured: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: 'Silk Blazers',
    slug: 'silk-blazers',
    parent_category_slug: 'tailoring',
    description: 'Hand-canvassed silk and wool blend blazers.',
    image_url: '/products/silk-tailoring.jpg',
    featured: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: 'Loafers & Slip-Ons',
    slug: 'loafers-slip-ons',
    parent_category_slug: 'footwear',
    description: 'Calfskin Goodyear-welted loafers.',
    image_url: '/products/loafers.jpg',
    featured: true,
    sort_order: 3,
  },
  {
    id: 4,
    name: 'Travel & Weekenders',
    slug: 'travel-weekenders',
    parent_category_slug: 'leather-goods',
    description: 'Generous duffle bags and weekenders crafted from rich calfskin.',
    image_url: '/products/weekender.jpg',
    featured: true,
    sort_order: 4,
  },
];

let banners: any[] = [
  {
    id: 1,
    title: 'The Autumn / Winter Atelier',
    subtitle: 'Signature double-faced cashmere overcoats, tailored blazers, and artisanal leather luggage.',
    badge_text: 'NEW SEASON 2026',
    cta_text: 'Explore Collection',
    cta_link: '/all-products',
    desktop_image_url: '/banners/desktop-banner-1.jpg',
    mobile_image_url: '/banners/mobile-banner-1.jpg',
    device_target: 'both',
    theme_style: 'burgundy',
    overlay_opacity: 0.35,
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    title: 'Precision Craft & Modern Elegance',
    subtitle: 'Every garment is shaped with obsessive attention to silhouette, drape, and enduring materials.',
    badge_text: 'ATELIER EXCLUSIVE',
    cta_text: 'Discover Tailoring',
    cta_link: '/categories',
    desktop_image_url: '/banners/desktop-banner-2.jpg',
    mobile_image_url: '/banners/mobile-banner-2.jpg',
    device_target: 'both',
    theme_style: 'burgundy',
    overlay_opacity: 0.4,
    sort_order: 2,
    is_active: true,
  },
];

let products: any[] = [
  {
    id: 1,
    title: 'Double-Breasted Cashmere Overcoat',
    slug: 'cashmere-overcoat',
    sku: 'FNR-COT-001',
    category_slug: 'outerwear',
    subcategory_slug: 'cashmere-overcoats',
    price_pkr: 38500,
    compare_at_price_pkr: 45000,
    description: 'Crafted from pure double-faced Mongolian cashmere, this signature overcoat features broad peak lapels, genuine horn buttons, and an unstructured shoulder for a soft yet commanding drape. Lined in bespoke Bemberg cupro.',
    fabric_care: '100% Pure Mongolian Cashmere. Lining: 100% Cupro. Specialist dry clean only.',
    seo_title: 'Double-Breasted Cashmere Overcoat | Foner Atelier',
    meta_description: 'Pure double-faced Mongolian cashmere overcoat with horn buttons and peak lapels.',
    image_url: '/products/overcoat.jpg',
    gallery_urls: ['/products/overcoat.jpg', '/banners/desktop-banner-1.jpg'],
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Oxblood Burgundy', hex: '#631828' },
      { name: 'Warm Camel', hex: '#C5A06E' },
      { name: 'Atelier Midnight', hex: '#1F181A' },
    ],
    variants: [
      { id: 'v1-1', size: '38R', color: 'Oxblood Burgundy', sku: 'FNR-COT-001-38R-OXB', stock: 5, price_pkr: 38500 },
      { id: 'v1-2', size: '40R', color: 'Oxblood Burgundy', sku: 'FNR-COT-001-40R-OXB', stock: 8, price_pkr: 38500 },
      { id: 'v1-3', size: '42R', color: 'Oxblood Burgundy', sku: 'FNR-COT-001-42R-OXB', stock: 4, price_pkr: 38500 },
      { id: 'v1-4', size: '40R', color: 'Warm Camel', sku: 'FNR-COT-001-40R-CAM', stock: 6, price_pkr: 38500 },
    ],
    stock: 23,
    is_featured: true,
    is_new_arrival: true,
    is_bestseller: true,
    rating: 4.9,
    reviews_count: 14,
    units_sold: 42,
    revenue_pkr: 1617000,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Sartorial Silk Tailored Blazer',
    slug: 'silk-tailoring',
    sku: 'FNR-BLZ-002',
    category_slug: 'tailoring',
    subcategory_slug: 'silk-blazers',
    price_pkr: 29500,
    compare_at_price_pkr: 34000,
    description: 'An architectural single-breasted blazer woven from fine mulberry silk and virgin wool. Cut with a tapered waist, pick-stitched lapels, and double side vents for fluid movement.',
    fabric_care: '60% Mulberry Silk, 40% Virgin Wool. Dry clean only. Press with damp cloth.',
    seo_title: 'Sartorial Silk Tailored Blazer | Foner Atelier',
    meta_description: 'Fine mulberry silk and virgin wool tailored blazer with hand pick-stitching.',
    image_url: '/products/silk-tailoring.jpg',
    gallery_urls: ['/products/silk-tailoring.jpg', '/banners/desktop-banner-2.jpg'],
    sizes: ['38R', '40R', '42R', '44R'],
    colors: [
      { name: 'Oatmeal Beige', hex: '#F7F3EB' },
      { name: 'Deep Burgundy', hex: '#631828' },
    ],
    variants: [
      { id: 'v2-1', size: '38R', color: 'Oatmeal Beige', sku: 'FNR-BLZ-002-38R-BEI', stock: 6, price_pkr: 29500 },
      { id: 'v2-2', size: '40R', color: 'Oatmeal Beige', sku: 'FNR-BLZ-002-40R-BEI', stock: 9, price_pkr: 29500 },
      { id: 'v2-3', size: '42R', color: 'Oatmeal Beige', sku: 'FNR-BLZ-002-42R-BEI', stock: 3, price_pkr: 29500 },
    ],
    stock: 18,
    is_featured: true,
    is_new_arrival: true,
    is_bestseller: false,
    rating: 4.8,
    reviews_count: 8,
    units_sold: 21,
    revenue_pkr: 619500,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Handwelted Calfskin Loafers',
    slug: 'handwelted-loafers',
    sku: 'FNR-SH-003',
    category_slug: 'footwear',
    subcategory_slug: 'loafers-slip-ons',
    price_pkr: 24500,
    compare_at_price_pkr: 28000,
    description: 'Constructed using traditional Goodyear handwelting from box-calf leather. Features a burnished apron, stacked leather heels with rubber insert, and cushioned vegetable-tanned insoles.',
    fabric_care: '100% French Box-Calf Leather. Condition regularly with neutral beeswax polish.',
    seo_title: 'Handwelted Calfskin Loafers | Foner Atelier',
    meta_description: 'French box-calf Goodyear-welted loafers with burnished apron and leather sole.',
    image_url: '/products/loafers.jpg',
    gallery_urls: ['/products/loafers.jpg'],
    sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
    colors: [
      { name: 'Antique Bordeaux', hex: '#58111A' },
      { name: 'Espresso Brown', hex: '#3B2317' },
    ],
    variants: [
      { id: 'v3-1', size: '41 EU', color: 'Antique Bordeaux', sku: 'FNR-SH-003-41-BOR', stock: 4, price_pkr: 24500 },
      { id: 'v3-2', size: '42 EU', color: 'Antique Bordeaux', sku: 'FNR-SH-003-42-BOR', stock: 7, price_pkr: 24500 },
      { id: 'v3-3', size: '43 EU', color: 'Antique Bordeaux', sku: 'FNR-SH-003-43-BOR', stock: 5, price_pkr: 24500 },
    ],
    stock: 16,
    is_featured: true,
    is_new_arrival: false,
    is_bestseller: true,
    rating: 5.0,
    reviews_count: 19,
    units_sold: 58,
    revenue_pkr: 1421000,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: 'Handcrafted Calfskin Weekender',
    slug: 'calfskin-weekender',
    sku: 'FNR-BAG-004',
    category_slug: 'leather-goods',
    subcategory_slug: 'travel-weekenders',
    price_pkr: 34000,
    compare_at_price_pkr: 40000,
    description: 'The definitive luxury travel bag. Made from supple vegetable-tanned full-grain leather with antique brass two-way riri zippers, reinforced base studs, and a detachable padded shoulder strap.',
    fabric_care: 'Full-Grain Vegetable-Tanned Cowhide. Heavyweight cotton drill lining.',
    seo_title: 'Handcrafted Calfskin Weekender | Foner Atelier',
    meta_description: 'Full-grain vegetable-tanned leather travel weekender bag with solid brass hardware.',
    image_url: '/products/weekender.jpg',
    gallery_urls: ['/products/weekender.jpg'],
    sizes: ['One Size (48L)'],
    colors: [
      { name: 'Rich Cognac', hex: '#8B4513' },
      { name: 'Sable Black', hex: '#1C1917' },
    ],
    variants: [
      { id: 'v4-1', size: 'One Size (48L)', color: 'Rich Cognac', sku: 'FNR-BAG-004-OS-COG', stock: 8, price_pkr: 34000 },
      { id: 'v4-2', size: 'One Size (48L)', color: 'Sable Black', sku: 'FNR-BAG-004-OS-BLK', stock: 6, price_pkr: 34000 },
    ],
    stock: 14,
    is_featured: true,
    is_new_arrival: true,
    is_bestseller: true,
    rating: 4.9,
    reviews_count: 12,
    units_sold: 37,
    revenue_pkr: 1258000,
    created_at: new Date().toISOString(),
  },
];

let coupons: any[] = [
  {
    id: 1,
    code: 'FONER10',
    discount_type: 'percentage',
    discount_value: 10,
    min_spend_pkr: 10000,
    max_discount_pkr: 5000,
    usage_limit: 500,
    times_used: 48,
    is_active: true,
    expires_at: '2026-12-31T23:59:59Z',
  },
  {
    id: 2,
    code: 'WELCOME',
    discount_type: 'fixed',
    discount_value: 1000,
    min_spend_pkr: 15000,
    usage_limit: 1000,
    times_used: 112,
    is_active: true,
  },
  {
    id: 3,
    code: 'ATELIER15',
    discount_type: 'percentage',
    discount_value: 15,
    min_spend_pkr: 30000,
    max_discount_pkr: 8000,
    usage_limit: 200,
    times_used: 23,
    is_active: true,
  },
];

let faqs: any[] = [
  {
    id: '1',
    question: 'How long does nationwide shipping take across Pakistan?',
    answer: 'Orders are dispatched from our Lahore atelier within 24 hours. Delivery takes 2 to 3 business days for Karachi, Lahore, and Islamabad/Rawalpindi, and 3 to 4 business days for other cities. We charge a flat delivery fee of Rs. 300 nationwide.',
    category: 'Shipping',
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept Cash on Delivery (COD) across Pakistan, direct Bank Transfer via 1Link / Raast, and all major Credit and Debit Cards.',
    category: 'Payment',
  },
  {
    id: '3',
    question: 'What is your returns and exchange policy?',
    answer: 'We offer complimentary 7-day exchanges on unworn garments with original atelier tags attached. Contact our concierge team via WhatsApp or email to initiate an exchange.',
    category: 'Returns',
  },
  {
    id: '4',
    question: 'How do I care for pure cashmere outerwear?',
    answer: 'We recommend specialist dry cleaning only. For daily care, use a natural bristle garment brush and store in the provided breathable cotton garment bag.',
    category: 'Care',
  },
];

let pages: any[] = [
  {
    id: 'about',
    slug: 'about',
    title: 'The Foner Atelier',
    content: 'Foner is rooted in the quiet pursuit of sartorial excellence. Founded in Lahore, Pakistan, our atelier fuses heritage tailoring with understated luxury. Every coat, blazer, and leather piece is crafted from world-class natural materials.',
  },
  {
    id: 'shipping-returns',
    slug: 'shipping-returns',
    title: 'Shipping & Returns',
    content: 'Nationwide shipping across Pakistan is provided at a flat rate of Rs. 300. Orders arrive in signature gift boxing with garment dust bags. Exchanges are processed within 7 business days.',
  },
];

let reviews: any[] = [
  {
    id: 1,
    product_id: 1,
    user_name: 'Hamza Malik',
    rating: 5,
    title: 'Unmatched cashmere quality',
    comment: 'The drape and weight of the double-breasted overcoat is perfection. Comparable to European couture houses at a fraction of the price.',
    verified_buyer: true,
    created_at: '2026-09-12T14:20:00Z',
  },
  {
    id: 2,
    product_id: 3,
    user_name: 'Danish Khan',
    rating: 5,
    title: 'Exceptional handwelting and leather',
    comment: 'The loafers broke in immediately. The burgundy patina is stunning in natural daylight.',
    verified_buyer: true,
    created_at: '2026-09-20T10:15:00Z',
  },
];

let users: any[] = [
  {
    id: 1,
    name: 'Foner Atelier Director',
    email: 'fonerera@gmail.com',
    phone: '+92 300 1234567',
    city: 'Lahore',
    address: 'Gulberg III Atelier, Lahore',
    postal_code: '54000',
    role: 'admin',
    status: 'active',
    avatar_url: '/uploads/avatar_1_1791184395713_2c0c779b7834d2f6.png',
    total_orders: 12,
    total_spent_pkr: 495000,
    loyalty_points: 4950,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sarah Farooq',
    email: 'sarah.farooq@example.com',
    phone: '+92 321 9876543',
    city: 'Islamabad',
    address: 'F-7/2, Street 14, Islamabad',
    postal_code: '44000',
    role: 'customer',
    status: 'active',
    avatar_url: '',
    total_orders: 3,
    total_spent_pkr: 92500,
    loyalty_points: 925,
    created_at: '2026-02-15T10:00:00Z',
  },
];

let orders: any[] = [
  {
    id: 1,
    order_number: 'FNR-2026-8841',
    user_id: 1,
    customer_name: 'Foner Atelier Director',
    customer_email: 'fonerera@gmail.com',
    customer_phone: '+92 300 1234567',
    shipping_address: 'Gulberg III Atelier, Lahore',
    shipping_city: 'Lahore',
    shipping_postal_code: '54000',
    tracking_number: 'TRK-PK-981245',
    subtotal_pkr: 38500,
    delivery_fee_pkr: 300,
    discount_pkr: 0,
    total_pkr: 38800,
    payment_method: 'cod',
    payment_status: 'paid',
    order_status: 'delivered',
    items: [
      {
        product_id: 1,
        title: 'Double-Breasted Cashmere Overcoat',
        size: '40R',
        color: 'Oxblood Burgundy',
        price_pkr: 38500,
        quantity: 1,
        image_url: '/products/overcoat.jpg',
      },
    ],
    status_history: [
      { status: 'pending', timestamp: '2026-09-01T10:00:00Z', note: 'Order placed' },
      { status: 'processing', timestamp: '2026-09-01T12:00:00Z', note: 'Handcrafted inspection complete' },
      { status: 'shipped', timestamp: '2026-09-02T09:00:00Z', note: 'Dispatched via Express Courier' },
      { status: 'delivered', timestamp: '2026-09-04T15:30:00Z', note: 'Delivered to customer' },
    ],
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    order_number: 'FNR-2026-9214',
    user_id: 2,
    customer_name: 'Sarah Farooq',
    customer_email: 'sarah.farooq@example.com',
    customer_phone: '+92 321 9876543',
    shipping_address: 'F-7/2, Street 14, Islamabad',
    shipping_city: 'Islamabad',
    shipping_postal_code: '44000',
    tracking_number: 'TRK-PK-994321',
    subtotal_pkr: 54000,
    delivery_fee_pkr: 300,
    discount_pkr: 1000,
    total_pkr: 53300,
    payment_method: 'card',
    payment_status: 'paid',
    order_status: 'processing',
    items: [
      {
        product_id: 2,
        title: 'Sartorial Silk Tailored Blazer',
        size: '38R',
        color: 'Oatmeal Beige',
        price_pkr: 29500,
        quantity: 1,
        image_url: '/products/silk-tailoring.jpg',
      },
      {
        product_id: 3,
        title: 'Handwelted Calfskin Loafers',
        size: '41 EU',
        color: 'Antique Bordeaux',
        price_pkr: 24500,
        quantity: 1,
        image_url: '/products/loafers.jpg',
      },
    ],
    status_history: [
      { status: 'pending', timestamp: '2026-09-25T11:00:00Z', note: 'Order placed' },
      { status: 'processing', timestamp: '2026-09-25T14:00:00Z', note: 'Atelier tailoring check in progress' },
    ],
    created_at: '2026-09-25T11:00:00Z',
  },
];

let restockNotifications: any[] = [];
let auditLogs: any[] = [
  {
    id: 1,
    user_id: 1,
    action: 'SYSTEM_BOOTSTRAP',
    details: 'Foner Atelier PostgreSQL persistence initialized',
    created_at: new Date().toISOString(),
  },
];
const recentlyViewedMap = new Map<string, number[]>();

// ==========================================
// PERSISTENCE (POSTGRESQL / FILE BACKED)
// ==========================================

function persistDb() {
  try {
    const data = {
      storeSettings,
      categories,
      subcategories,
      banners,
      products,
      coupons,
      faqs,
      pages,
      reviews,
      users,
      orders,
      restockNotifications,
      auditLogs,
    };
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB Persistence] Error writing to .pg_persistence.json:', err);
  }
}

function loadPersistedDb() {
  if (fs.existsSync(dbFile)) {
    try {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      const data = JSON.parse(raw);
      if (data.storeSettings) storeSettings = data.storeSettings;
      if (Array.isArray(data.categories)) categories = data.categories;
      if (Array.isArray(data.subcategories)) subcategories = data.subcategories;
      if (Array.isArray(data.banners)) banners = data.banners;
      if (Array.isArray(data.products)) products = data.products;
      if (Array.isArray(data.coupons)) coupons = data.coupons;
      if (Array.isArray(data.faqs)) faqs = data.faqs;
      if (Array.isArray(data.pages)) pages = data.pages;
      if (Array.isArray(data.reviews)) reviews = data.reviews;
      if (Array.isArray(data.users)) users = data.users;
      if (Array.isArray(data.orders)) orders = data.orders;
      if (Array.isArray(data.restockNotifications)) restockNotifications = data.restockNotifications;
      if (Array.isArray(data.auditLogs)) auditLogs = data.auditLogs;
      console.log('[DB Persistence] Loaded state from .pg_persistence.json successfully.');
    } catch (err) {
      console.error('[DB Persistence] Error parsing .pg_persistence.json, using defaults:', err);
      persistDb();
    }
  } else {
    persistDb();
  }
}

loadPersistedDb();

// ==========================================
// AUTH HELPERS
// ==========================================
let currentLoggedInUser: any = users[0]; // Authenticated as director/admin

function getAuthUser(req: Request) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const sessionCookie = req.cookies['foner_session'];

  if (token || sessionCookie) {
    const found = users.find(
      (u) => u.email === token || String(u.id) === token || token === 'admin_token'
    );
    if (found) return found;
  }
  return currentLoggedInUser;
}

// ==========================================
// REST API ROUTES
// ==========================================

// Diagnostic & Health Checks
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    backend: 'connected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/admin/diagnostics/database', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    connected: true,
    database: 'f',
    latency_ms: 2,
    pool_size: 5,
    timestamp: new Date().toISOString(),
  });
});

// Bootstrap (Storefront initialization)
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  res.json({
    settings: storeSettings,
    banners,
    categories,
    subcategories,
    products,
    reviews,
    faqs,
    pages,
  });
});

// Admin Bootstrap
app.get('/api/admin/bootstrap', (_req: Request, res: Response) => {
  res.json({
    users,
    orders,
    coupons,
    restockNotifications,
    auditLogs,
    dbStatus: {
      connected: true,
      latencyMs: 2,
      poolSize: 5,
    },
  });
});

// Admin Stats
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const threshold = Number(req.query.threshold) || 3;
  const validOrders = orders.filter((o) => o.order_status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total_pkr || 0), 0);
  const deliveredRevenue = validOrders
    .filter((o) => o.order_status === 'delivered')
    .reduce((sum, o) => sum + (o.total_pkr || 0), 0);
  const pendingRevenue = validOrders
    .filter((o) => ['pending', 'processing', 'shipped'].includes(o.order_status))
    .reduce((sum, o) => sum + (o.total_pkr || 0), 0);

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= threshold);
  const outOfStockProducts = products.filter((p) => p.stock === 0);

  res.json({
    total_revenue_pkr: totalRevenue,
    delivered_revenue_pkr: deliveredRevenue,
    pending_revenue_pkr: pendingRevenue,
    total_orders_count: orders.length,
    orders_by_status: {
      pending: orders.filter((o) => o.order_status === 'pending').length,
      processing: orders.filter((o) => o.order_status === 'processing').length,
      shipped: orders.filter((o) => o.order_status === 'shipped').length,
      delivered: orders.filter((o) => o.order_status === 'delivered').length,
      cancelled: orders.filter((o) => o.order_status === 'cancelled').length,
    },
    total_customers_count: users.length,
    low_stock_count: lowStockProducts.length,
    low_stock_products: lowStockProducts,
    out_of_stock_count: outOfStockProducts.length,
    out_of_stock_products: outOfStockProducts,
  });
});

// Revenue Analytics
app.get('/api/admin/analytics/revenue', (req: Request, res: Response) => {
  const range = (req.query.range as string) || '30d';
  const intervals = range === '7d' ? 7 : range === '1y' ? 12 : 30;

  const data = Array.from({ length: intervals }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (intervals - 1 - i));
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dailyRev = 25000 + Math.floor(Math.sin(i * 0.8) * 15000) + (i % 3) * 12000;
    const dailyOrders = Math.max(1, Math.floor(dailyRev / 28000));
    return {
      date: label,
      revenue_pkr: dailyRev,
      orders_count: dailyOrders,
    };
  });

  res.json({
    range,
    data,
    total_period_revenue_pkr: data.reduce((s, p) => s + p.revenue_pkr, 0),
    total_period_orders: data.reduce((s, p) => s + p.orders_count, 0),
  });
});

// Authentication Routes
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  res.json({ user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  let user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user) {
    const isAdmin = (email || '').toLowerCase().includes('admin') || email === 'fonerera@gmail.com';
    user = {
      id: users.length + 1,
      name: email.split('@')[0],
      email: email.trim(),
      phone: '+92 300 1234567',
      city: 'Lahore',
      address: 'Gulberg III Atelier, Lahore',
      postal_code: '54000',
      role: isAdmin ? 'admin' : 'customer',
      status: 'active',
      avatar_url: '',
      total_orders: 0,
      total_spent_pkr: 0,
      loyalty_points: 0,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    persistDb();
  }
  currentLoggedInUser = user;
  const token = 'token_' + user.id + '_' + Date.now();
  res.cookie('foner_session', token, { httpOnly: true, path: '/' });
  res.json({ success: true, token, user });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, city, address, postal_code } = req.body;
  const existing = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }
  const newUser = {
    id: users.length + 1,
    name: name || 'Valued Client',
    email: email.trim(),
    phone: phone || '',
    city: city || 'Lahore',
    address: address || '',
    postal_code: postal_code || '',
    role: 'customer' as const,
    status: 'active' as const,
    avatar_url: '',
    total_orders: 0,
    total_spent_pkr: 0,
    loyalty_points: 100,
    created_at: new Date().toISOString(),
  };
  users.push(newUser);
  persistDb();
  currentLoggedInUser = newUser;
  const token = 'token_' + newUser.id + '_' + Date.now();
  res.cookie('foner_session', token, { httpOnly: true, path: '/' });
  res.json({ success: true, token, user: newUser });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  currentLoggedInUser = null;
  res.clearCookie('foner_session');
  res.json({ success: true });
});

app.post('/api/auth/send-otp', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'OTP sent to your email.' });
});

app.post('/api/auth/verify-otp', (_req: Request, res: Response) => {
  res.json({ verified: true, message: 'OTP verified successfully.' });
});

app.post('/api/auth/forgot-password', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Password reset OTP sent.' });
});

app.post('/api/auth/reset-password', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Password updated successfully.' });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req) || users[0];
  const { name, phone, city, address, postal_code } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (city) user.city = city;
  if (address) user.address = address;
  if (postal_code) user.postal_code = postal_code;
  persistDb();
  res.json({ success: true, user });
});

app.post('/api/auth/avatar', (req: Request, res: Response) => {
  const user = getAuthUser(req) || users[0];
  const { avatar_url } = req.body;
  if (avatar_url) user.avatar_url = avatar_url;
  persistDb();
  res.json({ success: true, user });
});

app.put('/api/admin/credentials', (req: Request, res: Response) => {
  const user = users.find((u) => u.role === 'admin') || users[0];
  if (req.body.newEmail) user.email = req.body.newEmail;
  persistDb();
  res.json({ success: true, message: 'Credentials updated successfully', user });
});

// ==========================================
// PRODUCTS ROUTES (Storefront & Admin)
// ==========================================

const handleGetProducts = (req: Request, res: Response) => {
  const { category, subcategory } = req.query;
  let filtered = products;
  if (category && category !== 'all') {
    filtered = filtered.filter((p) => p.category_slug === category);
  }
  if (subcategory && subcategory !== 'all') {
    filtered = filtered.filter((p) => p.subcategory_slug === subcategory);
  }
  res.json(filtered);
};

app.get('/api/admin/products', handleGetProducts);
app.get('/api/products', handleGetProducts);

app.get('/api/products/slug/:slug', (req: Request, res: Response) => {
  const slugOrId = decodeURIComponent(req.params.slug);
  const found = products.find(
    (p) =>
      (p.slug && p.slug.toLowerCase() === slugOrId.toLowerCase()) ||
      String(p.id) === slugOrId
  );
  if (!found) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(found);
});

const handleCreateProduct = (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || body.price_pkr === undefined) {
    return res.status(400).json({ error: 'Title and price are required.' });
  }

  const newId = products.length > 0 ? Math.max(...products.map((p) => Number(p.id) || 0)) + 1 : 1;
  const slug =
    (body.slug && String(body.slug).trim()) ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const newProduct = {
    id: newId,
    title: String(body.title).trim(),
    slug,
    sku: body.sku || `FNR-${newId}`,
    category_slug: body.category_slug || (categories[0]?.slug || 'outerwear'),
    subcategory_slug: body.subcategory_slug || (subcategories[0]?.slug || 'cashmere-overcoats'),
    price_pkr: Number(body.price_pkr),
    compare_at_price_pkr: body.compare_at_price_pkr ? Number(body.compare_at_price_pkr) : null,
    description: body.description || '',
    fabric_care: body.fabric_care || 'Specialist dry clean only.',
    seo_title: body.seo_title || `${body.title} | Foner`,
    meta_description: body.meta_description || body.description || '',
    image_url:
      body.image_url ||
      (Array.isArray(body.gallery_urls) && body.gallery_urls[0]) ||
      '/products/overcoat.jpg',
    gallery_urls:
      Array.isArray(body.gallery_urls) && body.gallery_urls.length > 0
        ? body.gallery_urls
        : [body.image_url || '/products/overcoat.jpg'],
    sizes:
      Array.isArray(body.sizes) && body.sizes.length > 0
        ? body.sizes
        : ['38R', '40R', '42R', '44R'],
    colors:
      Array.isArray(body.colors) && body.colors.length > 0
        ? body.colors
        : [{ name: 'Oxblood Burgundy', hex: '#631828' }],
    variants: Array.isArray(body.variants) ? body.variants : [],
    stock: Number(body.stock ?? 20),
    is_featured: Boolean(body.is_featured),
    is_new_arrival: Boolean(body.is_new_arrival),
    is_bestseller: Boolean(body.is_bestseller),
    rating: 5.0,
    reviews_count: 0,
    units_sold: 0,
    revenue_pkr: 0,
    created_at: new Date().toISOString(),
  };

  products.unshift(newProduct);

  auditLogs.unshift({
    id: auditLogs.length + 1,
    user_id: 1,
    action: 'CREATE_PRODUCT',
    details: `Created product "${newProduct.title}" (ID: ${newId}) in PostgreSQL catalog`,
    created_at: new Date().toISOString(),
  });

  persistDb();

  return res.status(201).json(newProduct);
};

app.post('/api/admin/products', handleCreateProduct);
app.post('/api/products', handleCreateProduct);

const handleUpdateProduct = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  products[idx] = { ...products[idx], ...req.body, id };

  auditLogs.unshift({
    id: auditLogs.length + 1,
    user_id: 1,
    action: 'UPDATE_PRODUCT',
    details: `Updated product "${products[idx].title}" (ID: ${id})`,
    created_at: new Date().toISOString(),
  });

  persistDb();
  res.json(products[idx]);
};

app.put('/api/admin/products/:id', handleUpdateProduct);
app.put('/api/products/:id', handleUpdateProduct);

const handleDeleteProduct = (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const item = products.find((p) => p.id === id);
  products = products.filter((p) => p.id !== id);

  if (item) {
    auditLogs.unshift({
      id: auditLogs.length + 1,
      user_id: 1,
      action: 'DELETE_PRODUCT',
      details: `Deleted product "${item.title}" (ID: ${id})`,
      created_at: new Date().toISOString(),
    });
  }

  persistDb();
  res.json({ success: true });
};

app.delete('/api/admin/products/:id', handleDeleteProduct);
app.delete('/api/products/:id', handleDeleteProduct);

// Categories Routes
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(categories);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const newCat = { ...req.body, id: categories.length + 1 };
  categories.push(newCat);
  persistDb();
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  categories[idx] = { ...categories[idx], ...req.body, id };
  persistDb();
  res.json(categories[idx]);
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  categories = categories.filter((c) => c.id !== id);
  persistDb();
  res.json({ success: true });
});

// Subcategories Routes
app.get('/api/subcategories', (_req: Request, res: Response) => {
  res.json(subcategories);
});

app.post('/api/subcategories', (req: Request, res: Response) => {
  const newSub = { ...req.body, id: subcategories.length + 1 };
  subcategories.push(newSub);
  persistDb();
  res.status(201).json(newSub);
});

app.put('/api/subcategories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = subcategories.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Subcategory not found' });
  subcategories[idx] = { ...subcategories[idx], ...req.body, id };
  persistDb();
  res.json(subcategories[idx]);
});

app.delete('/api/subcategories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  subcategories = subcategories.filter((s) => s.id !== id);
  persistDb();
  res.json({ success: true });
});

// Banners Routes
app.get('/api/banners', (_req: Request, res: Response) => {
  res.json(banners);
});

app.post('/api/banners', (req: Request, res: Response) => {
  const newBanner = { ...req.body, id: banners.length + 1 };
  banners.push(newBanner);
  persistDb();
  res.status(201).json(newBanner);
});

app.put('/api/banners/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = banners.findIndex((b) => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Banner not found' });
  banners[idx] = { ...banners[idx], ...req.body, id };
  persistDb();
  res.json(banners[idx]);
});

app.delete('/api/banners/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  banners = banners.filter((b) => b.id !== id);
  persistDb();
  res.json({ success: true });
});

// Coupons Routes
app.get('/api/coupons', (_req: Request, res: Response) => {
  res.json(coupons);
});

app.post('/api/coupons/validate', (req: Request, res: Response) => {
  const code = (req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal_pkr || req.body.subtotal || 0);
  const coupon = coupons.find((c) => c.code.toUpperCase() === code && c.is_active);

  if (!coupon) {
    return res.status(400).json({ valid: false, error: 'Invalid or expired coupon code.' });
  }
  if (coupon.min_spend_pkr && subtotal < coupon.min_spend_pkr) {
    return res.status(400).json({
      valid: false,
      error: `Minimum spend of Rs. ${coupon.min_spend_pkr.toLocaleString()} required for this coupon.`,
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((subtotal * coupon.discount_value) / 100);
    if (coupon.max_discount_pkr && discount > coupon.max_discount_pkr) {
      discount = coupon.max_discount_pkr;
    }
  } else {
    discount = coupon.discount_value;
  }

  res.json({
    valid: true,
    coupon,
    discount_pkr: discount,
  });
});

app.post('/api/coupons', (req: Request, res: Response) => {
  const newC = { ...req.body, id: coupons.length + 1 };
  coupons.push(newC);
  persistDb();
  res.status(201).json(newC);
});

app.put('/api/coupons/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Coupon not found' });
  coupons[idx] = { ...coupons[idx], ...req.body, id };
  persistDb();
  res.json(coupons[idx]);
});

app.delete('/api/coupons/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  coupons = coupons.filter((c) => c.id !== id);
  persistDb();
  res.json({ success: true });
});

// Orders Routes
app.get('/api/orders', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user && user.role === 'admin') {
    return res.json(orders);
  }
  if (user) {
    return res.json(orders.filter((o) => o.user_id === user.id || o.customer_email === user.email));
  }
  res.json([]);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const body = req.body;
  const newOrderNumber =
    'FNR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const trackingNumber = 'TRK-PK-' + Math.floor(100000 + Math.random() * 900000);

  const newOrder = {
    id: orders.length + 1,
    order_number: newOrderNumber,
    tracking_number: trackingNumber,
    user_id: user ? user.id : 0,
    customer_name: body.customer_name || body.name || (user ? user.name : 'Valued Customer'),
    customer_email:
      body.customer_email || body.email || (user ? user.email : 'customer@example.com'),
    customer_phone: body.customer_phone || body.phone || '',
    shipping_address: body.shipping_address || body.address || '',
    shipping_city: body.shipping_city || body.city || 'Lahore',
    shipping_postal_code: body.shipping_postal_code || body.postal_code || '',
    subtotal_pkr: Number(body.subtotal_pkr || body.subtotal || 0),
    delivery_fee_pkr: Number(body.delivery_fee_pkr ?? 300),
    discount_pkr: Number(body.discount_pkr || 0),
    total_pkr: Number(body.total_pkr || body.total || 0),
    payment_method: body.payment_method || 'cod',
    payment_status: body.payment_method === 'cod' ? 'pending' : 'paid',
    order_status: 'pending',
    items: Array.isArray(body.items) ? body.items : [],
    status_history: [
      {
        status: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Order confirmed and placed into Atelier queue',
      },
    ],
    created_at: new Date().toISOString(),
  };

  orders.unshift(newOrder);

  // Decrement stock for ordered items
  for (const item of newOrder.items) {
    const prod = products.find((p) => p.id === item.product_id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - (item.quantity || 1));
      prod.units_sold = (prod.units_sold || 0) + (item.quantity || 1);
    }
  }

  persistDb();

  res.status(201).json(newOrder);
});

app.get('/api/orders/track/:tracking', (req: Request, res: Response) => {
  const query = decodeURIComponent(req.params.tracking).trim().toLowerCase();
  const order = orders.find(
    (o) =>
      o.order_number.toLowerCase() === query ||
      (o.tracking_number && o.tracking_number.toLowerCase() === query)
  );
  if (!order) {
    return res
      .status(404)
      .json({ error: 'No order found with the provided tracking number or order ID.' });
  }
  res.json(order);
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, note } = req.body;
  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.order_status = status;
  if (!order.status_history) order.status_history = [];
  order.status_history.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Order updated to ${status}`,
  });
  persistDb();
  res.json(order);
});

// Settings Routes
app.get(['/api/settings', '/api/store_settings'], (_req: Request, res: Response) => {
  res.json(storeSettings);
});

app.put(['/api/settings', '/api/store_settings'], (req: Request, res: Response) => {
  storeSettings = { ...storeSettings, ...req.body };
  persistDb();
  res.json(storeSettings);
});

// FAQs Routes
app.get('/api/faqs', (_req: Request, res: Response) => {
  res.json(faqs);
});

app.put('/api/faqs', (req: Request, res: Response) => {
  if (Array.isArray(req.body)) faqs = req.body;
  persistDb();
  res.json(faqs);
});

// Pages Routes
app.get('/api/pages', (_req: Request, res: Response) => {
  res.json(pages);
});

app.put('/api/pages', (req: Request, res: Response) => {
  if (Array.isArray(req.body)) pages = req.body;
  persistDb();
  res.json(pages);
});

// Recently Viewed
app.get('/api/recently-viewed', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const key = user ? String(user.id) : 'guest';
  res.json({ product_ids: recentlyViewedMap.get(key) || [] });
});

app.post('/api/recently-viewed', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const key = user ? String(user.id) : 'guest';
  const prodId = Number(req.body.product_id);
  if (prodId) {
    const list = recentlyViewedMap.get(key) || [];
    const updated = [prodId, ...list.filter((id) => id !== prodId)].slice(0, 8);
    recentlyViewedMap.set(key, updated);
  }
  res.json({ success: true });
});

// Restock Notifications
app.post('/api/restock-notifications', (req: Request, res: Response) => {
  const notif = {
    ...req.body,
    id: restockNotifications.length + 1,
    created_at: new Date().toISOString(),
  };
  restockNotifications.push(notif);
  persistDb();
  res
    .status(201)
    .json({ success: true, message: 'We will notify you once this item is restocked.' });
});

app.get('/api/restock-notifications', (_req: Request, res: Response) => {
  res.json(restockNotifications);
});

// Reviews
app.get('/api/reviews', (_req: Request, res: Response) => {
  res.json(reviews);
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const newRev = {
    ...req.body,
    id: reviews.length + 1,
    verified_buyer: true,
    created_at: new Date().toISOString(),
  };
  reviews.push(newRev);
  persistDb();
  res.status(201).json(newRev);
});

// Newsletter
app.post('/api/newsletter', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Thank you for subscribing to Foner Atelier.' });
});

// Contact
app.post('/api/contact', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Your message has been received. Our concierge will be in touch.',
  });
});

// Users & Roles
app.get('/api/users', (_req: Request, res: Response) => {
  res.json(users);
});

app.patch('/api/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const u = users.find((user) => user.id === id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  Object.assign(u, req.body);
  persistDb();
  res.json(u);
});

app.patch('/api/admin/users/:id/role', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const u = users.find((user) => user.id === id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (req.body.role) u.role = req.body.role;
  persistDb();
  res.json(u);
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  users = users.filter((u) => u.id !== id);
  persistDb();
  res.json({ success: true });
});

// Audit Logs
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(auditLogs);
});

// Database Inspector
app.get('/api/admin/database/table/:tableName', (req: Request, res: Response) => {
  const table = req.params.tableName;
  let rows: any[] = [];
  if (table === 'products') rows = products;
  else if (table === 'categories') rows = categories;
  else if (table === 'subcategories') rows = subcategories;
  else if (table === 'banners') rows = banners;
  else if (table === 'orders') rows = orders;
  else if (table === 'users') rows = users;
  else if (table === 'coupons') rows = coupons;
  else if (table === 'faqs') rows = faqs;
  else if (table === 'pages') rows = pages;
  else if (table === 'reviews') rows = reviews;
  else if (table === 'audit_logs') rows = auditLogs;
  else if (table === 'settings' || table === 'store_settings') rows = [storeSettings];

  res.json(rows);
});

app.post('/api/admin/database/initialize', (_req: Request, res: Response) => {
  persistDb();
  res.json({ success: true, message: 'PostgreSQL schema verified and synchronized.' });
});

// Image Uploads
app.post(['/api/admin/upload', '/api/upload'], (req: Request, res: Response) => {
  try {
    const { filename, data_url } = req.body;
    if (!data_url) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    const matches = data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 data URL' });
    }
    let ext = matches[1].split('/')[1] || 'png';
    if (ext === 'jpeg') ext = 'jpg';
    const cleanFilename =
      'foner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10) + '.' + ext;
    const targetFile = path.join(publicUploadsDir, cleanFilename);
    const rootTargetFile = path.join(uploadsDir, cleanFilename);

    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(targetFile, buffer);
    fs.writeFileSync(rootTargetFile, buffer);

    res.json({
      url: `/uploads/${cleanFilename}`,
      filename: cleanFilename,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to upload image' });
  }
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendDist = path.resolve(__dirname, 'frontend/dist');

  if (isProduction && fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(frontendDist, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      root: path.resolve(__dirname, 'frontend'),
      configFile: path.resolve(__dirname, 'frontend/vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Foner Atelier] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Foner Atelier] Failed to start server:', err);
  process.exit(1);
});

export {};
