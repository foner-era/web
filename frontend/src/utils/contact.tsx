import React from 'react';
import type { StoreSettings } from '../types';

/**
 * Returns normalized WhatsApp chat link.
 * Handles '+92 300 1234567', '03001234567', '923001234567', or full URL.
 */
export function getWhatsAppUrl(value?: string | null): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
}

/**
 * Normalizes business contact and social media information from PostgreSQL StoreSettings.
 * Ensures obsolete defaults (old Lahore address, old dummy numbers, old support emails) are never surfaced.
 * Adheres strictly to the requirement that physical address, phone, and Instagram are empty/hidden unless
 * explicitly configured by an admin in Admin Settings.
 */
export function getEffectiveBusinessContact(settings: Partial<StoreSettings> = {}) {
  // Centralized business contact email
  const rawEmail = (
    settings.contactEmail ||
    settings.contact_email ||
    settings.business_email ||
    settings.support_email ||
    ''
  ).trim();
  const email =
    !rawEmail || rawEmail.toLowerCase() === 'support@foner.pk' ? 'fonerera@gmail.com' : rawEmail;

  // Phone number (strictly no hardcoded fallback or fake number)
  const rawPhone = (settings.business_phone || settings.support_phone || '').trim();
  const phone =
    rawPhone.includes('8429910') || rawPhone.includes('8429911') ? '' : rawPhone;

  // Physical address (strictly no hardcoded address, no placeholder, no fallback)
  const rawAddress = (
    settings.business_address ||
    settings.atelier_address ||
    settings.flagship_address ||
    ''
  ).trim();
  const address =
    rawAddress.toLowerCase().includes('mm alam road') ||
    rawAddress.toLowerCase().includes('gulberg iii')
      ? ''
      : rawAddress;

  // Instagram URL (strictly configurable, hidden if not set, no broken icons or fallbacks)
  const rawInstagram = (
    settings.instagramUrl ||
    settings.instagram_url ||
    settings.social_instagram_url ||
    ''
  ).trim();
  const instagramUrl =
    !rawInstagram ||
    rawInstagram.toLowerCase() === 'https://instagram.com/foner' ||
    rawInstagram.toLowerCase() === 'http://instagram.com/foner' ||
    rawInstagram.toLowerCase().includes('foner.atelier.pk') ||
    rawInstagram.toLowerCase() === 'instagram (@foner)' ||
    rawInstagram.toLowerCase() === '@foner'
      ? ''
      : rawInstagram.startsWith('http://') || rawInstagram.startsWith('https://')
      ? rawInstagram
      : `https://instagram.com/${rawInstagram.replace(/^@/, '')}`;

  const rawFacebook = (settings.facebook_url || settings.social_facebook_url || '').trim();
  const facebookUrl =
    rawFacebook.toLowerCase() === 'https://facebook.com/foner' ||
    rawFacebook.toLowerCase().includes('foner.atelier.pk')
      ? ''
      : rawFacebook;

  const rawWhatsApp = (settings.whatsapp_number || settings.social_whatsapp_url || '').trim();
  const whatsappNumber =
    rawWhatsApp.includes('8429910') || rawWhatsApp.includes('8429911') ? '' : rawWhatsApp;

  return {
    contactEmail: email,
    email,
    phone,
    hasPhone: Boolean(phone),
    address,
    hasAddress: Boolean(address),
    instagramUrl,
    hasInstagram: Boolean(instagramUrl),
    facebookUrl,
    hasFacebook: Boolean(facebookUrl),
    whatsappNumber,
    whatsappUrl: getWhatsAppUrl(whatsappNumber),
    hasWhatsApp: Boolean(whatsappNumber),
  };
}

/**
 * Authentic WhatsApp vector icon tailored for Foner's luxury aesthetic.
 */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.44 19.65L5.27 16.61L5.07 16.3C4.24 14.98 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.96 6.84C8.77 6.84 8.47 6.91 8.21 7.19C7.96 7.47 7.24 8.15 7.24 9.53C7.24 10.91 8.25 12.24 8.39 12.43C8.53 12.62 10.37 15.45 13.18 16.66C13.85 16.95 14.37 17.13 14.78 17.26C15.45 17.47 16.06 17.44 16.55 17.37C17.09 17.29 18.22 16.69 18.45 16.03C18.69 15.38 18.69 14.82 18.62 14.7C18.55 14.59 18.36 14.52 18.08 14.38C17.79 14.24 16.42 13.56 16.16 13.47C15.91 13.38 15.72 13.33 15.53 13.62C15.34 13.9 14.81 14.52 14.64 14.71C14.48 14.9 14.32 14.92 14.03 14.78C13.75 14.64 12.85 14.35 11.78 13.39C10.95 12.65 10.38 11.73 10.22 11.45C10.06 11.17 10.2 11.02 10.35 10.87C10.48 10.74 10.63 10.54 10.77 10.38C10.92 10.22 10.96 10.1 11.06 9.91C11.15 9.72 11.11 9.56 11.04 9.42C10.97 9.28 10.4 7.89 10.17 7.33C9.94 6.79 9.71 6.86 9.54 6.85C9.38 6.84 9.19 6.84 8.96 6.84Z" />
  </svg>
);
