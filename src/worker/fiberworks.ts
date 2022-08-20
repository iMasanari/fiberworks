import { DELETION_EFFECT, EffectTag, PLACEMENT_EFFECT, UPDATE_EFFECT } from '../constants/effects'
import { DELETION_MUTATION, Mutation, PLACEMENT_MUTATION, UPDATE_MUTATION } from '../constants/mutations'
import { ROOT_NODE_TYPE } from '../constants/node-type'
import { Fiber } from './fiber'
import { Component, VChild, VNode } from './jsx'
import { reconcileChildren } from './reconciliation'
import { requestSchedule } from './scheduler'

const eventListenersMap = new Map<number, Record<string, (arg: unknown) => void>>()

const commitRoot = () => {
  const mutations: Mutation[] = []

  deletions.forEach(fiber => commitWork(fiber, mutations))

  let nextFiber = wipRoot!.child
  while (nextFiber) {
    nextFiber = commitWork(nextFiber, mutations)
  }

  postMessage({ workingId, mutations })

  currentRoot = wipRoot
  wipRoot = null
}

const commitWork = (fiber: Fiber, mutations: Mutation[]) => {
  if (fiber.effectTag === PLACEMENT_EFFECT && fiber.domId) {
    let domParentFiber = fiber.parent!
    while (domParentFiber.domId == null) {
      domParentFiber = domParentFiber.parent!
    }

    const { props, events, listeners } = fiber.effectData!

    eventListenersMap.set(fiber.domId, listeners!)

    mutations.push({
      type: PLACEMENT_MUTATION,
      domId: fiber.domId,
      parentId: domParentFiber.domId,
      nodeType: fiber.type as string,
      props: props!,
      events: events!,
    })
  } else if (fiber.effectTag === UPDATE_EFFECT && fiber.domId) {
    const { props, listeners } = fiber.effectData!

    if (listeners) {
      // TODO: update client event hundler
      eventListenersMap.set(fiber.domId, listeners)
    }

    if (props) {
      mutations.push({
        type: UPDATE_MUTATION,
        domId: fiber.domId,
        props,
      })
    }
  } else if (fiber.effectTag === DELETION_EFFECT) {
    commitDeletion(fiber, mutations)
    return
  }

  return getNextFiber(fiber)
}

const commitDeletion = (fiber: Fiber, mutations: Mutation[]) => {
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

    mutations.push({
      type: DELETION_MUTATION,
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

  const child = (fiber.type as Component)(fiber.props)

  reconcileChildren(fiber, [child], deletions)
}

let _domId = 0

const updateHostComponent = (fiber: Fiber) => {
  if (fiber.domId == null) {
    fiber.domId = ++_domId
  }

  const children = fiber.props.children as VChild | VChild[]

  reconcileChildren(fiber, Array.isArray(children) ? children : [children], deletions)
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
