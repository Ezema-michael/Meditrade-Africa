/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DevUser {
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'buyer';
  businessName: string;
  phone: string;
}

export const DEV_ADMIN_USER: DevUser = {
  id: 'dev-admin',
  email: 'dev-admin@meditrade.local',
  role: 'admin',
  businessName: 'MediTrade Development Admin',
  phone: '+2348000000000'
};

export const isDevAdminEnabled = (): boolean => {
  const metaEnv = (import.meta as any).env;
  return (
    metaEnv?.DEV === true &&
    metaEnv?.MODE !== 'production' &&
    metaEnv?.PROD !== true &&
    metaEnv?.VITE_ENABLE_DEV_ADMIN === 'true'
  );
};
