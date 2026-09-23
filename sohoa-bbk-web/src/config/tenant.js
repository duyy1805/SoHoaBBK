export const TENANTS = Object.freeze({ Z76: 'Z76', PLP: 'PLP' });
const STORAGE_KEY = 'appTenant';

export const getTenant = () => localStorage.getItem(STORAGE_KEY)
    || sessionStorage.getItem(STORAGE_KEY)
    || TENANTS.Z76;

export const setTenant = (tenant, remember = true) => {
    if (!Object.values(TENANTS).includes(tenant)) throw new Error('Đơn vị không hợp lệ');
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(STORAGE_KEY, tenant);
    other.removeItem(STORAGE_KEY);
};

export const clearTenant = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
};

export const isPlpTenant = () => getTenant() === TENANTS.PLP;
export const getTenantBranding = () => isPlpTenant()
    ? { companyName: 'PHÁT LONG PHƯỚC', shortName: 'PLP' }
    : { companyName: 'CÔNG TY TNHH MTV 76', shortName: 'Z76' };

export const getApiBaseUrl = (tenant = getTenant()) => {
    const z76Url = import.meta.env.VITE_Z76_API_URL || 'https://z76api.z76.vn/api';
    const url = tenant === TENANTS.PLP
        ? (import.meta.env.VITE_PLP_API_URL || `${z76Url.replace(/\/$/, '')}/plp`)
        : z76Url;
    if (!url) throw new Error(`Chưa cấu hình API cho đơn vị ${tenant}`);
    return url.replace(/\/$/, '');
};

export const getAssetUrl = (value) => {
    const url = String(value || '');
    if (!url || /^https?:\/\//i.test(url)) return url;
    const serverRoot = getApiBaseUrl().replace(/\/api(?:\/plp)?\/?$/, '');
    return `${serverRoot}${url.startsWith('/') ? url : `/${url}`}`;
};
