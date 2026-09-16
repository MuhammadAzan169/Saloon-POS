import type { BusinessHours, Credential, Shop, User } from '@/types';

const NOW = '2026-01-05T09:00:00.000Z';
const base = (id: string) => ({ id, createdAt: NOW, updatedAt: NOW });

/** Salon hours: closed Mondays, long Saturdays. */
function hours(open: string, close: string, satClose: string): BusinessHours {
  return [
    { weekday: 0, closed: false, open, close },
    { weekday: 1, closed: true, open, close },
    { weekday: 2, closed: false, open, close },
    { weekday: 3, closed: false, open, close },
    { weekday: 4, closed: false, open, close },
    { weekday: 5, closed: false, open, close },
    { weekday: 6, closed: false, open, close: satClose },
  ];
}

export const SHOP_IDS = {
  gulberg: 'shop_0001',
  dha: 'shop_0002',
  clifton: 'shop_0003',
} as const;

export const shops: Shop[] = [
  {
    ...base(SHOP_IDS.gulberg),
    name: 'Lumière Gulberg',
    code: 'LMG',
    addressLine: '14-C, MM Alam Road, Gulberg III',
    city: 'Lahore',
    phone: '042 3577 1420',
    email: 'gulberg@lumieresalon.pk',
    managerName: 'Sana Tariq',
    logoUrl: null,
    businessHours: hours('10:00', '20:00', '21:00'),
    receiptFooter: 'Thank you for visiting Lumière Gulberg. We would love to see you again.',
    active: true,
    openedOn: '2019-03-12',
  },
  {
    ...base(SHOP_IDS.dha),
    name: 'Lumière DHA Phase 6',
    code: 'LMD',
    addressLine: 'Plot 22, Broadway Commercial, DHA Phase 6',
    city: 'Lahore',
    phone: '042 3717 9080',
    email: 'dha@lumieresalon.pk',
    managerName: 'Hina Raza',
    logoUrl: null,
    businessHours: hours('11:00', '20:30', '21:00'),
    receiptFooter: 'Thank you for visiting Lumière DHA. Follow @lumiere.pk for offers.',
    active: true,
    openedOn: '2021-08-02',
  },
  {
    ...base(SHOP_IDS.clifton),
    name: 'Lumière Clifton',
    code: 'LMC',
    addressLine: 'Shop 5, Block 4, Khayaban-e-Roomi, Clifton',
    city: 'Karachi',
    phone: '021 3530 6611',
    email: 'clifton@lumieresalon.pk',
    managerName: 'Rabia Naseem',
    logoUrl: null,
    businessHours: hours('11:00', '21:00', '22:00'),
    receiptFooter: 'Thank you for visiting Lumière Clifton. Appointments: 021 3530 6611.',
    active: true,
    openedOn: '2023-11-18',
  },
];

export const users: User[] = [
  {
    ...base('usr_0001'),
    email: 'admin@lumieresalon.pk',
    name: 'Amara Sheikh',
    role: 'admin',
    shopId: null,
    avatarUrl: null,
    phone: '0300 8412200',
    active: true,
    lastLoginAt: null,
  },
  {
    ...base('usr_0002'),
    email: 'gulberg@lumieresalon.pk',
    name: 'Sana Tariq',
    role: 'shop',
    shopId: SHOP_IDS.gulberg,
    avatarUrl: null,
    phone: '0301 4477120',
    active: true,
    lastLoginAt: null,
  },
  {
    ...base('usr_0003'),
    email: 'dha@lumieresalon.pk',
    name: 'Hina Raza',
    role: 'shop',
    shopId: SHOP_IDS.dha,
    avatarUrl: null,
    phone: '0322 6690455',
    active: true,
    lastLoginAt: null,
  },
  {
    ...base('usr_0004'),
    email: 'clifton@lumieresalon.pk',
    name: 'Rabia Naseem',
    role: 'shop',
    shopId: SHOP_IDS.clifton,
    avatarUrl: null,
    phone: '0333 2145098',
    active: true,
    lastLoginAt: null,
  },
];

/**
 * Demo credentials. This whole table disappears the moment Supabase Auth is
 * wired in — see `src/services/authService.ts`.
 */
export const credentials: Credential[] = [
  { userId: 'usr_0001', email: 'admin@lumieresalon.pk', password: 'admin123' },
  { userId: 'usr_0002', email: 'gulberg@lumieresalon.pk', password: 'shop123' },
  { userId: 'usr_0003', email: 'dha@lumieresalon.pk', password: 'shop123' },
  { userId: 'usr_0004', email: 'clifton@lumieresalon.pk', password: 'shop123' },
];

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@lumieresalon.pk', password: 'admin123' },
  shop: { email: 'gulberg@lumieresalon.pk', password: 'shop123' },
} as const;
