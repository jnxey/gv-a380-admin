import dragula, { type Drake } from 'dragula/dist/dragula';
import 'dragula/dist/dragula.css';
import { nextTick, onBeforeUnmount } from 'vue';
import { isEmpty } from '../utils/tools';

const dragSortNameClass = 'name-box';
const dragSortIconClass = 'drag-icon';
const dragSortKeyAttribute = 'data-key';
const createCardClass = 'room-type-create';
const recordHeadClass = 'record-head';
const scrollEdgePx = 48;
const scrollMaxSpeed = 12;

/**
 * 列表拖动排序。只有六点图标能拖，松手后按页面顺序交出编号。
 */
export function useDragSort(getContainer: () => HTMLElement | null, canDrag: () => boolean, onSort: (idList: string[]) => Promise<void>): {
  initDragSort: () => Promise<void>;
} {
  let dragInstance: Drake | null = null;
  let unbindAutoScroll: (() => void) | null = null;

  /**
   * 绑定到当前列表。没有保存权限或容器还没渲染时不启用。
   */
  async function initDragSort(): Promise<void> {
    if (canDrag() !== true) {
      return;
    }
    await nextTick();
    const dragContainer = getContainer();
    if (isEmpty(dragContainer)) {
      return;
    }
    destroyDragSort();
    dragInstance = dragula([dragContainer], {
      invalid: (_element, handle) => {
        return canStartDrag(handle) !== true;
      },
      accepts: (_element, _target, _source, sibling) => {
        if (sibling !== null && sibling.classList.contains(createCardClass)) {
          return false;
        }
        if (sibling !== null && sibling.classList.contains(recordHeadClass)) {
          return false;
        }
        return true;
      },
    }).on('dragend', () => {
      void finishDrag();
    });
    unbindAutoScroll = bindDragAutoScroll(dragInstance);
  }

  /**
   * 松开后读取名称节点上的编号，交给页面保存。
   */
  async function finishDrag(): Promise<void> {
    await nextTick();
    const dragContainer = getContainer();
    if (isEmpty(dragContainer)) {
      return;
    }
    const nameNodeList = dragContainer.querySelectorAll(`.${dragSortNameClass}`);
    const idList: string[] = [];
    nameNodeList.forEach((nameNode) => {
      const recordId = nameNode.getAttribute(dragSortKeyAttribute);
      if (isEmpty(recordId)) {
        return;
      }
      idList.push(recordId);
    });
    if (isEmpty(idList)) {
      return;
    }
    await onSort(idList);
  }

  /**
   * 卸掉拖动和自动滚动。
   */
  function destroyDragSort(): void {
    if (unbindAutoScroll !== null) {
      unbindAutoScroll();
      unbindAutoScroll = null;
    }
    if (dragInstance !== null) {
      dragInstance.destroy();
      dragInstance = null;
    }
  }

  onBeforeUnmount(() => {
    destroyDragSort();
  });

  return { initDragSort };
}

/**
 * 从手柄往上找。碰到六点图标才能拖，碰到名称区域则停。
 */
function canStartDrag(element: Element | null): boolean {
  if (isEmpty(element)) {
    return false;
  }
  if (element.classList.contains(dragSortNameClass)) {
    return false;
  }
  if (element.classList.contains(dragSortIconClass)) {
    return true;
  }
  return canStartDrag(element.parentElement);
}

/**
 * 拖到内容区边缘时滚动页面。
 */
function bindDragAutoScroll(dragInstance: Drake): () => void {
  let clientY = 0;
  let frameId: number | null = null;
  let dragging = false;

  const onMove = (event: MouseEvent): void => {
    clientY = event.clientY;
  };

  const tick = (): void => {
    if (dragging !== true) {
      return;
    }
    const scrollElement = document.querySelector('.admin-content');
    if (scrollElement instanceof HTMLElement) {
      const scrollRect = scrollElement.getBoundingClientRect();
      const previousScrollTop = scrollElement.scrollTop;
      let speed = 0;
      if (clientY < scrollRect.top + scrollEdgePx) {
        const depth = scrollRect.top + scrollEdgePx - clientY;
        speed = -Math.min(scrollMaxSpeed, Math.max(1, (depth / scrollEdgePx) * scrollMaxSpeed));
      } else if (clientY > scrollRect.bottom - scrollEdgePx) {
        const depth = clientY - (scrollRect.bottom - scrollEdgePx);
        speed = Math.min(scrollMaxSpeed, Math.max(1, (depth / scrollEdgePx) * scrollMaxSpeed));
      }
      if (speed !== 0) {
        scrollElement.scrollTop += speed;
        if (scrollElement.scrollTop !== previousScrollTop) {
          scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
      }
    }
    frameId = requestAnimationFrame(tick);
  };

  const start = (): void => {
    if (dragging === true) {
      return;
    }
    dragging = true;
    document.addEventListener('mousemove', onMove, { passive: true });
    frameId = requestAnimationFrame(tick);
  };

  const stop = (): void => {
    if (dragging !== true) {
      return;
    }
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  dragInstance.on('drag', start);
  dragInstance.on('dragend', stop);
  return () => {
    stop();
    dragInstance.off('drag', start);
    dragInstance.off('dragend', stop);
  };
}
