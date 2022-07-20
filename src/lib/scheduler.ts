export type SceduleCallback = () => boolean | void

const channel = new MessageChannel()
const taskQueue: SceduleCallback[] = []

let isSceduled = false

const postScedule = () => channel.port2.postMessage(null)

channel.port1.onmessage = () => {
  const start = Date.now()

  let task = taskQueue[0]
  let shouldYield = false

  while (task && !shouldYield) {
    const hasMoreWork = task()

    if (!hasMoreWork) {
      taskQueue.shift()
      task = taskQueue[0]
    }

    shouldYield = Date.now() - start > 50
  }

  if (task) {
    postScedule()
  } else {
    isSceduled = false
  }
}

export const requestSchedule = (callback: SceduleCallback) => {
  taskQueue.push(callback)

  if (!isSceduled) {
    isSceduled = true
    postScedule()
  }
}
