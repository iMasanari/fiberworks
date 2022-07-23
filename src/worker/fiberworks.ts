import { DELETION_EFFECT_TYPE, EffectTag, PLACEMENT_EFFECT_TYPE, UPDATE_EFFECT_TYPE } from '../constants/effect-type'
import { ROOT_NODE_TYPE, TEXT_NODE_TYPE } from '../constants/node-type'
import { Component, VChild, VNode } from './jsx'
import { requestSchedule } from './scheduler'

export interface CommitNode {
  type: string
  domId: number
  props: Record<string, string | number | boolean | null>
  events: Record<string, string>
}

interface PlacementCommit {
  type: typeof PLACEMENT_EFFECT_TYPE
  domId: number
  node: CommitNode
}

interface DeletionCommit {
  type: typeof DELETION_EFFECT_TYPE
  domId: number
  children: number[]
}

interface UpdateCommit {
  type: typeof UPDATE_EFFECT_TYPE
  domId: number
  props: Record<string, any>
}

export type Commit =
  | PlacementCommit
  | DeletionCommit
  | UpdateCommit

interface EffectData {
  props?: Record<string, any> | null
  events?: Record<string, any> | null
  listeners?: Record<string, any> | null
}

interface Fiber {
  type: string | Component
  props: Record<string, any>
  domId?: number
  effectTag?: EffectTag
  effectData?: EffectData
  alternate?: Fiber | null
  parent?: Fiber | null
  child?: Fiber | null
  sibling?: Fiber | null
  hooks?: any[]
}

const eventListenersMap = new Map<number, Record<string, (arg: unknown) => void>>()

const commitRoot = () => {
  const commits: Commit[] = []

  deletions.forEach(fiber => commitWork(fiber, commits))

  let nextFiber = wipRoot!.child
  while (nextFiber) {
    nextFiber = commitWork(nextFiber, commits)
  }

  postMessage({ workingId, commits })

  currentRoot = wipRoot
  wipRoot = null
}

const commitWork = (fiber: Fiber, commits: Commit[]) => {
  if (fiber.effectTag === PLACEMENT_EFFECT_TYPE && fiber.domId) {
    let domParentFiber = fiber.parent!
    while (domParentFiber.domId == null) {
      domParentFiber = domParentFiber.parent!
    }

    const { props, events, listeners } = fiber.effectData!

    eventListenersMap.set(fiber.domId, listeners!)

    commits.push({
      type: PLACEMENT_EFFECT_TYPE,
      domId: domParentFiber.domId,
      node: {
        type: fiber.type as string,
        domId: fiber.domId,
        props: props!,
        events: events!,
      },
    })
  } else if (fiber.effectTag === UPDATE_EFFECT_TYPE && fiber.domId) {
    const { props, listeners } = fiber.effectData!

    if (listeners) {
      // TODO: update client event hundler
      eventListenersMap.set(fiber.domId, listeners)
    }

    if (props) {
      commits.push({
        type: UPDATE_EFFECT_TYPE,
        domId: fiber.domId,
        props,
      })
    }
  } else if (fiber.effectTag === DELETION_EFFECT_TYPE) {
    commitDeletion(fiber, commits)
    return
  }

  return getNextFiber(fiber)
}

const isEvent = (key: string) =>
  key[0] === 'o' && key[1] === 'n'

const commitDeletion = (fiber: Fiber, commits: Commit[]) => {
  const domIdList: number[] = []

  let nextFiber: Fiber | null | undefined = fiber
  while (nextFiber) {
    if (nextFiber.domId) {
      domIdList.push(nextFiber.domId)
    }

    nextFiber = getNextFiber(nextFiber, fiber)
  }

  if (domIdList.length) {
    domIdList.forEach(domId => eventListenersMap.delete(domId))

    const target = domIdList.shift()!

    commits.push({
      type: DELETION_EFFECT_TYPE,
      domId: target,
      children: domIdList,
    })
  }
}

let clientParams: any
let workingId = 0

export const registerApp = (element: VNode) => {
  const render = () => {

    update({ children: [element] })
  }

  addEventListener('message', ({ data }) => {
    if (data.type === 'render') {
      clientParams = data.payload
      render()
    } else if (data.type === 'event') {
      eventListenersMap.get(data.domId)?.[data.event]?.(data.payload)

      workingId = data.workingId
    }
  })
}

let nextUnitOfWork: Fiber | null = null
let currentRoot: Fiber | null = null
let wipRoot: Fiber | null = null
let deletions: Fiber[] = []

const scheduler = () => {
  if (!nextUnitOfWork) return

  nextUnitOfWork = performUnitOfWork(nextUnitOfWork)

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  return !!nextUnitOfWork
}

const update = (props: Record<string, any>) => {
  const ROOT_DOM_ID = 0

  wipRoot = {
    type: ROOT_NODE_TYPE,
    domId: ROOT_DOM_ID,
    props,
    alternate: currentRoot,
  }

  nextUnitOfWork = wipRoot
  deletions = []

  requestSchedule(scheduler)
}

const performUnitOfWork = (fiber: Fiber) => {
  const isFunctionComponent =
    fiber.type instanceof Function

  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.alternate) {
    // NOTE: メモリリーク回避
    fiber.alternate.alternate = fiber
  }

  return getNextFiber(fiber)
}

const getNextFiber = (fiber: Fiber, baseFiber?: Fiber) => {
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

let wipHooksFiber: Fiber | null = null
let hookIndex = 0

const updateFunctionComponent = (fiber: Fiber) => {
  wipHooksFiber = fiber
  hookIndex = 0
  wipHooksFiber.hooks = []
  reconcileChildren(fiber, (fiber.type as Component)(fiber.props))
}

let _domId = 0

const updateHostComponent = (fiber: Fiber) => {
  if (fiber.domId == null) {
    fiber.domId = ++_domId
  }

  reconcileChildren(fiber, fiber.props.children)
}

const createPlacementFiber = (element: VNode<Record<string, any>>, parentFiber: Fiber): Fiber => {
  const props = {} as Record<string, any>
  const events = {} as Record<string, any>
  const listeners = {} as Record<string, any>

  for (const key in element.props) {
    if (isEvent(key)) {
      const eventType = key.toLowerCase().substring(2)

      events[eventType] = element.props[key].bridge
      listeners[eventType] = element.props[key].listener
    } else if (key !== 'children') {
      props[key] = element.props[key]
    }
  }

  return {
    type: element.type,
    props: element.props,
    parent: parentFiber,
    alternate: null,
    effectTag: PLACEMENT_EFFECT_TYPE,
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
    effectTag: UPDATE_EFFECT_TYPE,
    effectData: {
      props: hasProps ? props : null,
      listeners: hasListeners ? listeners : null,
    },
  }
}

const toElement = (child: VChild) => {
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

const reconcileChildren = (wipFiber: Fiber, children: VChild | VChild[]) => {
  const elements = (Array.isArray(children) ? children : [children]).map(toElement)

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
      oldFiber.effectTag = DELETION_EFFECT_TYPE

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

export interface BridgeEvent<T> {
  bridge: string
  listener: (arg: T) => void
}

export const createEventBridge = <A, R>(bridge: (arg: A) => R) => {
  const bridgeText = bridge + ''

  return (listener: (data: R) => void): BridgeEvent<R> => {
    return {
      listener,
      bridge: bridgeText,
    }
  }
}

export const useState = <T>(initial: T) => {
  type Action = T | ((state: T) => void)
  const oldHook =
    wipHooksFiber!.alternate &&
    wipHooksFiber!.alternate.hooks &&
    wipHooksFiber!.alternate.hooks[hookIndex]

  const hook = {
    state: oldHook ? oldHook.state as T : initial,
    queue: [] as Action[],
  }

  const actions: Action[] = oldHook ? oldHook.queue : []
  actions.forEach((action: any) => {
    hook.state = typeof action === 'function' ? action(hook.state) : action
  })

  const setState = (action: Action) => {
    hook.queue.push(action)
    update(currentRoot!.props)
  }

  wipHooksFiber!.hooks!.push(hook)
  hookIndex++

  return [hook.state, setState] as [T, (action: Action) => void]
}

export const useClientParams = () => {
  return clientParams
}
