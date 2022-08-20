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
