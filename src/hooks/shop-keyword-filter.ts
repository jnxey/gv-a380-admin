import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { isEmpty } from '../utils/tools';

/**
 * 门店关键字过滤用到的字段。
 */
export interface ShopKeywordFilterRow {
  shopName: string;
  shopCode: string;
  contactPhone: string;
  address: string;
}

/**
 * 门店列表关键字过滤。匹配名称、编码、电话、地址。
 */
export function useShopKeywordFilter<ShopRow extends ShopKeywordFilterRow>(shopList: Ref<ShopRow[]>): {
  keyword: Ref<string>;
  filteredShopList: ComputedRef<ShopRow[]>;
} {
  const keyword = ref('');

  /**
   * 按当前关键字过滤出门店。
   */
  const filteredShopList = computed(() => {
    const cleanedKeyword = keyword.value.trim().toLowerCase();
    if (isEmpty(cleanedKeyword)) {
      return shopList.value;
    }
    return shopList.value.filter((shopRow) => {
      const searchText = `${shopRow.shopName} ${shopRow.shopCode} ${shopRow.contactPhone} ${shopRow.address}`.toLowerCase();
      return searchText.indexOf(cleanedKeyword) >= 0;
    });
  });

  return {
    keyword,
    filteredShopList,
  };
}
