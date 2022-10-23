import { PLACEMENT_EFFECT, UPDATE_EFFECT } from '../constants/effects'
import { TEXT_NODE_TYPE } from '../constants/node-type'
import { BridgeEvent } from './events'
import { Fiber } from './fiber'
import { VChild, VNode } from './jsx'

const isEvent = (key: string) =>
  key[0] === 'o' && key[1] === 'n'

const createPlacementFiber = (element: VNode<Record<string, unknown>>): Fiber => {
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
    key: element.key,
    props: element.props,
    alternate: null,
    effectTag: PLACEMENT_EFFECT,
    effectData: {
      props,
      events,
      listeners,
    },
  }
}

const createUpdateFiber = (element: VNode<Record<string, any>>, oldFiber: Fiber): Fiber => {
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
    key: oldFiber.key,
    props: element.props,
    domId: oldFiber.domId,
    alternate: oldFiber,
    effectTag: UPDATE_EFFECT,
    effectData: {
      props: hasProps ? props : null,
      listeners: hasListeners ? listeners : null,
    },
  }
}

const createFiber = (element: VNode, oldFiber?: Fiber | null | undefined) => {
  const sameType = oldFiber && element && element.type == oldFiber.type

  if (sameType) {
    return createUpdateFiber(element, oldFiber)
  }

  return createPlacementFiber(element)
}

const appendChild = (parentFiber: Fiber, fiber: Fiber, prevSibling: Fiber | null) => {
  fiber.parent = parentFiber

  if (prevSibling) {
    prevSibling.sibling = fiber
  } else {
    parentFiber.child = fiber
  }
}

const removeChild = (parentFiber: Fiber, oldFiber: Fiber) => {
  const deletions = (parentFiber.deletions ||= [])

  deletions.push(oldFiber)
}

const Flagment = ({ children }: any) => children

const normalizeVNode = (child: VChild | VChild[]): VNode | [] => {
  if (child == null || typeof child === 'boolean') {
    return []
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

  if (Array.isArray(child)) {
    return {
      type: Flagment,
      props: { children: child },
    }
  }

  return child
}

const getChildKeyMap = (fiber: Fiber | null | undefined) => {
  const map = new Map<string | number, Fiber>()

  if (!fiber) {
    return map
  }

  let target = fiber.child

  while (target) {
    if (target.key != null) {
      map.set(target.key, target)
    }
    target = target.sibling
  }

  return map
}

const getKey = (obj: VNode | Fiber | null | undefined) =>
  (obj && obj.key != null) ? obj.key : null

export const reconcileChildren = (wipFiber: Fiber, children: VChild | VChild[] | VChild[][]) => {
  const elements = (Array.isArray(children) ? children : [children]).flatMap(normalizeVNode)
  const oldKeyMap = getChildKeyMap(wipFiber.alternate)
  const usedKeys = new Set<string | number>()

  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null | undefined = null

  while (index < elements.length) {
    const element = elements[index]!
    const newKey = element.key
    const oldKey = getKey(oldFiber)

    if (usedKeys.has(newKey!)) {
      oldFiber = oldFiber && oldFiber.sibling
      continue
    }

    let newFiber: Fiber | null = null

    if (newKey != null && oldFiber && newKey === getKey(oldFiber.sibling)) {
      if (oldKey == null) {
        removeChild(wipFiber, oldFiber)
      }
      oldFiber = oldFiber.sibling
      continue
    }

    if (newKey == null) {
      if (oldKey == null) {
        newFiber = createFiber(element, oldFiber)
        index++
      }
      oldFiber = oldFiber && oldFiber.sibling
    } else {
      if (oldKey === newKey) {
        newFiber = createFiber(element, oldFiber)
        oldFiber = oldFiber && oldFiber.sibling
      } else {
        const keyedFiber = oldKeyMap.get(newKey)

        if (keyedFiber) {
          newFiber = createFiber(element, keyedFiber)
          newFiber!.reorder = true
        } else {
          newFiber = createFiber(element)
        }
      }

      usedKeys.add(newKey)
      oldKeyMap.delete(newKey)
      index++
    }

    if (newFiber) {
      appendChild(wipFiber, newFiber, prevSibling)

      prevSibling = newFiber
    }
  }

  while (oldFiber) {
    if (getKey(oldFiber) == null) {
      removeChild(wipFiber, oldFiber)
    }
    oldFiber = oldFiber.sibling
  }

  oldKeyMap.forEach((fiber) => {
    removeChild(wipFiber, fiber)
  })
}
