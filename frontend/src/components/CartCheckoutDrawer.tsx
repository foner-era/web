import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Tag,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  MapPin,
  Lock,
  UserCheck,
  LogOut,
  MailCheck,
  KeyRound,
} from 'lucide-react';
import { CartItem, Coupon, Order, PaymentMethod, User } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  requestPasswordReset,
  confirmPasswordReset,
} from '../api';
import { AnimatedPrice } from './AnimationSystem';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  initialMode?: 'cart' | 'checkout';
  onClose: () => void;
  onBrowseProducts?: () => void;
  cart: CartItem[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  deliveryFeePkr: number;
  currentUser: User | null;
  authChecking?: boolean;
  availableCoupons: Coupon[];
  onValidateCoupon: (code: string, subtotal: number) => Promise<{
    valid: boolean;
    discount_pkr: number;
    message?: string;
    code?: string;
  }>;
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
  onLogout: () => Promise<void> | void;
  onPlaceOrder: (payload: {
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
  }) => Promise<Order>;
  onOpenOrderHistory: () => void;
}

const PAKISTAN_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Sialkot',
  'Gujranwala',
  'Quetta',
];

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  initialMode = 'cart',
  onClose,
  onBrowseProducts,
  cart,
  onUpdateQty,
  onRemoveItem,
  deliveryFeePkr,
  currentUser,
  authChecking = false,
  onValidateCoupon,
  onLogin,
  onRegister,
  onLogout,
  onPlaceOrder,
  onOpenOrderHistory,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmation'>(initialMode);

  // Customer authentication state inside checkout
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>('login');
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
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_pkr: number } | null>(
    null
  );
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(
    null
  );
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Checkout shipping fields — NEVER auto-populated from profile address.
  // Each order collects its own independent shipping destination.
  const isAuthenticatedCustomer = Boolean(currentUser);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingArea, setShippingArea] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [orderNotes, setOrderNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (confirmedOrder) {
        setConfirmedOrder(null);
      }
      setCheckoutError(null);
      setAuthError(null);
      setStep(initialMode);
      setIdempotencyKey(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
    }
  }, [isOpen, initialMode]);

  // Clear shipping form only when user logs out; NEVER auto-populate from profile on login
  React.useEffect(() => {
    if (!currentUser) {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setShippingAddress('');
      setShippingArea('');
      setCity('');
      setPostalCode('');
    }
  }, [currentUser]);

  const handleUseSavedAddress = () => {
    if (!currentUser) return;
    if (currentUser.name) setCustomerName(currentUser.name);
    if (currentUser.email) setCustomerEmail(currentUser.email);
    if (currentUser.phone) setCustomerPhone(currentUser.phone);
    if (currentUser.address) setShippingAddress(currentUser.address);
    if (currentUser.city) setCity(currentUser.city);
    if (currentUser.postal_code) setPostalCode(currentUser.postal_code);
  };

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

  const totalItemsCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotalPkr = cart.reduce(
    (acc, item) => acc + Number(item.variantPricePkr ?? item.product.price_pkr) * item.quantity,
    0
  );
  const shippingFee = cart.length > 0 ? Number(deliveryFeePkr || 300) : 0;
  const discountPkr = appliedCoupon ? Math.min(appliedCoupon.discount_pkr, subtotalPkr) : 0;
  const grandTotalPkr = Math.max(0, subtotalPkr - discountPkr + shippingFee);

  const handleApplyCoupon = async (codeToTry?: string) => {
    const code = (codeToTry ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponMessage(null);
    try {
      const res = await onValidateCoupon(code, subtotalPkr);
      if (res.valid) {
        setAppliedCoupon({ code, discount_pkr: res.discount_pkr });
        setCouponInput(code);
        setCouponMessage({
          text: `Promo code ${code} applied (-Rs. ${res.discount_pkr.toLocaleString()})`,
          error: false,
        });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({
          text: res.message || 'Invalid or expired promo code.',
          error: true,
        });
      }
    } catch {
      setCouponMessage({ text: 'Unable to verify promo code.', error: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCustomerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Please enter your email address and password.');
      return;
    }
    setAuthSubmitting(true);
    try {
      await onLogin(loginEmail.trim(), loginPassword);
      setLoginPassword('');
      setStep('checkout');
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

  const handleCustomerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regAddress.trim() || !regPassword) {
      setAuthError('Please complete all required fields to create your customer account.');
      return;
    }
    // If OTP has not been sent yet, send it now and ask user to enter the 6-digit OTP
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
      setRegPassword('');
      setRegOtp('');
      setOtpSent(false);
      setOtpVerified(false);
      setOtpStatusMsg(null);
      setStep('checkout');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to create account.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!isAuthenticatedCustomer) {
      setCheckoutError('Please sign in to your account before placing an order.');
      return;
    }
    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }
    if (!customerName.trim()) {
      setCheckoutError('Please enter the recipient full name for this delivery.');
      return;
    }
    if (!customerPhone.trim()) {
      setCheckoutError('Please enter a valid contact phone number for this delivery.');
      return;
    }
    if (!shippingAddress.trim() || shippingAddress.trim().length < 5) {
      setCheckoutError('Please enter a complete street shipping address for this order.');
      return;
    }
    if (!city.trim()) {
      setCheckoutError('Please select a delivery city for this order.');
      return;
    }
    if (!shippingArea.trim()) {
      setCheckoutError('Please enter the delivery area / region for this order.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await onPlaceOrder({
        customer_name: customerName.trim(),
        customer_email: (customerEmail || currentUser?.email || '').trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_area: shippingArea.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        payment_method: PaymentMethod.COD,
        payment_reference: '',
        coupon_code: appliedCoupon?.code || '',
        discount_pkr: discountPkr,
        gift_wrap: false,
        order_notes: orderNotes.trim(),
        idempotency_key: idempotencyKey,
      });
      setConfirmedOrder(order);
      // Reset checkout shipping fields after placing order so next order is independent
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setShippingAddress('');
      setShippingArea('');
      setCity('');
      setPostalCode('');
      setOrderNotes('');
      setStep('confirmation');
    } catch (err: any) {
      setCheckoutError(err?.message || 'Unable to place your order. Please try again.');
      setIdempotencyKey(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1F181A]/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative z-10 w-full max-w-xl bg-[#F7F3EB] h-full shadow-2xl border-l border-[#631828]/20 flex flex-col justify-between overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#631828] text-[#F7F3EB] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-[#C5A06E]" />
              </div>
              <div>
                <h2 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  {step === 'cart' && 'Shopping Cart'}
                  {step === 'checkout' &&
                    (isAuthenticatedCustomer ? 'Checkout' : 'Customer Sign In')}
                  {step === 'confirmation' && 'Order Confirmed'}
                </h2>
                <p className="text-xs text-[#66585B]">
                  {step === 'cart' &&
                    `${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'} • Shipping Rs. ${shippingFee}`}
                  {step === 'checkout' &&
                    (isAuthenticatedCustomer
                      ? 'Confirm your shipping details and review your order'
                      : 'Sign in or create a customer account to continue to checkout')}
                  {step === 'confirmation' && `Order #${confirmedOrder?.order_number}`}
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

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {step === 'confirmation' && confirmedOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="py-6 space-y-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="w-16 h-16 rounded-2xl bg-[#631828] text-[#C5A06E] flex items-center justify-center mx-auto shadow-lg"
                >
                  <CheckCircle2 className="w-9 h-9" />
                </motion.div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-[#631828]/10 text-[#631828] font-mono-code text-xs font-bold uppercase tracking-widest">
                    Order #{confirmedOrder.order_number}
                  </span>
                  <h3 className="font-serif-editorial text-3xl font-bold text-[#1F181A]">
                    Thank You, {confirmedOrder.customer_name}
                  </h3>
                  <p className="text-sm text-[#66585B] max-w-md mx-auto">
                    Your order has been created. Save your order number to track delivery status.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Order Number</span>
                    <span className="font-mono-code font-bold text-[#631828]">
                      {confirmedOrder.order_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Customer</span>
                    <span className="font-semibold text-[#1F181A]">
                      {confirmedOrder.customer_name} ({confirmedOrder.customer_email})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Status</span>
                    <span className="font-semibold capitalize text-[#1F181A]">
                      {confirmedOrder.order_status || confirmedOrder.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Payment Method</span>
                    <span className="font-semibold text-[#1F181A]">
                      {confirmedOrder.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66585B]">Delivery Address</span>
                    <span className="font-medium text-[#1F181A] text-right max-w-[240px]">
                      {confirmedOrder.shipping_address}
                      {confirmedOrder.shipping_area ? `, ${confirmedOrder.shipping_area}` : ''}
                      {', '}
                      {confirmedOrder.shipping_city || confirmedOrder.city}
                      {confirmedOrder.postal_code ? ` (${confirmedOrder.postal_code})` : ''}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#631828]/15 space-y-1">
                    <div className="flex justify-between text-[#66585B]">
                      <span>Subtotal</span>
                      <span className="font-mono-code">
                        Rs. {Number(confirmedOrder.subtotal_pkr || 0).toLocaleString()}
                      </span>
                    </div>
                    {Number(confirmedOrder.discount_pkr || 0) > 0 && (
                      <div className="flex justify-between text-emerald-800">
                        <span>Discount</span>
                        <span className="font-mono-code">
                          -Rs. {Number(confirmedOrder.discount_pkr).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#66585B]">
                      <span>Shipping</span>
                      <span className="font-mono-code">
                        Rs. {Number(confirmedOrder.delivery_fee_pkr || 300).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span className="text-[#1F181A]">Total</span>
                      <span className="font-mono-code text-[#631828]">
                        Rs. {Number(confirmedOrder.total_pkr || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOrderHistory();
                    }}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
                  >
                    View Orders
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-[#EFE9DC] text-[#1F181A] border border-[#631828]/20 text-xs font-semibold uppercase tracking-widest hover:bg-[#E5DCCB] transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </motion.div>
            ) : cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 flex items-center justify-center mx-auto text-[#631828]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                    Your cart is empty
                  </h3>
                  <p className="text-xs text-[#66585B] max-w-xs mx-auto">
                    Add products to your cart before proceeding to checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onBrowseProducts) onBrowseProducts();
                  }}
                  className="px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] transition-colors"
                >
                  Return to Products
                </button>
              </div>
            ) : step === 'cart' ? (
              <>
                {/* Cart Items List */}
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {cart.map((item, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                        className="p-3.5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 flex gap-3.5"
                      >
                        <img
                          src={resolveImageUrl(item.product.image_url)}
                          alt={item.product.title}
                          className="w-20 h-24 rounded-xl object-cover shrink-0 border border-[#631828]/10"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A] truncate">
                                {item.product.title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(idx)}
                                className="p-1 text-[#66585B] hover:text-red-700 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[11px] text-[#66585B]">
                              Size: <strong className="text-[#1F181A]">{item.selectedSize}</strong> •{' '}
                              Color: <strong className="text-[#1F181A]">{item.selectedColor}</strong>
                              {(item.variantSku || item.product.sku) && (
                                <span className="block font-mono-code text-[10px] text-[#631828] mt-0.5">
                                  SKU: {item.variantSku || item.product.sku}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="inline-flex items-center rounded-lg bg-[#F7F3EB] border border-[#631828]/20">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(idx, -1)}
                                className="px-2.5 py-1 text-xs font-bold text-[#1F181A] hover:bg-[#E5DCCB]"
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="px-2.5 font-mono-code text-xs font-semibold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={
                                  item.quantity >= Number(item.variantStock ?? item.product.stock)
                                }
                                onClick={() => onUpdateQty(idx, 1)}
                                className="px-2.5 py-1 text-xs font-bold text-[#1F181A] hover:bg-[#E5DCCB] disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>

                            <AnimatedPrice
                              value={
                                Number(item.variantPricePkr ?? item.product.price_pkr) *
                                item.quantity
                              }
                              className="font-mono-code text-sm font-bold text-[#631828]"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Promo Code Input */}
                <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1F181A] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#631828]" />
                      Promo Code
                    </span>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponMessage(null);
                          setCouponInput('');
                        }}
                        className="text-[11px] text-red-800 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code uppercase"
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon}
                      onClick={() => handleApplyCoupon()}
                      className="px-4 py-2 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold hover:bg-[#430F1B] transition-colors"
                    >
                      {validatingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {couponMessage && (
                    <p
                      className={`text-xs font-medium ${
                        couponMessage.error ? 'text-red-700' : 'text-emerald-800'
                      }`}
                    >
                      {couponMessage.text}
                    </p>
                  )}
                </div>
              </>
            ) : authChecking ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#631828]">
                  Verifying customer session...
                </p>
              </div>
            ) : !isAuthenticatedCustomer ? (
              /* ==============================================================
                 STEP: CUSTOMER AUTHENTICATION REQUIRED BEFORE CHECKOUT
                 ============================================================== */
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#631828] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Cart</span>
                </button>

                <div className="p-4 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F181A]">
                      Cart Summary ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className="font-mono-code font-bold text-[#631828]">
                      Rs. {grandTotalPkr.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#66585B]">
                    Please sign in with your customer account or register below to enter shipping details and place your order.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F7F3EB] border border-[#631828]/15">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setAuthError(null);
                      }}
                      className={`py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        authTab === 'login'
                          ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                          : 'text-[#66585B] hover:text-[#1F181A]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError(null);
                      }}
                      className={`py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        authTab === 'register'
                          ? 'bg-[#631828] text-[#F7F3EB] shadow-xs'
                          : 'text-[#66585B] hover:text-[#1F181A]'
                      }`}
                    >
                      Register
                    </button>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 font-medium">
                      {authError}
                    </div>
                  )}

                  {resetSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-950 font-medium">
                      {resetSuccessMsg}
                    </div>
                  )}

                  {authTab === 'login' ? (
                    <form onSubmit={handleCustomerLoginSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Customer Email *
                        </label>
                        <input
                          type="email"
                          required
                          autoComplete="username"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-[#66585B]">
                            Password *
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setResetEmail(loginEmail);
                              setAuthError(null);
                              setResetSuccessMsg(null);
                              setAuthTab('reset');
                            }}
                            className="text-[11px] font-semibold text-[#631828] hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <input
                          type="password"
                          required
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authSubmitting}
                        className="w-full py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-md"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#C5A06E]" />
                        <span>
                          {authSubmitting ? 'Signing In...' : 'Sign In & Continue to Checkout'}
                        </span>
                      </button>
                    </form>
                  ) : authTab === 'reset' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif-editorial text-lg font-bold text-[#1F181A]">
                          Reset Your Password
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('login');
                            setAuthError(null);
                          }}
                          className="text-xs font-semibold text-[#631828] hover:underline"
                        >
                          Back to Sign In
                        </button>
                      </div>
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
                          onClick={async () => {
                            setAuthError(null);
                            setResetSuccessMsg(null);
                            setAuthSubmitting(true);
                            try {
                              const res = await requestPasswordReset(resetEmail.trim());
                              setResetOtpSent(true);
                              setOtpCooldown(45);
                              setResetSuccessMsg(
                                res.message ||
                                  'If an account exists for this email, a 6-digit reset code has been sent.'
                              );
                            } catch (err: any) {
                              setAuthError(err?.message || 'Unable to send reset code.');
                            } finally {
                              setAuthSubmitting(false);
                            }
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                        >
                          {otpCooldown > 0 ? `Resend (${otpCooldown}s)` : resetOtpSent ? 'Resend Code' : 'Send Code'}
                        </button>
                      </div>
                      {resetOtpSent && (
                        <form
                          onSubmit={async (e) => {
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
                              const res = await confirmPasswordReset(
                                cleanEmail,
                                cleanOtp,
                                resetNewPassword
                              );
                              setLoginEmail(cleanEmail);
                              setResetOtp('');
                              setResetNewPassword('');
                              setResetOtpSent(false);
                              setAuthTab('login');
                              setResetSuccessMsg(
                                res.message || 'Password updated. Please sign in with your new password.'
                              );
                            } catch (err: any) {
                              setAuthError(err?.message || 'Invalid or expired reset code.');
                            } finally {
                              setAuthSubmitting(false);
                            }
                          }}
                          className="space-y-3 pt-1"
                        >
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
                            placeholder="Enter 6-digit reset code"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 font-mono-code text-xs tracking-widest"
                          />
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
                            placeholder="New password (min. 6 characters)"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
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
                    <form onSubmit={handleCustomerRegisterSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Email Address *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="email"
                              required
                              value={regEmail}
                              onChange={(e) => {
                                setRegEmail(e.target.value);
                                setOtpSent(false);
                                setOtpVerified(false);
                                setOtpStatusMsg(null);
                              }}
                              placeholder="you@example.com"
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
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+92 300 1234567"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs font-mono-code"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                            City *
                          </label>
                          <select
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                          >
                            {PAKISTAN_CITIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          placeholder="House number, street, sector or area"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create a password (min. 4 characters)"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EB] border border-[#631828]/20 text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authSubmitting || sendingOtp}
                        className="w-full py-3.5 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest transition-colors shadow-md"
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
              </div>
            ) : (
              /* ==============================================================
                 STEP: AUTHENTICATED CUSTOMER CHECKOUT FORM
                 ============================================================== */
              <form id="foner-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#631828] hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Cart</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE9DC] border border-[#631828]/20 text-[11px] text-[#1F181A]">
                      <UserCheck className="w-3.5 h-3.5 text-[#631828]" />
                      <strong className="truncate max-w-[140px]">{currentUser?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onLogout()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-800/30 text-[11px] font-semibold text-red-800 hover:bg-red-900/10"
                      title="Sign out of customer account"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Order Items Summary in Checkout */}
                <div className="p-3.5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/15 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#631828] block">
                    Order Review ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-[#1F181A] truncate max-w-[260px]">
                          {item.product.title} ({item.selectedSize}, {item.selectedColor}) ×{' '}
                          {item.quantity}
                        </span>
                        <span className="font-mono-code font-semibold text-[#1F181A]">
                          Rs.{' '}
                          {(
                            Number(item.variantPricePkr ?? item.product.price_pkr) * item.quantity
                          ).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3.5 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900 font-medium">
                    {checkoutError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#631828] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Shipping Information
                    </h3>
                    {currentUser && currentUser.address && (
                      <button
                        type="button"
                        onClick={handleUseSavedAddress}
                        className="px-2.5 py-1 rounded-lg bg-[#EFE9DC] hover:bg-[#631828] text-[#631828] hover:text-[#F7F3EB] border border-[#631828]/25 text-[11px] font-semibold transition-colors"
                      >
                        Use saved address
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#66585B]">
                    Enter the delivery address for this specific order. Your profile address will not be modified.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Recipient full name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="House / Flat number, street, building"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        City *
                      </label>
                      <select
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      >
                        <option value="">Select city...</option>
                        {PAKISTAN_CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Area / Region *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingArea}
                        onChange={(e) => setShippingArea(e.target.value)}
                        placeholder="e.g. DHA Phase 5, Model Town"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                        Postal Code (if applicable)
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="54000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs font-mono-code"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method — Cash on Delivery (COD) Only */}
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#631828]">
                    Payment Method
                  </h3>

                  <div className="p-3.5 rounded-xl bg-[#631828] text-[#F7F3EB] border border-[#631828] shadow-sm flex items-start gap-3">
                    <Banknote className="w-4 h-4 mt-0.5 shrink-0 text-[#C5A06E]" />
                    <div>
                      <div className="text-xs font-semibold">Cash on Delivery (COD)</div>
                      <div className="text-[11px] text-[#E5DCCB]">
                        Pay in cash when your order is delivered to the shipping address above.
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#66585B] mb-1">
                    Delivery Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Gate instructions or preferred delivery time"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#EFE9DC] border border-[#631828]/20 text-xs"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Drawer Footer: Price Summary & Action */}
          {cart.length > 0 && step !== 'confirmation' && (
            <div className="p-5 sm:p-6 bg-[#EFE9DC] border-t border-[#631828]/20 space-y-3.5">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#66585B]">
                  <span>
                    Subtotal ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
                  </span>
                  <AnimatedPrice
                    value={subtotalPkr}
                    className="font-mono-code font-semibold text-[#1F181A]"
                  />
                </div>

                <div className="flex justify-between text-[#66585B]">
                  <span>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</span>
                  <AnimatedPrice
                    value={discountPkr}
                    prefix={discountPkr > 0 ? '-Rs. ' : 'Rs. '}
                    className="font-mono-code font-semibold text-emerald-800"
                  />
                </div>

                <div className="flex justify-between text-[#66585B]">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#631828]" />
                    Shipping
                  </span>
                  <AnimatedPrice
                    value={shippingFee}
                    className="font-mono-code font-semibold text-[#1F181A]"
                  />
                </div>

                <div className="pt-2 border-t border-[#631828]/15 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#1F181A]">Total</span>
                  <AnimatedPrice
                    value={grandTotalPkr}
                    className="font-mono-code text-xl font-bold text-[#631828]"
                  />
                </div>
              </div>

              {step === 'cart' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutError(null);
                    setAuthError(null);
                    setStep('checkout');
                  }}
                  className="w-full py-4 px-6 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold tracking-[0.18em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A06E]" />
                </button>
              ) : isAuthenticatedCustomer ? (
                <button
                  type="submit"
                  form="foner-checkout-form"
                  disabled={submitting}
                  className="w-full py-4 px-6 rounded-xl bg-[#631828] hover:bg-[#430F1B] text-[#F7F3EB] text-xs font-semibold tracking-[0.18em] uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>{submitting ? 'Placing Order...' : 'Place Order'}</span>
                  <CheckCircle2 className="w-4 h-4 text-[#C5A06E]" />
                </button>
              ) : null}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
