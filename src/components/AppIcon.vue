<script setup lang="ts">
import { computed } from 'vue';
import { isEmpty } from '../utils/tools';
import { MenuIconShapeKind, menuIconShapeListByName } from './appIconShapeList';

const props = defineProps<{
  iconName: string;
}>();

/**
 * 按图标名取出要画的图形，没有对应图标时不画。
 */
const iconShapeList = computed(() => {
  const shapeList = menuIconShapeListByName[props.iconName];
  if (isEmpty(shapeList)) {
    return [];
  }
  return shapeList;
});
</script>

<template>
  <svg v-if="isEmpty(iconShapeList) === false" class="app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-for="(iconShape, iconShapeIndex) in iconShapeList" :key="iconShapeIndex">
      <path v-if="iconShape.shapeKind === MenuIconShapeKind.PATH" :d="iconShape.pathData" />
      <circle
        v-else-if="iconShape.shapeKind === MenuIconShapeKind.CIRCLE"
        :cx="iconShape.centerX"
        :cy="iconShape.centerY"
        :r="iconShape.radius"
      />
      <rect
        v-else-if="iconShape.shapeKind === MenuIconShapeKind.RECT"
        :x="iconShape.offsetX"
        :y="iconShape.offsetY"
        :width="iconShape.width"
        :height="iconShape.height"
        :rx="iconShape.cornerRadius"
      />
    </template>
  </svg>
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
</style>
