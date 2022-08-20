import { Mutation, UPDATE_MUTATION, PLACEMENT_MUTATION, DELETION_MUTATION, PlacementMutation } from '../constants/mutations'
import { TEXT_NODE_TYPE } from '../constants/node-type'

const domMap = new Map<number, Element | Text>()

let workIdCount = 0

const setAttribute = ($target: any, name: string, value: any) => {
  if (name in $target && name !== 'list') {
    $target[name] = value
  } else if (value == null || value === false) {
    $target.removeAttribute(name)
  } else {
    $target.setAttribute(name, value)
  }
}

const createElement = (mutation: PlacementMutation, worker: Worker) => {
  if (mutation.nodeType === TEXT_NODE_TYPE) {
    const $text = document.createTextNode(mutation.props.nodeValue as string)
    domMap.set(mutation.domId, $text)

    return $text
  }

  const $element = document.createElement(mutation.nodeType)

  domMap.set(mutation.domId, $element)

  $element.dataset.domId = mutation.domId + ''

  for (const name in mutation.props) {
    setAttribute($element, name, mutation.props[name])
  }

  for (const key in mutation.events) {
    const fn = new Function('a', `return(${mutation.events[key]})(a)`)

    const listener = (e: Event) => {
      worker.postMessage({
        type: 'event',
        domId: mutation.domId,
        event: key,
        payload: fn(e),
        workingId: ++workIdCount,
      })
    }

    $element.addEventListener(key, listener, false)
  }

  return $element
}

const mutate = (mutation: Mutation, worker: Worker) => {
  if (mutation.type === PLACEMENT_MUTATION) {
    const $sibling = mutation.siblingId != null ? domMap.get(mutation.siblingId)! : null
    const $parent = domMap.get(mutation.parentId)!

    $parent.insertBefore(createElement(mutation, worker), $sibling)
  } else if (mutation.type === UPDATE_MUTATION) {
    const $target = domMap.get(mutation.domId)!

    for (const key in mutation.props) {
      setAttribute($target, key, mutation.props[key])
    }
  } else if (mutation.type === DELETION_MUTATION) {
    const $target = domMap.get(mutation.domId)!

    $target.parentNode!.removeChild($target)
    domMap.delete(mutation.domId)
    mutation.children.forEach(domId => domMap.delete(domId))
  }
}

interface MessageData {
  mutations: Mutation[]
  workingId: number
}

export const createApp = (workerPath: Worker | string, target: Element) => {
  const worker = typeof workerPath === 'string' ? new Worker(workerPath) : workerPath
  let mutationsQueue: Mutation[][] = []

  domMap.set(0, target)

  worker.addEventListener('message', ({ data }: MessageEvent<MessageData>) => {
    mutationsQueue.push(data.mutations)

    if (data.workingId !== workIdCount) {
      return
    }

    mutationsQueue.forEach(mutations =>
      mutations.forEach(mutation =>
        mutate(mutation, worker)
      )
    )

    mutationsQueue = []
  })

  return {
    render: (payload?: any) => {
      worker.postMessage({ type: 'render', payload })
    },
  }
}
