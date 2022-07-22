import { DELETION_EFFECT_TYPE, EffectTag, PLACEMENT_EFFECT_TYPE, UPDATE_EFFECT_TYPE } from '../constants/effect-type'
import { ROOT_NODE_TYPE, TEXT_NODE_TYPE } from '../constants/node-type'
import { requestSchedule } from './scheduler'

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
  key: string | number | undefined
}

export interface Component<P = object> {
  (props: P): VNode<P>
}

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

interface DomNode {
  type: string
  domId: number
  props: Record<string, any>
  events: Record<string, any>
  listeners: Record<string, any>
}

interface Fiber {
  type: string | Component
  props: Record<string, any>
  effectTag?: EffectTag
  dom?: DomNode
  alternate?: Fiber | null
  parent?: Fiber | null
  child?: Fiber | null
  sibling?: Fiber | null
  hooks?: any[]
}

const createTextElement = (text: string) => {
  return {
    type: TEXT_NODE_TYPE,
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

interface JsxProps {
  children: VNode | string
}

export const jsx = (type: string | Component, props: JsxProps, key: string | number): VNode => {
  const children = props.children != null ? [props.children] : []

  return jsxs(type, { ...props, children }, key)
}

interface JsxsProps {
  children: (VNode | string)[]
}

export const jsxs = (type: string | Component, props: JsxsProps, key: string | number): VNode => {
  const children = props.children.map(child =>
    child == null || typeof child === 'boolean'
      ? createTextElement('')
      : typeof child === 'object' ? child : createTextElement(child)
  ).flat()

  return {
    type,
    props: { ...props, children },
    key,
  }
}

let _domId = 0
let domMap = new Map<number, DomNode>()

const createDom = (fiber: Fiber) => {
  const eventKeys = Object.keys(fiber.props).filter(isEvent)

  const dom: DomNode = {
    type: fiber.type as string,
    domId: ++_domId,
    props: Object.fromEntries(
      Object.keys(fiber.props)
        .filter(isProperty)
        .map(key => [key, fiber.props[key]] as const)
    ),
    events: Object.fromEntries(
      eventKeys.map(key => [key.toLowerCase().substring(2), fiber.props[key].bridge] as const)
    ),
    listeners: Object.fromEntries(
      eventKeys.map(key => [key.toLowerCase().substring(2), fiber.props[key].listener] as const)
    ),
  }

  return dom
}

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
  if (fiber.effectTag === PLACEMENT_EFFECT_TYPE && fiber.dom) {
    let domParentFiber = fiber.parent!
    while (!domParentFiber.dom) {
      domParentFiber = domParentFiber.parent!
    }

    const domParent = domParentFiber.dom

    domMap.set(fiber.dom.domId, fiber.dom)

    const { listeners, ...commitNode } = fiber.dom

    commits.push({
      type: PLACEMENT_EFFECT_TYPE,
      domId: domParent.domId,
      node: commitNode,
    })
  } else if (fiber.effectTag === UPDATE_EFFECT_TYPE && fiber.dom) {
    commitUpdate(
      fiber.dom,
      fiber.alternate!.props,
      fiber.props,
      commits
    )
  } else if (fiber.effectTag === DELETION_EFFECT_TYPE) {
    commitDeletion(fiber, commits)
    return
  }

  return getNextFiber(fiber)
}

const isEvent = (key: string) =>
  key[0] === 'o' && key[1] === 'n'

const isProperty = (key: string) =>
  key !== 'children' && !isEvent(key)

const getDiffProps = <T>(oldProps: T, props: T) => {
  let isChange = false
  const result = {} as T

  for (const key in { ...props, ...oldProps }) {
    if (isProperty(key) && props[key] !== oldProps[key]) {
      result[key] = props[key]
      isChange = true
    }
  }

  return isChange ? result : null
}

const commitUpdate = (dom: DomNode, prevProps: Record<string, any>, nextProps: Record<string, any>, commits: Commit[]) => {
  const diff = getDiffProps(prevProps, nextProps)

  if (diff) {
    // props.forEach(([name, value]) => {
    //   dom.props[name] = value
    // })

    commits.push({
      type: UPDATE_EFFECT_TYPE,
      domId: dom.domId,
      props: diff,
    })
  }

  // TODO: remove event & update client event hundler
  for (const key of Object.keys(nextProps)) {
    if (isEvent(key)) {
      const eventType = key.toLowerCase().substring(2)

      dom.listeners[eventType] = nextProps[key].listener
    }
  }
}

const commitDeletion = (fiber: Fiber, commits: Commit[]) => {
  const domIdList: number[] = []

  let nextFiber: Fiber | null | undefined = fiber
  while (nextFiber) {
    if (nextFiber.dom) {
      domIdList.push(nextFiber.dom.domId)
    }

    nextFiber = getNextFiber(nextFiber, fiber)
  }

  if (domIdList.length) {
    domIdList.forEach(domId => domMap.delete(domId))

    const target = domIdList.shift()!

    commits.push({
      type: DELETION_EFFECT_TYPE,
      domId: target,
      children: domIdList,
    })
  }
}

let clientParams: any
let workingId: number

export const registerApp = (element: VNode) => {
  const render = () => {
    const rootDom: DomNode = {
      type: '#ROOT',
      domId: 0,
      props: {},
      events: {},
      listeners: {},
    }

    update(rootDom, { children: [element] })
  }

  addEventListener('message', ({ data }) => {
    if (data.type === 'render') {
      clientParams = data.payload
      render()
    } else if (data.type === 'event') {
      const workNode = domMap.get(data.domId)

      workNode?.listeners[data.event]?.(data.payload)
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

const update = (dom: DomNode, props: Record<string, any>) => {
  wipRoot = {
    type: ROOT_NODE_TYPE,
    dom,
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

let wipFiber: Fiber | null = null
let hookIndex = 0

const updateFunctionComponent = (fiber: Fiber) => {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  const children = [(fiber.type as Component)(fiber.props)]
  reconcileChildren(fiber, children)
}

const updateHostComponent = (fiber: Fiber) => {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

const reconcileChildren = (wipFiber: Fiber, elements: VNode[]) => {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling: Fiber | null | undefined = null

  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber!.type,
        props: element.props,
        dom: oldFiber!.dom,
        parent: wipFiber,
        alternate: oldFiber!,
        effectTag: UPDATE_EFFECT_TYPE,
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        parent: wipFiber,
        alternate: null,
        effectTag: PLACEMENT_EFFECT_TYPE,
      }
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
    wipFiber!.alternate &&
    wipFiber!.alternate.hooks &&
    wipFiber!.alternate.hooks[hookIndex]

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
    update(currentRoot!.dom!, currentRoot!.props)
  }

  wipFiber!.hooks!.push(hook)
  hookIndex++

  return [hook.state, setState] as [T, (action: Action) => void]
}

export const useClientParams = () => {
  return clientParams
}
