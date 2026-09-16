import type { NotificationType } from './notification';

export interface BusinessProfile {
  name: string;
  tagline: string;
  logoUrl: string | null;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
}

export interface AppointmentRules {
  defaultDurationMin: number;
  /** Granularity of generated slots, in minutes. */
  slotIntervalMin: number;
  minAdvanceBookingMin: number;
  cancellationWindowHours: number;
  /** Buffer kept between two appointments for the same stylist, in minutes. */
  bufferMin: number;
}

export interface BillingSettings {
  currency: string;
  currencyCode: string;
  locale: string;
  taxRatePct: number;
  receiptHeader: string;
  receiptFooter: string;
  /** Ceiling on the bill-level discount a shop user may apply. */
  maxShopDiscountPct: number;
}

export interface Settings {
  business: BusinessProfile;
  appointments: AppointmentRules;
  billing: BillingSettings;
  notifications: Record<NotificationType, boolean>;
  updatedAt: string;
}
