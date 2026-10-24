import { ElNotification } from 'element-plus';
import { statusLabel } from '../utils/constants';
import { isEmpty } from '../utils/tools';
import http from '../utils/request';

interface PaymentNoticeRow {
  id: string;
  bizType: string;
  amount: string;
  remark: string;
}

/** 收款播报语言。 */
const paymentNoticeSpeechLanguage = 'zh-CN';
/** 收款播报开头。 */
const paymentNoticeSpeechPrefix = '收款';
/** 收款播报结尾。 */
const paymentNoticeSpeechSuffix = '元';

/**
 * 房态页收款到账提示：解锁语音、轮询新账单并播报。noticeApiPath 区分 KTV / 酒店接口。
 */
export function usePaymentNotice(noticeApiPath: string): {
  preparePaymentAudio: () => void;
  loadPaymentNotices: () => Promise<void>;
  stopPaymentAudio: () => void;
} {
  let paymentNoticeBaselineReady = false;
  let paymentNoticeLoading = false;
  let latestPaymentNoticeId = 0n;
  let paymentSpeechUnlocked = false;

  /**
   * 把账单主键收成整数，用来判断哪条更新。
   */
  function billIdValue(billIdText: string): bigint {
    if (isEmpty(billIdText)) {
      return 0n;
    }
    if (!/^\d+$/.test(billIdText)) {
      return 0n;
    }
    return BigInt(billIdText);
  }

  /**
   * 选出中文语音。还没有中文语音时返回空，交给浏览器默认语音。
   */
  function findChineseVoice(): SpeechSynthesisVoice | null {
    const voiceList = window.speechSynthesis.getVoices();
    for (const voice of voiceList) {
      if (voice.lang === paymentNoticeSpeechLanguage || voice.lang.startsWith('zh')) {
        return voice;
      }
    }
    return null;
  }

  /**
   * 第一次点击页面时解锁语音。浏览器要有过操作才允许出声。
   */
  function preparePaymentAudio(): void {
    if (paymentSpeechUnlocked) {
      return;
    }
    paymentSpeechUnlocked = true;
    window.speechSynthesis.getVoices();
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    window.speechSynthesis.speak(unlockUtterance);
  }

  /**
   * 用中文播报收款金额。多笔会按调用顺序排成队列。
   */
  function playPaymentNoticeSound(amountText: string): void {
    const spokenAmount = isEmpty(amountText) ? '' : amountText.trim();
    if (isEmpty(spokenAmount)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${paymentNoticeSpeechPrefix}${spokenAmount}${paymentNoticeSpeechSuffix}`);
    utterance.lang = paymentNoticeSpeechLanguage;
    const chineseVoice = findChineseVoice();
    if (chineseVoice !== null) {
      utterance.voice = chineseVoice;
    }
    window.speechSynthesis.speak(utterance);
  }

  /**
   * 停掉还没播完的收款播报。离开页面时调用。
   */
  function stopPaymentAudio(): void {
    window.speechSynthesis.cancel();
  }

  /**
   * 检查新的店内消费和扫码付款。第一次只记住最大账单，之后才响并弹出通知。
   */
  async function loadPaymentNotices(): Promise<void> {
    if (paymentNoticeLoading) {
      return;
    }
    paymentNoticeLoading = true;
    const isBaseline = !paymentNoticeBaselineReady;
    try {
      const noticeList = (await http.get(noticeApiPath)) as PaymentNoticeRow[];
      if (Array.isArray(noticeList) !== true) {
        return;
      }
      // 1. 记下这一批里最大的账单主键
      let maxBillId = latestPaymentNoticeId;
      for (const noticeRow of noticeList) {
        const billId = billIdValue(noticeRow.id);
        if (billId > maxBillId) {
          maxBillId = billId;
        }
      }
      // 2. 第一次进入只建立基线，不把历史账报出来
      if (isBaseline) {
        paymentNoticeBaselineReady = true;
        latestPaymentNoticeId = maxBillId;
        return;
      }
      const freshNoticeList = noticeList.filter((noticeRow) => billIdValue(noticeRow.id) > latestPaymentNoticeId);
      latestPaymentNoticeId = maxBillId;
      if (freshNoticeList.length === 0) {
        return;
      }
      // 3. 按账单先后各播一句，每条新账各弹一次
      freshNoticeList.sort((leftNotice, rightNotice) => {
        const leftBillId = billIdValue(leftNotice.id);
        const rightBillId = billIdValue(rightNotice.id);
        if (leftBillId < rightBillId) {
          return -1;
        }
        if (leftBillId > rightBillId) {
          return 1;
        }
        return 0;
      });
      for (const noticeRow of freshNoticeList) {
        playPaymentNoticeSound(noticeRow.amount);
        const remarkText = isEmpty(noticeRow.remark) ? '' : noticeRow.remark.trim();
        const noticeMessage = isEmpty(remarkText) ? noticeRow.amount : `${noticeRow.amount} ${remarkText}`;
        ElNotification({ title: statusLabel(noticeRow.bizType), message: noticeMessage, type: 'success' });
      }
    } finally {
      paymentNoticeLoading = false;
    }
  }

  return {
    preparePaymentAudio,
    loadPaymentNotices,
    stopPaymentAudio,
  };
}
