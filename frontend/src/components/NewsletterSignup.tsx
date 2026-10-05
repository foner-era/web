import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, ArrowRight, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { ScrollReveal } from './AnimationSystem';

interface NewsletterSignupProps {
  onSubscribe: (email: string, city: string) => Promise<{ message?: string } | void>;
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
];

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({ onSubscribe }) => {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Lahore');
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'already-subscribed' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setStatusMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setStatusMessage('');
    try {
      const result = await onSubscribe(email.trim(), city);
      const msg =
        (result && typeof result === 'object' && 'message' in result && result.message) ||
        'Thank you for subscribing! Check your email inbox for your welcome confirmation.';
      const isAlready = msg.toLowerCase().includes('already');
      setStatus(isAlready ? 'already-subscribed' : 'success');
      setStatusMessage(msg);
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(err?.message || 'Could not subscribe at this moment. Please try again.');
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <ScrollReveal>
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#631828] via-[#4A101D] to-[#1F181A] text-[#F7F3EB] border border-[#C5A06E]/35 shadow-xl p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F3EB]/10 border border-[#C5A06E]/35 text-[#C5A06E]">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-mono-code text-[10px] uppercase tracking-[0.2em] font-semibold">
                  Newsletter &amp; Releases
                </span>
              </div>
              <h2 className="font-serif-editorial text-3xl sm:text-4xl font-bold leading-tight">
                Stay Updated on New Arrivals &amp; Offers
              </h2>
              <p className="text-xs sm:text-sm text-[#E5DCCB]/85 max-w-lg leading-relaxed">
                Subscribe with your email address to receive early access to seasonal releases, restock alerts, and subscriber-only promo codes.
              </p>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-6">
              <AnimatePresence mode="wait">
                {status === 'success' || status === 'already-subscribed' ? (
                  <motion.div
                    key="subscribed-state"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="p-6 rounded-2xl bg-[#F7F3EB]/10 border border-[#C5A06E]/40 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#C5A06E] text-[#1F181A] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-serif-editorial text-xl font-bold text-[#F7F3EB]">
                          {status === 'already-subscribed'
                            ? 'Already Subscribed'
                            : 'Subscription Confirmed'}
                        </h3>
                        <p className="text-xs text-[#E5DCCB]/85">
                          {statusMessage ||
                            'You are on the list. Watch your inbox for upcoming releases and offers.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle');
                        setStatusMessage('');
                      }}
                      className="text-xs font-semibold text-[#C5A06E] hover:underline shrink-0"
                    >
                      Add Another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="subscribe-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="p-4 sm:p-5 rounded-2xl bg-[#F7F3EB]/10 backdrop-blur-md border border-[#C5A06E]/30 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-7 relative">
                        <Mail className="w-4 h-4 text-[#C5A06E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (status === 'error') {
                              setStatus('idle');
                              setStatusMessage('');
                            }
                          }}
                          placeholder="Enter your email address"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#F7F3EB] text-[#1F181A] placeholder-[#66585B] text-xs border border-transparent focus:outline-none focus:border-[#C5A06E] transition-all"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-xl bg-[#F7F3EB] text-[#1F181A] text-xs font-medium border border-transparent focus:outline-none focus:border-[#C5A06E] transition-all"
                          aria-label="Select city"
                        >
                          {PAKISTAN_CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <AnimatePresence>
                      {status === 'error' && statusMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18 }}
                          className="flex items-center gap-2 text-xs text-amber-200 font-medium"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusMessage}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="foner-btn-primary w-full py-3.5 px-5 rounded-xl bg-[#C5A06E] hover:bg-[#D4B485] text-[#1F181A] text-xs font-bold uppercase tracking-[0.16em] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60 group"
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Subscribing...</span>
                        </>
                      ) : (
                        <>
                          <span>Subscribe</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
