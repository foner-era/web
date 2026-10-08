import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Truck,
  Phone,
  Mail,
  MapPin,
  Search,
  Send,
  CheckCircle2,
  ShieldCheck,
  Package,
  Lock,
  ArrowLeft,
  ChevronDown,
  Clock,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import {
  FaqItem,
  InformationalPage,
  Order,
  OrderStatus,
  StoreSettings,
  User,
} from '../types';
import { getEffectiveBusinessContact } from '../utils/contact';
import { resolveImageUrl } from '../utils/imageUrl';
import { apiFetch } from '../api';
import { ScrollReveal } from './AnimationSystem';

interface DedicatedPageProps {
  route: 'faq' | 'contact' | 'shipping-returns' | 'track-orders' | 'about';
  settings: StoreSettings;
  faqs: FaqItem[];
  pages: InformationalPage[];
  currentUser: User | null;
  orders: Order[];
  onNavigateRoute: (path: string) => void;
  onOpenAccountModal: () => void;
  onShowToast: (msg: string) => void;
}

const STATUS_STEPS = [
  OrderStatus.PENDING,
  OrderStatus.CRAFTING,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED,
];

export const FooterDedicatedPages: React.FC<DedicatedPageProps> = ({
  route,
  settings,
  faqs,
  pages,
  currentUser,
  orders,
  onNavigateRoute,
  onOpenAccountModal,
  onShowToast,
}) => {
  const pageData = pages.find((p) => p.slug === route);
  const contact = getEffectiveBusinessContact(settings);

  // FAQ state (only one item open at a time)
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Contact form state
  const [contactName, setContactName] = useState(currentUser?.name || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Secure Track Orders state
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackVerifyEmail, setTrackVerifyEmail] = useState(currentUser?.email || '');
  const [trackingSubmitting, setTrackingSubmitting] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser?.email) {
      setTrackVerifyEmail(currentUser.email);
      setContactEmail((prev) => prev || currentUser.email);
      setContactName((prev) => prev || currentUser.name);
      setContactPhone((prev) => prev || currentUser.phone);
    }
  }, [currentUser]);

  const isAuthenticatedCustomer = Boolean(currentUser && currentUser.role === 'customer');
  const myCustomerOrders = isAuthenticatedCustomer
    ? orders.filter(
        (o) =>
          (o.user_id && Number(o.user_id) === Number(currentUser!.id)) ||
          String(o.customer_email || '').trim().toLowerCase() ===
            String(currentUser!.email || '').trim().toLowerCase()
      )
    : [];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError('Please enter your name, email address, and message.');
      return;
    }
    setContactSubmitting(true);
    try {
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          subject: contactSubject.trim() || 'Customer Inquiry',
          message: contactMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message.');
      }
      setContactSuccess(
        data.message ||
          'Thank you for contacting Foner. Our client services team has received your inquiry.'
      );
      setContactSubject('');
      setContactMessage('');
      onShowToast('Your message has been sent.');
    } catch (err: any) {
      setContactError(err?.message || 'Unable to submit inquiry right now.');
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleSecureTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedOrder(null);
    const cleanNum = trackOrderNumber.trim().toUpperCase();
    const cleanEmail = (trackVerifyEmail || currentUser?.email || '').trim().toLowerCase();

    if (!cleanNum) {
      setTrackError('Please enter your order reference number (e.g., FNR-1001).');
      return;
    }
    if (!isAuthenticatedCustomer && !cleanEmail) {
      setTrackError(
        'For security, please enter the email address used when placing this order, or sign in to your customer account.'
      );
      return;
    }

    setTrackingSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/orders/track/${encodeURIComponent(cleanNum)}?email=${encodeURIComponent(cleanEmail)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrackError(
          data.error ||
            'No matching order found for that order number and email address.'
        );
        return;
      }
      setTrackedOrder(data);
    } catch {
      setTrackError('Unable to look up order status right now. Please try again.');
    } finally {
      setTrackingSubmitting(false);
    }
  };

  const renderOrderSummaryCard = (order: Order, idx = 0) => {
    const currentStatus = (order.order_status || order.status || OrderStatus.PENDING) as OrderStatus;
    const stepIndex = STATUS_STEPS.indexOf(currentStatus);
    const lineItems = order.items_json || order.items || [];
    const orderCity = order.shipping_city || order.city || 'Pakistan';

    return (
      <ScrollReveal key={order.id} staggerIndex={idx}>
        <div className="p-5 sm:p-6 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#631828]/15 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-sm font-bold text-[#631828]">
                  #{order.order_number}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#631828] text-[#F7F3EB] text-[10px] font-semibold uppercase tracking-widest">
                  {currentStatus}
                </span>
              </div>
              <p className="text-xs text-[#66585B] mt-0.5">
                Placed on {new Date(order.created_at).toLocaleDateString()} • {orderCity}
              </p>
            </div>

            <div className="text-right">
              <span className="font-mono-code text-lg font-bold text-[#1F181A]">
                Rs. {Number(order.total_pkr || 0).toLocaleString()}
              </span>
              <span className="block text-[10px] text-[#66585B]">{order.payment_method}</span>
            </div>
          </div>

          {currentStatus !== OrderStatus.CANCELLED && (
            <div className="grid grid-cols-4 gap-2 pt-1">
              {STATUS_STEPS.map((st, sIdx) => {
                const reached = stepIndex >= sIdx;
                const isCurrent = stepIndex === sIdx;
                return (
                  <div key={st} className="space-y-1">
                    <div className="h-1.5 rounded-full bg-[#631828]/15 overflow-hidden">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: reached ? 1 : 0 }}
                        transition={{
                          duration: 0.4,
                          delay: sIdx * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{ transformOrigin: 'left' }}
                        className="h-full w-full rounded-full bg-[#631828]"
                      />
                    </div>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-medium capitalize truncate transition-colors ${
                        reached ? 'text-[#631828] font-semibold' : 'text-[#66585B]'
                      }`}
                    >
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#631828] shrink-0 animate-pulse" />
                      )}
                      <span>{st}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 pt-1">
            {lineItems.map((item, i) => {
              const unitPrice = item.price_pkr ?? item.unit_price_pkr ?? 0;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/10 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.image_url && (
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt={item.title}
                        className="w-10 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <p className="font-semibold text-[#1F181A] truncate">{item.title}</p>
                      <p className="text-[11px] text-[#66585B]">
                        Size: {item.selected_size} • Color: {item.selected_color} • Qty:{' '}
                        {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-code font-semibold text-[#631828] shrink-0">
                    Rs. {(unitPrice * item.quantity).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#631828]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#66585B]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#631828]" />
              {order.shipping_address}, {orderCity}
            </span>
            <span className="font-mono-code">
              Subtotal: Rs. {Number(order.subtotal_pkr || 0).toLocaleString()} | Shipping: Rs.{' '}
              {Number(order.delivery_fee_pkr || 300).toLocaleString()}
              {Number(order.discount_pkr || 0) > 0
                ? ` | Discount: -Rs. ${Number(order.discount_pkr).toLocaleString()}`
                : ''}
            </span>
          </div>
        </div>
      </ScrollReveal>
    );
  };

  return (
    <main className="flex-1 pb-20">
      <section className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12 space-y-8">
        {/* Back Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigateRoute('/')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#631828] hover:underline group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Storefront</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { slug: 'shipping-returns', label: 'Shipping & Returns', path: '/shipping-returns' },
              { slug: 'faq', label: 'FAQ', path: '/faq' },
              { slug: 'contact', label: 'Contact', path: '/contact' },
              { slug: 'track-orders', label: 'Track Orders', path: '/track-orders' },
              { slug: 'about', label: 'About', path: '/about' },
            ].map((nav) => (
              <button
                key={nav.slug}
                type="button"
                onClick={() => onNavigateRoute(nav.path)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  route === nav.slug
                    ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                    : 'bg-[#EFE9DC] text-[#66585B] hover:text-[#1F181A] hover:bg-[#E5DCCB]'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            ROUTE 1: SHIPPING & RETURNS PAGE (/shipping-returns)
           ===================================================================== */}
        {route === 'shipping-returns' && (
          <div className="space-y-8">
            <ScrollReveal>
              <div className="p-8 sm:p-10 rounded-3xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#631828] text-[#C5A06E] text-[11px] font-mono-code font-bold uppercase tracking-widest">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Delivery &amp; Returns Policy</span>
                </div>
                <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold">
                  {pageData?.title || 'Shipping & Returns'}
                </h1>
                <p className="text-sm text-[#E5DCCB]/85 max-w-2xl leading-relaxed">
                  {pageData?.subtitle ||
                    `Nationwide delivery across Pakistan (${settings.currency_symbol || 'Rs.'} ${
                      settings.delivery_fee_pkr
                    } flat shipping rate) and hassle-free 14-day exchanges & returns.`}
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <ScrollReveal staggerIndex={1}>
                  <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#631828]">
                      Nationwide Delivery Policy
                    </h2>
                    <div className="text-sm text-[#1F181A] leading-relaxed whitespace-pre-line">
                      {pageData?.content ||
                        `Standard delivery across Pakistan is a flat Rs. ${settings.delivery_fee_pkr} per order. Every garment and leather piece is carefully inspected, steamed, and packaged in our protective Foner garment box before dispatch. Orders are dispatched within 24–48 hours and arrive within 2–4 business days across Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, and all major cities.`}
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal staggerIndex={2}>
                  <div className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#631828]">
                      {pageData?.secondary_title || 'Exchanges & Returns Policy'}
                    </h2>
                    <div className="text-sm text-[#1F181A] leading-relaxed whitespace-pre-line">
                      {pageData?.secondary_content ||
                        `Unworn items in their original condition and packaging with all Foner atelier tags attached can be exchanged for another size or returned within 14 days of delivery. Please contact our client care team at ${contact.email}${contact.hasPhone ? ` or call ${contact.phone}` : ''} with your order reference number to arrange a courier pickup or exchange.`}
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <ScrollReveal staggerIndex={2}>
                  <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Quick Summary
                    </h3>
                    <ul className="space-y-3 text-xs text-[#1F181A]">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#631828] shrink-0 mt-0.5" />
                        <span>
                          <strong>Flat Nationwide Shipping:</strong> Rs. {settings.delivery_fee_pkr}{' '}
                          across all cities in Pakistan.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#631828] shrink-0 mt-0.5" />
                        <span>
                          <strong>Dispatch Window:</strong> 24–48 hours after order confirmation.
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#631828] shrink-0 mt-0.5" />
                        <span>
                          <strong>14-Day Return Window:</strong> Easy size exchanges and returns on
                          unworn items with tags attached.
                        </span>
                      </li>
                    </ul>

                    <div className="pt-3 border-t border-[#631828]/15 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => onNavigateRoute('/track-orders')}
                        className="foner-btn-primary w-full py-3 px-4 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-all"
                      >
                        Track an Order
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateRoute('/contact')}
                        className="w-full py-3 px-4 rounded-xl bg-[#F7F3EB] text-[#631828] border border-[#631828]/25 text-xs font-semibold uppercase tracking-widest hover:bg-[#E5DCCB] transition-all"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROUTE 2: FAQ PAGE (/faq)
           ===================================================================== */}
        {route === 'faq' && (
          <div className="space-y-8">
            <ScrollReveal>
              <div className="p-8 sm:p-10 rounded-3xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#631828] text-[#C5A06E] text-[11px] font-mono-code font-bold uppercase tracking-widest">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Client Care FAQ</span>
                </div>
                <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold">
                  {pageData?.title || 'Frequently Asked Questions'}
                </h1>
                <p className="text-sm text-[#E5DCCB]/85 max-w-2xl leading-relaxed">
                  {pageData?.subtitle ||
                    'Answers to common questions regarding sizing, materials, nationwide shipping, payment methods, and orders.'}
                </p>
                {pageData?.content && (
                  <p className="text-xs text-[#E5DCCB]/75 max-w-2xl leading-relaxed pt-1">
                    {pageData.content}
                  </p>
                )}
              </div>
            </ScrollReveal>

            {/* Search FAQs */}
            <ScrollReveal staggerIndex={1}>
              <div className="relative max-w-xl">
                <Search className="w-4 h-4 text-[#631828] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search questions (e.g., shipping, payment, returns)..."
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 text-xs focus:outline-none focus:border-[#631828]"
                />
                {faqSearch && (
                  <button
                    type="button"
                    onClick={() => setFaqSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#66585B] hover:text-[#631828]"
                    aria-label="Clear FAQ search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </ScrollReveal>

            {/* FAQ Accordion List loaded from PostgreSQL */}
            <div className="space-y-3">
              {faqs
                .filter((item) => {
                  const q = faqSearch.trim().toLowerCase();
                  if (!q) return true;
                  const questionText = (item.q || item.question || '').toLowerCase();
                  const answerText = (item.a || item.answer || '').toLowerCase();
                  return questionText.includes(q) || answerText.includes(q);
                })
                .map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  const questionText = item.q || item.question || '';
                  const answerText = item.a || item.answer || '';
                  return (
                    <ScrollReveal key={item.id || idx} staggerIndex={idx}>
                      <div className="rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 overflow-hidden transition-shadow hover:shadow-sm">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#E5DCCB]/50 transition-colors"
                        >
                          <h3 className="font-serif-editorial text-xl font-bold text-[#1F181A]">
                            {questionText}
                          </h3>
                          <ChevronDown
                            className={`w-5 h-5 text-[#631828] shrink-0 transition-transform duration-250 ${
                              isOpen ? 'rotate-180' : 'rotate-0'
                            }`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-2 text-sm text-[#66585B] leading-relaxed border-t border-[#631828]/10 whitespace-pre-line">
                                {answerText}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </ScrollReveal>
                  );
                })}

              {faqs.length === 0 && (
                <div className="p-8 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 text-center text-xs text-[#66585B]">
                  No FAQ entries found.
                </div>
              )}
            </div>

            <ScrollReveal staggerIndex={3}>
              <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Still have a question?
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Reach out to our client services team at {contact.email}
                    {contact.hasPhone ? ` or ${contact.phone}` : ''}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateRoute('/contact')}
                  className="foner-btn-primary px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-all"
                >
                  Contact Us
                </button>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* =====================================================================
            ROUTE 3: CONTACT PAGE (/contact)
           ===================================================================== */}
        {route === 'contact' && (
          <div className="space-y-8">
            <ScrollReveal>
              <div className="p-8 sm:p-10 rounded-3xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#631828] text-[#C5A06E] text-[11px] font-mono-code font-bold uppercase tracking-widest">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Client Services &amp; Atelier</span>
                </div>
                <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold">
                  {pageData?.title || 'Contact Us'}
                </h1>
                <p className="text-sm text-[#E5DCCB]/85 max-w-2xl leading-relaxed">
                  {pageData?.subtitle ||
                    'Our Lahore atelier and client services team are here to assist with sizing, styling, and order inquiries.'}
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Store Contact Details & Page Content */}
              <div className="lg:col-span-5 space-y-5">
                <ScrollReveal staggerIndex={1}>
                  <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <h2 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Direct Contact Information
                    </h2>
                    <p className="text-xs text-[#66585B] leading-relaxed whitespace-pre-line">
                      {pageData?.content ||
                        'Whether you need bespoke garment measurements, assistance with an existing order, or private appointment scheduling with our atelier, our team responds to all inquiries within 24 business hours.'}
                    </p>

                    <div className="space-y-3.5 pt-2">
                      {contact.hasPhone && (
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 transition-transform duration-200 hover:-translate-y-0.5">
                          <Phone className="w-4 h-4 text-[#631828] mt-0.5 shrink-0" />
                          <div>
                            <span className="block text-[11px] text-[#66585B]">Phone / WhatsApp</span>
                            <a
                              href={`tel:${contact.phone}`}
                              className="font-mono-code text-xs font-bold text-[#1F181A] hover:text-[#631828] transition-colors"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 transition-transform duration-200 hover:-translate-y-0.5">
                        <Mail className="w-4 h-4 text-[#631828] mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-[11px] text-[#66585B]">Email Address</span>
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-xs font-bold text-[#1F181A] hover:text-[#631828] transition-colors"
                          >
                            {contact.email}
                          </a>
                        </div>
                      </div>

                      {contact.hasAddress && (
                        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 transition-transform duration-200 hover:-translate-y-0.5">
                          <MapPin className="w-4 h-4 text-[#631828] mt-0.5 shrink-0" />
                          <div>
                            <span className="block text-[11px] text-[#66585B]">Business Address</span>
                            <span className="text-xs font-bold text-[#1F181A]">
                              {contact.address}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {(pageData?.secondary_title || pageData?.secondary_content) && (
                      <div className="pt-3 border-t border-[#631828]/15 space-y-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#631828] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{pageData?.secondary_title || 'Atelier Hours'}</span>
                        </h3>
                        <p className="text-xs text-[#66585B] whitespace-pre-line">
                          {pageData?.secondary_content}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              </div>

              {/* Contact Inquiry Form (Persisted in PostgreSQL) */}
              <div className="lg:col-span-7">
                <ScrollReveal staggerIndex={2}>
                  <form
                    onSubmit={handleContactSubmit}
                    className="p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4"
                  >
                    <div>
                      <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                        Send Us a Message
                      </h2>
                      <p className="text-xs text-[#66585B] mt-0.5">
                        Fill out the form below and our client care team will get back to you promptly.
                      </p>
                    </div>

                    <AnimatePresence>
                      {contactSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="p-4 rounded-2xl bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-950 font-medium flex items-center gap-2.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                          <span>{contactSuccess}</span>
                        </motion.div>
                      )}

                      {contactError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="p-4 rounded-2xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 font-medium"
                        >
                          {contactError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          placeholder="Order inquiry, sizing, returns..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Message *
                      </label>
                      <textarea
                        rows={5}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="How can we help you?"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="foner-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest transition-all shadow-md disabled:opacity-60"
                    >
                      {contactSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-[#C5A06E] animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#C5A06E]" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </form>
                </ScrollReveal>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROUTE 4: TRACK ORDERS PAGE (/track-orders)
           ===================================================================== */}
        {route === 'track-orders' && (
          <div className="space-y-8">
            <ScrollReveal>
              <div className="p-8 sm:p-10 rounded-3xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#631828] text-[#C5A06E] text-[11px] font-mono-code font-bold uppercase tracking-widest">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Customer Order Tracking</span>
                </div>
                <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold">
                  {pageData?.title || 'Track Your Order'}
                </h1>
                <p className="text-sm text-[#E5DCCB]/85 max-w-2xl leading-relaxed">
                  {pageData?.subtitle ||
                    'Enter your order reference and registered email address, or sign in to your customer account to securely view your order status.'}
                </p>
                {pageData?.content && (
                  <p className="text-xs text-[#E5DCCB]/75 max-w-2xl leading-relaxed pt-1">
                    {pageData.content}
                  </p>
                )}
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Lookup Form */}
              <div className="lg:col-span-5">
                <ScrollReveal staggerIndex={1}>
                  <form
                    onSubmit={handleSecureTrackSubmit}
                    className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                        Track by Order Reference
                      </h2>
                      <Lock className="w-4 h-4 text-[#631828]" />
                    </div>
                    <p className="text-xs text-[#66585B]">
                      To protect customer privacy, order tracking requires verification of the email
                      address associated with the order.
                    </p>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Order Reference Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={trackOrderNumber}
                        onChange={(e) => setTrackOrderNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. FNR-1001"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 font-mono-code text-xs uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Customer Email Address *
                      </label>
                      <input
                        type="email"
                        required={!isAuthenticatedCustomer}
                        value={trackVerifyEmail}
                        onChange={(e) => setTrackVerifyEmail(e.target.value)}
                        placeholder="Email used when placing the order"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                      />
                    </div>

                    <AnimatePresence>
                      {trackError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="p-3.5 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 font-medium"
                        >
                          {trackError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={trackingSubmitting}
                      className="foner-btn-primary w-full py-3.5 px-5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                    >
                      {trackingSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-[#C5A06E] animate-spin" />
                          <span>Verifying Order...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 text-[#C5A06E]" />
                          <span>Track Order</span>
                        </>
                      )}
                    </button>
                  </form>
                </ScrollReveal>
              </div>

              {/* Tracked Result & Customer's Own Authenticated Orders */}
              <div className="lg:col-span-7 space-y-5">
                {trackedOrder && (
                  <div className="space-y-3">
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      Tracked Order Result
                    </h3>
                    {renderOrderSummaryCard(trackedOrder, 0)}
                  </div>
                )}

                <ScrollReveal staggerIndex={2}>
                  <div className="p-6 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                          {isAuthenticatedCustomer
                            ? `Your Account Orders (${myCustomerOrders.length})`
                            : 'Sign In for Full Order History'}
                        </h3>
                        <p className="text-xs text-[#66585B]">
                          {isAuthenticatedCustomer
                            ? `Signed in as ${currentUser?.name} (${currentUser?.email})`
                            : 'Sign in with your customer account to view all of your past and active orders.'}
                        </p>
                      </div>
                      {!isAuthenticatedCustomer && (
                        <button
                          type="button"
                          onClick={onOpenAccountModal}
                          className="foner-btn-primary px-4 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-wider hover:bg-[#430F1B]"
                        >
                          Sign In / Register
                        </button>
                      )}
                    </div>

                    {isAuthenticatedCustomer && myCustomerOrders.length === 0 && (
                      <div className="p-6 rounded-2xl bg-[#F7F3EB] border border-[#631828]/15 text-center space-y-2">
                        <Package className="w-7 h-7 text-[#631828] mx-auto opacity-75" />
                        <p className="text-xs text-[#66585B]">
                          You have not placed any orders under this account yet.
                        </p>
                      </div>
                    )}

                    {isAuthenticatedCustomer && myCustomerOrders.length > 0 && (
                      <div className="space-y-4">
                        {myCustomerOrders.map((o, idx) => renderOrderSummaryCard(o, idx))}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ROUTE 5: ABOUT / STORE INFORMATION PAGE (/about)
           ===================================================================== */}
        {route === 'about' && (
          <div className="space-y-8">
            <ScrollReveal>
              <div className="p-8 sm:p-10 rounded-3xl bg-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/30 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#631828] text-[#C5A06E] text-[11px] font-mono-code font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{settings.store_name || 'FONER'} Atelier</span>
                </div>
                <h1 className="font-serif-editorial text-3xl sm:text-5xl font-bold">
                  {pageData?.title || 'About Foner Atelier'}
                </h1>
                <p className="text-sm text-[#E5DCCB]/85 max-w-2xl leading-relaxed">
                  {pageData?.subtitle || settings.tagline}
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <ScrollReveal staggerIndex={1} className="lg:col-span-7">
                <div className="h-full p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                  <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#631828]">
                    Our Story &amp; Craftsmanship
                  </h2>
                  <div className="text-sm text-[#1F181A] leading-relaxed whitespace-pre-line">
                    {pageData?.content ||
                      'Foner was founded in Lahore with a singular focus: creating enduring outerwear, fine-gauge knitwear, and full-grain leather goods tailored for contemporary wardrobes.'}
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal staggerIndex={2} className="lg:col-span-5">
                <div className="h-full p-6 sm:p-8 rounded-3xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                  <h2 className="font-serif-editorial text-2xl font-bold text-[#631828]">
                    {pageData?.secondary_title || 'Materials & Standards'}
                  </h2>
                  <div className="text-sm text-[#1F181A] leading-relaxed whitespace-pre-line">
                    {pageData?.secondary_content ||
                      'Every piece is cut and finished in small batches to uphold strict quality standards, paired with flat Rs. 300 nationwide delivery across Pakistan.'}
                  </div>
                  <div className="pt-4 border-t border-[#631828]/15 space-y-2 text-xs text-[#66585B]">
                    {contact.hasAddress && (
                      <p>
                        <strong className="text-[#1F181A]">Atelier:</strong> {contact.address}
                      </p>
                    )}
                    {contact.hasPhone && (
                      <p>
                        <strong className="text-[#1F181A]">Phone:</strong>{' '}
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:text-[#631828] font-mono-code"
                        >
                          {contact.phone}
                        </a>
                      </p>
                    )}
                    <p>
                      <strong className="text-[#1F181A]">Email:</strong>{' '}
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-[#631828]"
                      >
                        {contact.email}
                      </a>
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
