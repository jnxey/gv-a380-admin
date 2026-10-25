/**
 * 包厢房态轮询：定时刷新房间，并按次数节流待核销；同时拉收款到账。
 */
export function useKtvRoomStatusRefresh(options: {
  loadRooms: (loadOptions?: { reloadPending?: boolean }) => Promise<void>;
  loadPaymentNotices: () => Promise<void>;
  intervalMs?: number;
  pendingEveryPollCount?: number;
}): {
  startRoomStatusRefresh: () => void;
  stopRoomStatusRefresh: () => void;
} {
  const roomStatusRefreshInterval = options.intervalMs ?? 3000;
  const pendingReloadEveryPollCount = options.pendingEveryPollCount ?? 5;
  let roomStatusTimer = 0;
  let roomStatusRefreshing = false;
  let roomStatusPollCount = 0;

  /**
   * 同时刷新包厢状态，并检查新的店内消费和扫码付款。上一轮还没回来时跳过，避免请求叠在一起。
   * 房型不随轮询重拉；待核销按次数节流。
   */
  async function refreshRoomStatusPage(): Promise<void> {
    if (roomStatusRefreshing) {
      return;
    }
    roomStatusRefreshing = true;
    try {
      roomStatusPollCount += 1;
      const reloadPending = roomStatusPollCount % pendingReloadEveryPollCount === 0;
      await options.loadRooms({ reloadPending });
      await options.loadPaymentNotices();
    } finally {
      roomStatusRefreshing = false;
    }
  }

  /**
   * 进入页面后按固定间隔刷新包厢状态和待核销订单。
   */
  function startRoomStatusRefresh(): void {
    roomStatusTimer = window.setInterval(() => {
      void refreshRoomStatusPage();
    }, roomStatusRefreshInterval);
  }

  /**
   * 离开页面后停止包厢状态刷新。
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
