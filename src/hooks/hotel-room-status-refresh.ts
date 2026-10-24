/**
 * 酒店房态轮询：定时刷新房间与订单，并拉收款到账；刷新后同步办理入住选中态。
 */
export function useHotelRoomStatusRefresh(options: {
  refreshPage: () => Promise<void>;
  intervalMs?: number;
}): {
  startRoomStatusRefresh: () => void;
  stopRoomStatusRefresh: () => void;
} {
  const roomStatusRefreshInterval = options.intervalMs ?? 3000;
  let roomStatusTimer = 0;
  let roomStatusRefreshing = false;

  /**
   * 上一轮还没回来时跳过，避免请求叠在一起。
   */
  async function refreshRoomStatusPage(): Promise<void> {
    if (roomStatusRefreshing) {
      return;
    }
    roomStatusRefreshing = true;
    try {
      await options.refreshPage();
    } finally {
      roomStatusRefreshing = false;
    }
  }

  /**
   * 进入页面后按固定间隔刷新房间、订单和到账提示。
   */
  function startRoomStatusRefresh(): void {
    roomStatusTimer = window.setInterval(() => {
      void refreshRoomStatusPage();
    }, roomStatusRefreshInterval);
  }

  /**
   * 离开页面后停止房间状态刷新。
   */
  function stopRoomStatusRefresh(): void {
    window.clearInterval(roomStatusTimer);
    roomStatusTimer = 0;
  }

  return {
    startRoomStatusRefresh,
    stopRoomStatusRefresh,
  };
}
