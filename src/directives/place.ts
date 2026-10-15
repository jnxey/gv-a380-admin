import { nextTick, type Directive, type VNode } from 'vue';
import { isEmpty } from '../utils/tools';
import './place.css';

/** 浮在框顶的提示节点类名。 */
const placeholderClassName = 'placeholder-dom';

/** 提示落回框内时的动画类名。 */
const placeholderRemoveClassName = 'remove';

/** 与样式里的动画时长一致。 */
const placeholderAnimationMilliseconds = 300;

/** 动画结束事件没触发时，多等一会儿再删节点。 */
const placeholderAnimationFallbackMilliseconds = 50;

interface PlaceholderRemoveTask {
  cancel: () => void;
}

interface PlaceFieldProps {
  modelValue?: unknown;
  placeholder?: unknown;
}

const pendingRemoveTaskMap = new WeakMap<HTMLElement, PlaceholderRemoveTask>();

/**
 * 把内容区透明度恢复成样式表里的值。
 */
function resetContentOpacity(contentElement: HTMLElement | null): void {
  if (isEmpty(contentElement)) {
    return;
  }
  contentElement.style.opacity = '';
}

/**
 * 取消还没播完的回落动画。
 */
function cancelPendingRemove(placeholderElement: HTMLElement): void {
  const pendingTask = pendingRemoveTaskMap.get(placeholderElement);
  if (isEmpty(pendingTask)) {
    return;
  }
  pendingTask.cancel();
  pendingRemoveTaskMap.delete(placeholderElement);
}

/**
 * 立刻删掉浮动提示，并取消未完成的回落。
 */
function forceRemovePlaceholder(hostElement: HTMLElement, placeholderElement: HTMLElement): void {
  cancelPendingRemove(placeholderElement);
  if (placeholderElement.parentNode === hostElement) {
    hostElement.removeChild(placeholderElement);
  }
}

/**
 * 等回落动画结束后删掉提示，并恢复框内文字。
 */
function schedulePlaceholderRemove(
  hostElement: HTMLElement,
  placeholderElement: HTMLElement,
  contentElement: HTMLElement | null,
): void {
  if (pendingRemoveTaskMap.has(placeholderElement)) {
    return;
  }
  let finished = false;

  /**
   * 动画结束或超时后的统一收尾。
   */
  function finishPlaceholderRemove(): void {
    if (finished) {
      return;
    }
    finished = true;
    placeholderElement.removeEventListener('animationend', onPlaceholderRemoveAnimationEnd);
    window.clearTimeout(fallbackTimerId);
    pendingRemoveTaskMap.delete(placeholderElement);
    if (placeholderElement.parentNode === hostElement) {
      hostElement.removeChild(placeholderElement);
    }
    resetContentOpacity(contentElement);
  }

  /**
   * 只处理这个提示节点自己的动画结束。
   */
  function onPlaceholderRemoveAnimationEnd(animationEvent: AnimationEvent): void {
    if (animationEvent.target === placeholderElement) {
      finishPlaceholderRemove();
    }
  }

  placeholderElement.addEventListener('animationend', onPlaceholderRemoveAnimationEnd);
  const fallbackTimerId = window.setTimeout(
    finishPlaceholderRemove,
    placeholderAnimationMilliseconds + placeholderAnimationFallbackMilliseconds,
  );
  pendingRemoveTaskMap.set(placeholderElement, {
    cancel: () => {
      placeholderElement.removeEventListener('animationend', onPlaceholderRemoveAnimationEnd);
      window.clearTimeout(fallbackTimerId);
      pendingRemoveTaskMap.delete(placeholderElement);
    },
  });
}

/**
 * 在控件顶部创建浮动提示，并触发布局以便动画能播出来。
 */
function createPlaceholderElement(hostElement: HTMLElement, placeholderText: string): void {
  const placeholderElement = document.createElement('div');
  placeholderElement.classList.add(placeholderClassName);
  placeholderElement.textContent = placeholderText;
  hostElement.appendChild(placeholderElement);
  // 步骤：读一次布局，避免浏览器把刚插入的节点和动画合并掉。
  void placeholderElement.offsetWidth;
}

/**
 * 按当前有没有值，显示或收回顶部提示。
 */
function syncPlaceholder(
  hostElement: HTMLElement,
  valueIsEmpty: boolean,
  placeholderText: string,
  contentSelector: string,
): void {
  const contentElement = hostElement.querySelector(contentSelector);
  const content = contentElement instanceof HTMLElement ? contentElement : null;
  if (isEmpty(placeholderText)) {
    return;
  }
  const placeholderNode = hostElement.querySelector(`.${placeholderClassName}`);
  const placeholderElement = placeholderNode instanceof HTMLElement ? placeholderNode : null;

  if (valueIsEmpty) {
    // 步骤 1：没有值，也不该留着顶部提示。
    if (isEmpty(placeholderElement)) {
      resetContentOpacity(content);
      return;
    }
    // 步骤 2：正在往回落。
    if (placeholderElement.classList.contains(placeholderRemoveClassName)) {
      if (pendingRemoveTaskMap.has(placeholderElement)) {
        return;
      }
      forceRemovePlaceholder(hostElement, placeholderElement);
      resetContentOpacity(content);
      return;
    }
    // 步骤 3：顶部提示还在，播回落动画并安排删除。
    placeholderElement.classList.add(placeholderRemoveClassName);
    if (!isEmpty(content)) {
      content.style.opacity = '0';
    }
    schedulePlaceholderRemove(hostElement, placeholderElement, content);
    return;
  }

  // 步骤 4：有值时把提示浮到框顶。
  resetContentOpacity(content);
  if (!isEmpty(placeholderElement) && !placeholderElement.classList.contains(placeholderRemoveClassName)) {
    return;
  }
  // 步骤 5：上次回落没清干净时先删掉，再重新浮上来。
  if (!isEmpty(placeholderElement)) {
    forceRemovePlaceholder(hostElement, placeholderElement);
  }
  createPlaceholderElement(hostElement, placeholderText);
}

/**
 * 读取控件上的值和提示文字。
 */
function readFieldProps(vnode: VNode): PlaceFieldProps {
  const context = vnode.ctx as { props?: PlaceFieldProps; $props?: PlaceFieldProps } | null;
  if (isEmpty(context)) {
    return {};
  }
  if (context.props !== undefined) {
    return context.props;
  }
  if (context.$props !== undefined) {
    return context.$props;
  }
  return {};
}

/**
 * 提示文字不是字符串时按空处理。
 */
function readPlaceholderText(placeholder: unknown): string {
  if (typeof placeholder !== 'string') {
    return '';
  }
  return placeholder;
}

/**
 * 等控件渲染完，再按输入框或下拉同步浮动提示。
 */
async function updatePlaceholder(hostElement: HTMLElement, vnode: VNode): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
  const fieldProps = readFieldProps(vnode);
  const placeholderText = readPlaceholderText(fieldProps.placeholder);
  const valueIsEmpty = isEmpty(fieldProps.modelValue);
  if (hostElement.querySelector('.el-input__inner') !== null) {
    syncPlaceholder(hostElement, valueIsEmpty, placeholderText, 'input');
    return;
  }
  if (hostElement.querySelector('.el-select__wrapper') !== null) {
    syncPlaceholder(hostElement, valueIsEmpty, placeholderText, '.el-select__selected-item.el-select__placeholder');
    return;
  }
  if (hostElement.querySelector('.el-textarea__inner') !== null) {
    syncPlaceholder(hostElement, valueIsEmpty, placeholderText, 'textarea');
  }
}

/**
 * 卸载时清掉浮动提示和残留透明度。
 */
function cleanupPlaceholder(hostElement: HTMLElement): void {
  const placeholderNode = hostElement.querySelector(`.${placeholderClassName}`);
  if (placeholderNode instanceof HTMLElement) {
    forceRemovePlaceholder(hostElement, placeholderNode);
  }
  const contentSelectorList = ['input', 'textarea', '.el-select__selected-item.el-select__placeholder'];
  contentSelectorList.forEach((contentSelector) => {
    const contentNode = hostElement.querySelector(contentSelector);
    resetContentOpacity(contentNode instanceof HTMLElement ? contentNode : null);
  });
}

const placeDirective: Directive<HTMLElement, boolean | undefined> = {
  mounted(hostElement, binding, vnode) {
    if (binding.value === false) {
      return;
    }
    void updatePlaceholder(hostElement, vnode);
  },
  updated(hostElement, binding, vnode) {
    if (binding.value === false) {
      return;
    }
    void updatePlaceholder(hostElement, vnode);
  },
  beforeUnmount(hostElement) {
    cleanupPlaceholder(hostElement);
  },
};

export default placeDirective;
