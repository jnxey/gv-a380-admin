<script setup lang="ts">
import { MenuIconName } from '../utils/constants';

defineProps<{
  iconName: string;
}>();
</script>

<template>
  <svg v-if="iconName !== ''" class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="iconName === MenuIconName.MEMBER">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9.2" r="2" />
      <path d="M4.8 18.4c.8-2.4 2.4-3.6 4.2-3.6s3.4 1.2 4.2 3.6" />
      <path d="M13.5 14.8c1.1-.3 2.2-.2 3.2.5 1 .9 1.5 2.1 1.7 3.1" />
    </template>
    <template v-else-if="iconName === MenuIconName.MEMBER_QUERY">
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15.2 15.2 4.3 4.3" />
    </template>
    <template v-else-if="iconName === MenuIconName.MEMBER_RECHARGE">
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
      <circle cx="16" cy="14.2" r="1.2" />
    </template>
    <template v-else-if="iconName === MenuIconName.FINANCE">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m8 15 3-4 3 2 4-6" />
    </template>
    <template v-else-if="iconName === MenuIconName.FINANCE_BILL">
      <path d="M7 3.5h10v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </template>
    <template v-else-if="iconName === MenuIconName.KTV">
      <rect x="9" y="3.5" width="6" height="10" rx="3" />
      <path d="M7 11a5 5 0 0 0 10 0" />
      <path d="M12 16v4M9 20h6" />
    </template>
    <template v-else-if="iconName === MenuIconName.KTV_SHOP">
      <path d="M4 10h16" />
      <path d="m5.2 10 1.4-4.5h10.8L18.8 10" />
      <path d="M6 10v8h12v-8" />
      <path d="M10 18v-4h4v4" />
    </template>
    <template v-else-if="iconName === MenuIconName.KTV_ROOM">
      <rect x="4.5" y="4" width="15" height="16" rx="1.5" />
      <path d="M12 4v16" />
      <circle cx="9.2" cy="12" r="0.8" />
      <circle cx="14.8" cy="12" r="0.8" />
    </template>
    <template v-else-if="iconName === MenuIconName.KTV_VERIFY">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.2 2.5 2.4 4.8-5.1" />
    </template>
    <template v-else-if="iconName === MenuIconName.HOTEL">
      <path d="M4 20h16" />
      <path d="M6 20V7l6-3 6 3v13" />
      <path d="M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />
    </template>
    <template v-else-if="iconName === MenuIconName.HOTEL_ROOM_TYPE">
      <path d="M4 17V11a2 2 0 0 1 2-2h2.2" />
      <path d="M4 17h16" />
      <path d="M20 17v-4a2 2 0 0 0-2-2H10" />
      <circle cx="8" cy="11.2" r="1.3" />
    </template>
    <template v-else-if="iconName === MenuIconName.HOTEL_ROOM">
      <rect x="6" y="3.5" width="12" height="17" rx="1.4" />
      <circle cx="15" cy="12" r="0.8" />
    </template>
    <template v-else-if="iconName === MenuIconName.HOTEL_STAY">
      <circle cx="8" cy="12" r="3.2" />
      <path d="M11 12h9" />
      <path d="M17 12v2.4M20 12v2" />
    </template>
    <template v-else-if="iconName === MenuIconName.SYSTEM">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2" />
      <path d="m6.2 6.2 1.6 1.6M16.2 16.2l1.6 1.6M17.8 6.2l-1.6 1.6M7.8 16.2 6.2 17.8" />
    </template>
    <template v-else-if="iconName === MenuIconName.SYSTEM_USER">
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c1.2-2.6 3-3.8 6-3.8s4.8 1.2 6 3.8" />
    </template>
    <template v-else-if="iconName === MenuIconName.SYSTEM_ROLE">
      <circle cx="8" cy="15" r="2.2" />
      <path d="M10.2 15H18l1.6-1.6M15.2 15v2.2" />
    </template>
  </svg>
</template>

<style scoped>
.menu-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
