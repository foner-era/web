import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  MapPin,
  CreditCard,
  User as UserIcon,
  LogOut,
  Save,
  ShieldCheck,
  Lock,
  MailCheck,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { Order, OrderStatus, Product, User } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  requestPasswordReset,
  confirmPasswordReset,
  apiFetch,
} from '../api';

interface OrderHistoryProps {
  isOpen: boolean;
  initialTab?: 'orders' | 'track' | 'profile';
  onClose: () => void;
  orders: Order[];
  allProducts?: Product[];
  currentUser: User | null;
  onTrackOrder: (orderNumber: string, email?: string) => Promise<Order | null>;
  onLogin: (email: string, password?: string) => Promise<void>;
  onRegister: (payload: {
    name: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    password: string;
    otp: string;
  }) => Promise<void>;
  onUpdateProfile: (payload: {
    name: string;
    phone: string;
    city: string;
    address: string;
    postal_code: string;
  }) => Promise<void>;
  onLogout: () => void;
  onBuyAgain?: (order: Order) => void;
  onCancelOrder?: (order: Order) => Promise<void>;
}

const STATUS_STEPS = [
  OrderStatus.PENDING,
  OrderStatus.CRAFTING,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED,
];

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  isOpen,
  initialTab = 'profile',
  onClose,
  orders,
  currentUser,
  onTrackOrder,
  onLogin,
  onRegister,
  onUpdateProfile,
  onLogout,
  onBuyAgain,
  onCancelOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'track' | 'profile'>(initialTab);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);

  // Auth mode
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('Lahore');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Order tracking
  const [trackInput, setTrackInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatar_url ? (currentUser.avatar_url.startsWith('/') ? currentUser.avatar_url : `/uploads/${currentUser.avatar_url}`) : currentUser?.avatar || '/favicon.svg');
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [trackEmailInput, setTrackEmailInput] = useState(currentUser?.email || '');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Profile editor
  const [profName, setProfName] = useState(currentUser?.name || '');
  const [profPhone, setProfPhone] = useState(currentUser?.phone || '');
  const [profCity, setProfCity] = useState(currentUser?.city || 'Lahore');
  const [profAddress, setProfAddress] = useState(currentUser?.address || '');
  const [profPostal, setProfPostal] = useState(currentUser?.postal_code || '');
  const [profSaving, setProfSaving] = useState(false);
  const [profSavedMessage, setProfSavedMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      setProfName(currentUser.name || '');
      setProfPhone(currentUser.phone || '');
      setProfCity(currentUser.city || 'Lahore');
      setProfAddress(currentUser.address || '');
      setProfPostal(currentUser.postal_code || '');
    } else if (isOpen) {
      setActiveTab('profile');
    }
  }, [currentUser, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      if (!currentUser) {
        setActiveTab('profile');
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAuthenticatedCustomer = Boolean(currentUser);
  const myOrders = isAuthenticatedCustomer
    ? orders.filter(
        (o) =>
          Number(o.user_id) === Number(currentUser!.id) ||
          (o.customer_email &&
            currentUser?.email &&
            o.customer_email.toLowerCase() === currentUser.email.toLowerCase())
      )
    : [];

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    setTrackingLoading(true);
    setTrackError(null);
    try {
      const emailToVerify = (trackEmailInput || currentUser?.email || '').trim().toLowerCase();
      const found = await onTrackOrder(trackInput.trim().toUpperCase(), emailToVerify);
      if (found) {
        setTrackedOrder(found);
      } else {
        setTrackedOrder(null);
        setTrackError('No order found matching that order number and email address.');
      }
    } catch {
      setTrackError('No order found matching that order number and email address.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleRequestResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setResetSuccessMsg(null);
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      setResetOtpSent(true);
      setOtpCooldown(45);
      setResetSuccessMsg(
        res.message ||
          'If an account exists for this email, a 6-digit password reset code has been sent.'
      );
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to process password reset request.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccessMsg(null);
    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanOtp = resetOtp.trim();
    if (!cleanEmail || cleanOtp.length < 6) {
      setAuthError('Please enter your email and the 6-digit verification code.');
      return;
    }
    if (resetNewPassword.length < 6 || resetNewPassword.length > 128) {
      setAuthError('New password must be between 6 and 128 characters.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await confirmPasswordReset(cleanEmail, cleanOtp, resetNewPassword);
      setLoginEmail(cleanEmail);
      setResetOtp('');
      setResetNewPassword('');
      setResetOtpSent(false);
      setAuthMode('login');
      setResetSuccessMsg(res.message || 'Password reset complete. Please sign in with your new password.');
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid or expired password reset code.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await onLogin(loginEmail.trim(), loginPassword);
      setLoginPassword('');
      setActiveTab('profile');
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid email or password.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    setAuthError(null);
    setOtpStatusMsg(null);
    const cleanEmail = regEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address first to receive your 6-digit OTP.');
      return;
    }
    setSendingOtp(true);
    try {
      const res = await sendRegistrationOtp(cleanEmail, regName.trim());
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCooldown(45);
      setOtpStatusMsg(
        res.message || `6-digit verification code sent to ${cleanEmail} (check your Primary Inbox).`
      );
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to send OTP email.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtpInline = async (codeOverride?: string) => {
    setAuthError(null);
    const cleanEmail = regEmail.trim();
    const cleanOtp = (codeOverride ?? regOtp).trim();
    if (!cleanEmail || cleanOtp.length < 6) {
      setAuthError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await verifyRegistrationOtp(cleanEmail, cleanOtp);
      setOtpVerified(true);
      setOtpStatusMsg(res.message || 'Email verified! You can now complete registration.');
    } catch (err: any) {
      setOtpVerified(false);
      setAuthError(err?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regAddress.trim() || !regPassword) {
      setAuthError('Please complete all required fields to create your customer account.');
      return;
    }
    if (!otpSent && !regOtp.trim()) {
      await handleSendOtp();
      return;
    }
    if (!regOtp.trim() && !otpVerified) {
      setAuthError('Please enter the 6-digit OTP verification code sent to your email.');
      return;
    }
    setAuthSubmitting(true);
    try {
      await onRegister({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        city: regCity.trim(),
        address: regAddress.trim(),
        password: regPassword,
        otp: regOtp.trim(),
      });
      setLoginEmail(regEmail.trim());
      setRegPassword('');
      setRegOtp('');
      setOtpSent(false);
      setOtpVerified(false);
      setOtpStatusMsg(null);
      setActiveTab('profile');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to create account.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSaving(true);
    setProfSavedMessage(null);
    try {
      await onUpdateProfile({
        name: profName.trim(),
        phone: profPhone.trim(),
        city: profCity.trim(),
        address: profAddress.trim(),
        postal_code: profPostal.trim(),
      });
      setProfSavedMessage('Your profile has been updated.');
    } finally {
      setProfSaving(false);
    }
  };

  const renderOrderCard = (order: Order) => {
    const currentStatus = (order.order_status || order.status || OrderStatus.PENDING) as OrderStatus;
    const stepIndex = STATUS_STEPS.indexOf(currentStatus);
    const lineItems = order.items_json || order.items || [];
    const orderCity = order.shipping_city || order.city || 'Pakistan';
    return (
      <div
        key={order.id}
        className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4"
      >
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
              Rs. {order.total_pkr.toLocaleString()}
            </span>
            <span className="block text-[10px] text-[#66585B]">{order.payment_method}</span>
          </div>
        </div>

        {/* Status Progress Bar */}
        {currentStatus !== OrderStatus.CANCELLED && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            {STATUS_STEPS.map((st, idx) => {
              const reached = stepIndex >= idx;
              const isCurrent = stepIndex === idx;
              return (
                <div key={st} className="space-y-1">
                  <div className="h-1.5 rounded-full bg-[#631828]/15 overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: reached ? 1 : 0 }}
                      transition={{
                        duration: 0.38,
                        delay: idx * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ transformOrigin: 'left' }}
                      className="h-full w-full rounded-full bg-[#631828]"
                    />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-medium capitalize truncate ${
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

        {/* Line Items */}
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
                      Size: {item.selected_size} • Color: {item.selected_color} • Qty: {item.quantity}
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

        {/* Shipping & Price Breakdown */}
        <div className="pt-2 border-t border-[#631828]/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#66585B]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#631828]" />
            <strong>Delivery Address:</strong> {order.shipping_address}
            {order.shipping_area ? `, ${order.shipping_area}` : ''}, {orderCity}
            {order.postal_code ? ` (${order.postal_code})` : ''}
          </span>
          <span className="font-mono-code">
            Subtotal: Rs. {order.subtotal_pkr.toLocaleString()} | Shipping: Rs.{' '}
            {order.delivery_fee_pkr.toLocaleString()}
            {order.discount_pkr > 0
              ? ` | Discount: -Rs. ${order.discount_pkr.toLocaleString()}`
              : ''}
          </span>
        </div>

        {(onBuyAgain || (onCancelOrder && currentStatus === OrderStatus.PENDING)) && (
          <div className="pt-2 border-t border-[#631828]/15 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[#66585B]">
              Want to reorder these items? Stock &amp; live prices will be verified automatically.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {onCancelOrder && currentStatus === OrderStatus.PENDING && (
                <button
                  type="button"
                  disabled={cancellingOrderId === order.id}
                  onClick={async () => {
                    setCancellingOrderId(order.id);
                    try {
                      await onCancelOrder(order);
                    } finally {
                      setCancellingOrderId(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-800/35 text-red-900 hover:bg-red-900/10 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              )}
              {onBuyAgain && (
                <button
                  type="button"
                  onClick={() => onBuyAgain(order)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#C5A06E]" />
                  <span>Buy Again</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className="relative z-10 w-full max-w-4xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#631828] text-[#C5A06E] flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#1F181A]">
                  Account &amp; Orders
                </h2>
                <p className="text-xs text-[#66585B]">
                  Manage your profile, shipping details, and orders
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#1F181A] hover:bg-[#631828]/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 sm:px-6 pt-3 bg-[#EFE9DC]/60 border-b border-[#631828]/15 flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'orders', label: `Orders (${myOrders.length})`, icon: Package },
              { id: 'track', label: 'Track Order', icon: Search },
              {
                id: 'profile',
                label: isAuthenticatedCustomer
                  ? `Account (${currentUser!.name.split(' ')[0]})`
                  : 'Sign In / Register',
                icon: UserIcon,
              },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-[#631828] text-[#631828] bg-[#F7F3EB]'
                      : 'border-transparent text-[#66585B] hover:text-[#1F181A]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
            {activeTab === 'orders' && (
              <>
                {!isAuthenticatedCustomer ? (
                  <div className="py-12 text-center space-y-4">
                    <Lock className="w-10 h-10 text-[#631828] mx-auto opacity-70" />
                    <div className="space-y-1">
                      <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                        Sign in to view your orders
                      </h3>
                      <p className="text-xs text-[#66585B] max-w-sm mx-auto">
                        Sign in with your customer account to view your order history, or use the Track Order tab with your order number.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
                    >
                      Sign In / Register
                    </button>
                  </div>
                ) : myOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Clock className="w-10 h-10 text-[#631828] mx-auto opacity-70" />
                    <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                      No orders yet
                    </h3>
                    <p className="text-xs text-[#66585B] max-w-sm mx-auto">
                      You have not placed any orders yet, or you can look up an order by number in the Track Order tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">{myOrders.map(renderOrderCard)}</div>
                )}
              </>
            )}

            {activeTab === 'track' && (
              <div className="space-y-5 max-w-xl mx-auto py-4">
                <div className="text-center space-y-1">
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Track Your Order
                  </h3>
                  <p className="text-xs text-[#66585B]">
                    Enter your order number (for example, <span className="font-mono-code font-bold text-[#631828]">FNR-1001</span>) to view delivery status.
                  </p>
                </div>

                <form onSubmit={handleTrackSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={trackInput}
                      onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                      placeholder="Enter order number (e.g. FNR-1001)"
                      className="px-4 py-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 font-mono-code text-xs uppercase"
                    />
                    <input
                      type="email"
                      required={!isAuthenticatedCustomer}
                      value={trackEmailInput}
                      onChange={(e) => setTrackEmailInput(e.target.value)}
                      placeholder="Order email address"
                      className="px-4 py-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={trackingLoading}
                    className="w-full px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
                  >
                    {trackingLoading ? 'Checking...' : 'Track Order'}
                  </button>
                </form>

                {trackError && (
                  <div className="p-3.5 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 text-center">
                    {trackError}
                  </div>
                )}

                {trackedOrder && renderOrderCard(trackedOrder)}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="max-w-xl mx-auto py-2">
                {isAuthenticatedCustomer && currentUser ? (
                  <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-[#631828] text-[#F7F3EB] flex flex-wrap items-center justify-between gap-4 shadow-md">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/30 text-[10px] font-mono-code uppercase tracking-widest text-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Signed In • {currentUser.role === 'admin' ? 'Administrator Account' : 'Verified Customer Account'}
                        </span>
                        <h3 className="font-serif-editorial text-2xl font-bold pt-1">
                          {currentUser.name}
                        </h3>
                        <p className="text-xs text-[#E5DCCB]">{currentUser.email}</p>
                        {(currentUser.phone || currentUser.city) && (
                          <p className="text-[11px] text-[#C5A06E] font-mono-code">
                            {currentUser.phone}
                            {currentUser.city ? ` • ${currentUser.city}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-[#E5DCCB] block">
                            Orders Placed
                          </span>
                          <span className="font-mono-code text-2xl font-bold text-[#C5A06E]">
                            {myOrders.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('orders')}
                            className="px-3 py-1.5 rounded-lg bg-[#F7F3EB]/15 hover:bg-[#F7F3EB]/25 text-[#F7F3EB] text-[11px] font-semibold transition-colors"
                          >
                            View Orders
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEmail(currentUser.email || '');
                              setAuthMode('login');
                              onLogout();
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-100 border border-red-300/25 text-[11px] font-semibold transition-colors"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={resolveImageUrl(avatarUrl || currentUser?.avatar || currentUser?.avatar_url || '/favicon.svg')}
                        alt="Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#631828]/30 shrink-0 bg-[#F7F3EB]"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#1F181A]">Profile Image</h4>
                        <p className="text-[11px] text-[#66585B]">Upload a custom photo or remove it.</p>
                        <div className="flex gap-2 mt-2">
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#631828] text-[#F7F3EB] text-[11px] font-semibold hover:bg-[#430F1B] transition-colors shadow-sm inline-flex items-center gap-1.5">
                            Change
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setAvatarStatus('loading');
                                try {
                                  const fr = new FileReader();
                                  const b64 = await new Promise<string>((res, rej) => {
                                    fr.onload = () => res(fr.result as string);
                                    fr.onerror = () => rej(new Error('Read failed'));
                                    fr.readAsDataURL(f);
                                  });
                                  const resp = await apiFetch('/api/auth/avatar', {
                                    method: 'PATCH',
                                    body: JSON.stringify({ data_url: b64 }),
                                  });
                                  if (!resp.ok) throw new Error('Upload failed');
                                  const data = await resp.json();
                                  const url = data.avatar_url || data.user?.avatar_url || '';
                                  setAvatarUrl(resolveImageUrl(url ? (url.startsWith('/') ? url : `/uploads/${url}`) : '/favicon.svg'));
                                  setAvatarStatus('success');
                                } catch {
                                  setAvatarStatus('error');
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              setAvatarStatus('loading');
                              try {
                                const resp = await apiFetch('/api/auth/avatar', {
                                  method: 'DELETE',
                                });
                                if (!resp.ok) throw new Error('Delete failed');
                                const data = await resp.json();
                                setAvatarUrl('/favicon.svg');
                                setAvatarStatus('success');
                              } catch {
                                setAvatarStatus('error');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-[#1F181A] text-[11px] font-semibold hover:bg-[#631828]/10 transition-colors shadow-sm"
                          >
                            Remove
                          </button>
                        </div>
                        {avatarStatus === 'loading' && (
                          <p className="text-[11px] text-amber-700 mt-1">Uploading...</p>
                        )}
                        {avatarStatus === 'success' && (
                          <p className="text-[11px] text-emerald-800 mt-1">Updated.</p>
                        )}
                        {avatarStatus === 'error' && (
                          <p className="text-[11px] text-red-800 mt-1">Failed. Try again.</p>
                        )}
                      </div>
                    </div>

                    <form
                      onSubmit={handleSaveProfile}
                      className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-3.5"
                    >
                      <h4 className="font-serif-editorial text-xl font-bold text-[#1F181A]">
                        Saved Shipping Details
                      </h4>

                      {profSavedMessage && (
                        <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-900 font-medium">
                          {profSavedMessage}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profName}
                            onChange={(e) => setProfName(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={profPhone}
                            onChange={(e) => setProfPhone(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={profAddress}
                          onChange={(e) => setProfAddress(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={profCity}
                            onChange={(e) => setProfCity(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={profPostal}
                            onChange={(e) => setProfPostal(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(currentUser.email || '');
                            setAuthMode('login');
                            onLogout();
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-800/30 text-red-800 text-xs font-semibold hover:bg-red-900/10"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>

                        <button
                          type="submit"
                          disabled={profSaving}
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B]"
                        >
                          <Save className="w-3.5 h-3.5 text-[#C5A06E]" />
                          <span>{profSaving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/15">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthError(null);
                        }}
                        className={`py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                          authMode === 'login'
                            ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                            : 'text-[#66585B] hover:text-[#1F181A]'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setAuthError(null);
                        }}
                        className={`py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                          authMode === 'register'
                            ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                            : 'text-[#66585B] hover:text-[#1F181A]'
                        }`}
                      >
                        Register (OTP Verified)
                      </button>
                    </div>

                    {authError && (
                      <div className="p-3 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900">
                        {authError}
                      </div>
                    )}

                    {resetSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-950 font-medium">
                        {resetSuccessMsg}
                      </div>
                    )}

                    {authMode === 'login' ? (
                      <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-[#66585B]">
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setResetEmail(loginEmail);
                                setAuthError(null);
                                setResetSuccessMsg(null);
                                setAuthMode('reset');
                              }}
                              className="text-[11px] font-semibold text-[#631828] hover:underline"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authSubmitting}
                          className="w-full py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] flex items-center justify-center gap-2"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#C5A06E]" />
                          <span>{authSubmitting ? 'Signing In...' : 'Sign In'}</span>
                        </button>
                      </form>
                    ) : authMode === 'reset' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A]">
                            Reset Your Password
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('login');
                              setAuthError(null);
                            }}
                            className="text-xs font-semibold text-[#631828] hover:underline"
                          >
                            Back to Sign In
                          </button>
                        </div>
                        <p className="text-xs text-[#66585B]">
                          Enter your registered email address to receive a single-use 6-digit password reset code.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                          <button
                            type="button"
                            disabled={authSubmitting || !resetEmail.trim() || otpCooldown > 0}
                            onClick={() => handleRequestResetOtp()}
                            className="px-3.5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                          >
                            {otpCooldown > 0 ? `Resend (${otpCooldown}s)` : resetOtpSent ? 'Resend Code' : 'Send Reset Code'}
                          </button>
                        </div>

                        {resetOtpSent && (
                          <form onSubmit={handleConfirmPasswordReset} className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                                6-Digit Reset Code
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={resetOtp}
                                onChange={(e) => {
                                  setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                  if (authError) setAuthError(null);
                                }}
                                placeholder="Enter 6-digit code"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 font-mono-code text-xs tracking-widest"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                                New Password (min. 6 characters)
                              </label>
                              <input
                                type="password"
                                required
                                minLength={6}
                                maxLength={128}
                                value={resetNewPassword}
                                onChange={(e) => {
                                  setResetNewPassword(e.target.value);
                                  if (authError) setAuthError(null);
                                }}
                                placeholder="Create new password"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={authSubmitting}
                              className="w-full py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B]"
                            >
                              {authSubmitting ? 'Updating Password...' : 'Set New Password'}
                            </button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleRegisterSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <input
                              type="email"
                              required
                              placeholder="Email Address"
                              value={regEmail}
                              onChange={(e) => {
                                setRegEmail(e.target.value);
                                setOtpSent(false);
                                setOtpVerified(false);
                                setOtpStatusMsg(null);
                              }}
                              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                            />
                            <button
                              type="button"
                              disabled={sendingOtp || !regEmail.trim() || otpCooldown > 0}
                              onClick={handleSendOtp}
                              className="px-3 py-2 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 transition-colors"
                            >
                              {sendingOtp
                                ? 'Sending...'
                                : otpCooldown > 0
                                ? `Resend (${otpCooldown}s)`
                                : otpSent
                                ? 'Resend OTP'
                                : 'Send OTP'}
                            </button>
                          </div>
                        </div>

                        {/* Email OTP Verification Box */}
                        <div className="p-3.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-bold text-[#631828] flex items-center gap-1.5">
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Email OTP Verification *</span>
                            </label>
                            {otpVerified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/15 text-emerald-900 text-[10px] font-bold">
                                <MailCheck className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#66585B]">
                            Click <strong>Send OTP</strong> to receive a 6-digit verification code in your email inbox and confirm your account is real.
                          </p>
                          {otpStatusMsg && (
                            <div className="p-2.5 rounded-lg bg-emerald-900/10 border border-emerald-800/30 text-[11px] text-emerald-950 font-medium">
                              {otpStatusMsg}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={regOtp}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setRegOtp(cleaned);
                                setOtpVerified(false);
                                if (cleaned.length === 6 && regEmail.trim()) {
                                  handleVerifyOtpInline(cleaned);
                                }
                              }}
                              placeholder="Enter 6-digit OTP code"
                              className="flex-1 px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 font-mono-code text-xs tracking-widest"
                            />
                            <button
                              type="button"
                              disabled={verifyingOtp || regOtp.trim().length < 6}
                              onClick={() => handleVerifyOtpInline()}
                              className="px-3.5 py-2 rounded-xl bg-[#1F181A] hover:bg-[#631828] text-[#F7F3EB] text-xs font-semibold disabled:opacity-40 transition-colors"
                            >
                              {verifyingOtp ? 'Checking...' : otpVerified ? 'Verified' : 'Verify OTP'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="tel"
                            required
                            placeholder="Phone (+92 300 ...)"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                          <input
                            type="text"
                            required
                            placeholder="City"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Shipping Address"
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                        <input
                          type="password"
                          required
                          placeholder="Create Password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={authSubmitting || sendingOtp}
                          className="w-full py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B]"
                        >
                          {authSubmitting
                            ? 'Verifying & Creating Account...'
                            : !otpSent && !regOtp.trim()
                            ? 'Send Verification OTP & Register'
                            : 'Verify OTP & Complete Registration'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
