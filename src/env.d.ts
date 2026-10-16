declare module 'dragula/dist/dragula' {
  export interface Drake {
    destroy(): void;
    on(eventName: 'drag' | 'dragend', callback: () => void): Drake;
    off(eventName: 'drag' | 'dragend', callback: () => void): void;
  }

  export interface DragulaOptions {
    invalid?: (element: Element, handle: Element) => boolean;
    accepts?: (element: Element, target: Element, source: Element, sibling: Element | null) => boolean;
  }

  export default function dragula(containers: Element[], options?: DragulaOptions): Drake;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
