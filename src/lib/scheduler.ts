// Implement requestIdleCallback polyfill with MessageChannel
// https://github.com/pladaria/requestidlecallback-polyfill

const channel = /* @__PURE__ */ new MessageChannel()

const queueTask = (callback: () => void) => {
  channel.port1.onmessage = callback
  channel.port2.postMessage(null)
}

export interface ScheduleDeadline {
  timeRemaining: () => number
}

export const scheduler = (callback: (deadline: ScheduleDeadline) => void) => {
  const start = Date.now()

  return queueTask(() => {
    callback({
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  })
}
