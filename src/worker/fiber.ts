import { EffectTag, PLACEMENT_EFFECT } from '../constants/effects'
import { Component } from './jsx'

export interface EffectData {
  props?: Record<string, unknown> | null
  events?: Record<string, string> | null
  listeners?: Record<string, (arg: unknown) => void> | null
}

export interface Fiber<P = Record<string, unknown>> {
  type: string | Component<P>
  props: P
  key?: string | number
  domId?: number
  effectTag?: EffectTag
  effectData?: EffectData
  reorder?: boolean
  alternate?: Fiber | null
  parent?: Fiber | null
  child?: Fiber | null
  sibling?: Fiber | null
  deletions?: Fiber[]
  hooks?: any[]
}

export const getNextFiber = (fiber: Fiber, baseFiber?: Fiber | null | undefined) => {
  if (fiber.child) {
    return fiber.child
  }

  let nextFiber: Fiber | null | undefined = fiber

  while (nextFiber && nextFiber !== baseFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }

  return null
}

export const getHostSibling = (fiber: Fiber) => {
  let node: Fiber | null | undefined = fiber.sibling

  while (node) {
    if (typeof node.type === 'string' && node.effectTag !== PLACEMENT_EFFECT) {
      return node
    }
    node = getNextFiber(node, fiber.parent)
  }

  return null
}
