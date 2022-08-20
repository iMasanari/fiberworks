import { DELETION_EFFECT, PLACEMENT_EFFECT, UPDATE_EFFECT } from '../constants/effects'
import { TEXT_NODE_TYPE } from '../constants/node-type'
import { BridgeEvent } from './events'
import { Fiber } from './fiber'
import { VChild, VNode } from './jsx'

const isEvent = (key: string) =>
  key[0] === 'o' && key[1] === 'n'

const createPlacementFiber = (element: VNode<Record<string, unknown>>, parentFiber: Fiber): Fiber => {
  const props = {} as Record<string, unknown>
  const events = {} as Record<string, string>
  const listeners = {} as Record<string, (arg: unknown) => void>

  for (const key in element.props) {
    if (isEvent(key)) {
      const eventType = key.toLowerCase().substring(2)
      const event = element.props[key] as BridgeEvent<unknown>

      events[eventType] = event.bridge
      listeners[eventType] = event.listener
    } else if (key !== 'children') {
      props[key] = element.props[key]
    }
  }

  return {
    type: element.type,
    props: element.props,
    parent: parentFiber,
    alternate: null,
    effectTag: PLACEMENT_EFFECT,
    effectData: {
      props,
      events,
      listeners,
    },
  }
}

const createUpdateFiber = (element: VNode<Record<string, any>>, parentFiber: Fiber, oldFiber: Fiber): Fiber => {
  let hasProps = false
  let hasListeners = false
  const props = {} as Record<string, any>
  const listeners = {} as Record<string, any>

  for (const key in element.props) {
    if (isEvent(key)) {
      // TODO: update client event hundler
      listeners[key.toLowerCase().substring(2)] = element.props[key].listener
      hasListeners = true
    } else if (key !== 'children' && element.props[key] !== oldFiber.props[key]) {
      props[key] = element.props[key]
      hasProps = true
    }
  }

  return {
    type: oldFiber.type,
    props: element.props,
    domId: oldFiber.domId,
    parent: parentFiber,
    alternate: oldFiber,
    effectTag: UPDATE_EFFECT,
    effectData: {
      props: hasProps ? props : null,
      listeners: hasListeners ? listeners : null,
    },
  }
}

const normalizeVNode = (child: VChild) => {
  if (child == null || typeof child === 'boolean') {
    return null
  }

  if (typeof child !== 'object') {
    return {
      type: TEXT_NODE_TYPE,
      props: {
        nodeValue: child,
        children: [],
      },
    }
  }

  return child
}

export const reconcileChildren = (wipFiber: Fiber, children: VChild[], deletions: Fiber[]) => {
  const elements = children.map(normalizeVNode)

  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null | undefined = null

  while (index < elements.length || oldFiber) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      newFiber = createUpdateFiber(element, wipFiber, oldFiber!)
    }
    if (element && !sameType) {
      newFiber = createPlacementFiber(element, wipFiber)
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = DELETION_EFFECT

      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling!.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}
