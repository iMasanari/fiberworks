import { Mutation, PlacementMutationNode, UPDATE_MUTATION, PLACEMENT_MUTATION, DELETION_MUTATION } from '../constants/mutations'
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

const createElement = (node: PlacementMutationNode, worker: Worker) => {
  if (node.type === TEXT_NODE_TYPE) {
    const $text = document.createTextNode(node.props.nodeValue as string)
    domMap.set(node.domId, $text)

    return $text
  }

  const $element = document.createElement(node.type)

  domMap.set(node.domId, $element)

  $element.dataset.domId = node.domId + ''

  for (const name in node.props) {
    setAttribute($element, name, node.props[name])
  }

  for (const key in node.events) {
    const fn = new Function('a', `return(${node.events[key]})(a)`)

    const listener = (e: Event) => {
      worker.postMessage({
        type: 'event',
        domId: node.domId,
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
  const $target = domMap.get(mutation.domId)!

  if (mutation.type === PLACEMENT_MUTATION) {
    $target.appendChild(createElement(mutation.node, worker))
  } else if (mutation.type === UPDATE_MUTATION) {
    for (const key in mutation.props) {
      setAttribute($target, key, mutation.props[key])
    }
  } else if (mutation.type === DELETION_MUTATION) {
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
