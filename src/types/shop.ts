import type { BaseRecord, BusinessHours } from './common';

export interface Shop extends BaseRecord {
  name: string;
  /** Receipt-number prefix, e.g. "SHP1" produces SHP1-2026-000123. */
  code: string;
  addressLine: string;
  city: string;
  phone: string;
  email: string;
  managerName: string;
  logoUrl: string | null;
  businessHours: BusinessHours;
  receiptFooter: string;
  active: boolean;
  /** yyyy-MM-dd */
  openedOn: string;
}
