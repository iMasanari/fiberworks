import { DELETION_EFFECT_TYPE, PLACEMENT_EFFECT_TYPE, UPDATE_EFFECT_TYPE } from '../constants/effect-type'
import { TEXT_NODE_TYPE } from '../constants/node-type'
import { Commit, CommitNode } from '../worker/fiberworks'

const domMap = new Map<number, Element | Text>()

let workIdCount = 0

const setAttribute = ($target: any, name: string, value: any) => {
  if (name in $target && name !== 'list') {
    $target[name] = value
  }
  else if (value == null || value === false) {
    $target.removeAttribute(name)
  }
  else {
    $target.setAttribute(name, value)
  }
}

const createElement = (node: CommitNode, worker: Worker) => {
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

const commitDom = (commit: Commit, worker: Worker) => {
  const $target = domMap.get(commit.domId)!

  if (commit.type === PLACEMENT_EFFECT_TYPE) {
    $target.appendChild(createElement(commit.node, worker))
  }
  else if (commit.type === UPDATE_EFFECT_TYPE) {
    for (const key in commit.props) {
      setAttribute($target, key, commit.props[key])
    }
  }
  else if (commit.type === DELETION_EFFECT_TYPE) {
    $target.parentNode!.removeChild($target)
    domMap.delete(commit.domId)
    commit.children.forEach(domId => domMap.delete(domId))
  }
}

interface MessageData {
  commits: Commit[]
  workingId: number
}

export const createApp = (workerPath: Worker | string, target: Element) => {
  const worker = typeof workerPath === 'string' ? new Worker(workerPath) : workerPath
  let commitsQueue: Commit[][] = []

  domMap.set(0, target)

  worker.addEventListener('message', ({ data }: MessageEvent<MessageData>) => {
    commitsQueue.push(data.commits)

    if (data.workingId !== workIdCount) {
      return
    }

    commitsQueue.forEach(commits =>
      commits.forEach(commit =>
        commitDom(commit, worker)
      )
    )

    commitsQueue = []
  })

  return {
    render: (payload?: any) => {
      worker.postMessage({ type: 'render', payload })
    },
  }
}
