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

export type VChild<P = object> = VNode<P> | string | number | boolean | null | undefined

interface Props {
  children: VChild | VChild[]
}

export const jsx = (type: string | Component, props: Props, key: string | number): VNode => {
  return { type, props, key }
}
