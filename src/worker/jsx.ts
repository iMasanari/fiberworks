declare global {
  namespace JSX {
    interface Element extends VNode<any> { }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export interface VNode<P = object> {
  type: string | Component<P>
  props: P
  key?: string | number | undefined
}

export interface Component<P = object> {
  (props: P): VNode<P>
}

export type VChild = VNode | string | number | boolean | null | undefined

interface Props {
  children: VNode | string | (VNode | string)[]
}

export const jsx = (type: string | Component, props: Props, key: string | number): VNode => {
  return { type, props, key }
}
