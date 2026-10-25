const CashierPendingRefreshInterval = {
  MILLISECONDS: 3000,
};

/**
 * 收银台待发货轮询。定时拉列表和扫码付款到账，上一轮还没回来时跳过。
 */
export function useCashierPendingRefresh(options: {
  loadPendingDeliverySales: () => Promise<void>;
  loadPaymentNotices: () => Promise<void>;
  intervalMs?: number;
}): {
  startPendingDeliveryRefresh: () => void;
  stopPendingDeliveryRefresh: () => void;
} {
  const pendingDeliveryRefreshInterval = options.intervalMs ?? CashierPendingRefreshInterval.MILLISECONDS;
  let pendingDeliveryTimer = 0;
  let pendingDeliveryRefreshing = false;

  /**
   * 上一轮还没回来时跳过，避免请求叠在一起。先刷新待发货，再检查扫码付款。
   */
  async function refreshPendingDeliverySales(): Promise<void> {
    if (pendingDeliveryRefreshing === true) {
      return;
    }
    pendingDeliveryRefreshing = true;
    try {
      await options.loadPendingDeliverySales();
      await options.loadPaymentNotices();
    } finally {
      pendingDeliveryRefreshing = false;
    }
  }

  /**
   * 进入收银台后按固定间隔刷新待发货列表。
   */
  function startPendingDeliveryRefresh(): void {
    pendingDeliveryTimer = window.setInterval(() => {
      void refreshPendingDeliverySales();
    }, pendingDeliveryRefreshInterval);
  }

  /**
   * 离开收银台后停止待发货刷新。
   */
  function stopPendingDeliveryRefresh(): void {
    window.clearInterval(pendingDeliveryTimer);
    pendingDeliveryTimer = 0;
  }

  return {
    startPendingDeliveryRefresh,
    stopPendingDeliveryRefresh,
  };
}
