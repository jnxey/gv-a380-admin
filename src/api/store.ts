/**
 * 商超模块接口地址（相对 API_PREFIX）。
 */
export const StoreApi = {
  SHOPS: '/store/shops',
  shop: (shopId: string) => `/store/shops/${shopId}`,
  shopImages: (shopId: string) => `/store/shops/${shopId}/images`,
  shopImagesSort: (shopId: string) => `/store/shops/${shopId}/images/sort`,
  shopImage: (shopId: string, imageId: string) => `/store/shops/${shopId}/images/${imageId}`,
  PRODUCT_CATEGORIES: '/store/product-categories',
  PRODUCT_CATEGORIES_SORT: '/store/product-categories/sort',
  productCategory: (categoryId: string) => `/store/product-categories/${categoryId}`,
  PRODUCTS: '/store/products',
  PRODUCTS_SORT: '/store/products/sort',
  product: (productId: string) => `/store/products/${productId}`,
  productImages: (productId: string) => `/store/products/${productId}/images`,
  productImage: (productId: string, imageId: string) => `/store/products/${productId}/images/${imageId}`,
  PURCHASES: '/store/purchases',
  SALES: '/store/sales',
  PAY_QR: '/store/pay-qr',
  BILLS: '/store/bills',
  BILLS_SUMMARY: '/store/bills/summary',
  BILLS_EXPORT: '/store/bills/export',
  REVIEWS: '/store/reviews',
} as const;
