declare global {
  namespace JSX {
    interface Element extends VNode { }
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

type DefaultProps = Record<string, unknown>

export interface VNode<P = DefaultProps> {
  type: string | Component<P>
  props: P
  key?: string | number | undefined
}

export interface Component<P = DefaultProps> {
  (props: P): VNode<P>
}

export type VChild<P = DefaultProps> = VNode<P> | string | number | boolean | null | undefined

export const jsx = <P = DefaultProps>(type: string | Component<P>, props: P, key: string | number): VNode<P> => {
  return { type, props, key }
}
