import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Truck, MapPin, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (orderNumber: string, email?: string) => Promise<Order | null>;
  defaultEmail?: string;
}

const STEPS = [
  OrderStatus.PENDING,
  OrderStatus.CRAFTING,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED,
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  onTrackOrder,
  defaultEmail = '',
}) => {
  const [orderInput, setOrderInput] = useState('FNR-1001');
  const [emailInput, setEmailInput] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Order | null>(null);

  useEffect(() => {
    if (defaultEmail) setEmailInput(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const order = await onTrackOrder(
        orderInput.trim().toUpperCase(),
        emailInput.trim().toLowerCase()
      );
      if (order) {
        setResult(order);
      } else {
        setResult(null);
        setError('No order found matching that order reference and email address.');
      }
    } catch {
      setResult(null);
      setError('No order found matching that order reference and email address.');
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = result
    ? ((result.order_status || result.status || OrderStatus.PENDING) as OrderStatus)
    : null;
  const stepIndex = currentStatus ? STEPS.indexOf(currentStatus) : -1;
  const itemCount = result ? (result.items_json?.length ?? result.items?.length ?? 0) : 0;
  const resultCity = result ? (result.shipping_city || result.city || 'Pakistan') : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#1F181A]/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-xl rounded-3xl bg-[#F7F3EB] border border-[#631828]/25 shadow-2xl overflow-hidden"
        >
          <div className="p-5 sm:p-6 bg-[#EFE9DC] border-b border-[#631828]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#631828] text-[#C5A06E] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif-editorial text-2xl font-bold text-[#1F181A]">
                  Track Order
                </h3>
                <p className="text-xs text-[#66585B]">
                  Enter your order reference number to check delivery status
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

          <div className="p-5 sm:p-6 space-y-5">
            <form onSubmit={handleSearch} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={orderInput}
                  onChange={(e) => setOrderInput(e.target.value.toUpperCase())}
                  placeholder="Order reference (e.g. FNR-1001)"
                  className="px-4 py-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 font-mono-code text-xs uppercase"
                />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Order email address"
                  className="px-4 py-3 rounded-xl bg-[#EFE9DC] border border-[#631828]/25 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="foner-btn-primary w-full px-6 py-3 rounded-xl bg-[#631828] text-[#F7F3EB] text-xs font-semibold uppercase tracking-widest hover:bg-[#430F1B] inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-[#C5A06E] animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 text-[#C5A06E]" />
                    <span>Track Order</span>
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3.5 rounded-xl bg-red-900/10 border border-red-800/30 text-xs text-red-900"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="p-5 rounded-2xl bg-[#EFE9DC] border border-[#631828]/20 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#631828]/15 pb-3">
                    <div>
                      <span className="font-mono-code text-sm font-bold text-[#631828]">
                        #{result.order_number}
                      </span>
                      <h4 className="font-serif-editorial text-xl font-bold text-[#1F181A]">
                        {result.customer_name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full bg-[#631828] text-[#F7F3EB] text-[10px] font-semibold uppercase tracking-widest">
                        {currentStatus}
                      </span>
                      <p className="font-mono-code text-sm font-bold text-[#1F181A] mt-1">
                        Rs. {result.total_pkr.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {STEPS.map((st, idx) => {
                      const active = stepIndex >= idx;
                      const isCurrent = stepIndex === idx;
                      return (
                        <div key={st} className="space-y-1">
                          <div className="h-1.5 rounded-full bg-[#631828]/15 overflow-hidden">
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: active ? 1 : 0 }}
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
                            className={`flex items-center gap-1 text-[10px] capitalize truncate ${
                              active ? 'text-[#631828] font-semibold' : 'text-[#66585B]'
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

                  <div className="text-xs text-[#66585B] space-y-1 pt-1">
                    <div className="flex items-center gap-1.5 text-[#1F181A]">
                      <MapPin className="w-3.5 h-3.5 text-[#631828]" />
                      <span>
                        {result.shipping_address}, {resultCity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[#631828]" />
                      <span>
                        {itemCount} item(s) • Shipping: Rs. {result.delivery_fee_pkr}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#631828]" />
                      <span>Payment: {result.payment_method}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
