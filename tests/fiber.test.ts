import { describe, expect, test } from 'vitest'
import { Fiber, getHostSibling } from '../src/worker/fiber'

describe('getHostSibling', () => {
  test('host sibling', () => {
    const fiber: Fiber = {
      type: 'div',
      props: {},
      sibling: {
        type: 'span',
        props: {},
        child: { type: 'a', props: {} },
        sibling: { type: 'b', props: {} },
      },
    }

    const sibling = getHostSibling(fiber)

    expect(sibling).toEqual<Fiber>({
      type: 'span',
      props: {},
      child: { type: 'a', props: {} },
      sibling: { type: 'b', props: {} },
    })
  })

  test('component sibling', () => {
    const fiber: Fiber = {
      type: 'div',
      props: {},
      sibling: {
        type: () => null,
        props: {},
        child: {
          type: 'span',
          props: {},
        },
      },
    }

    const sibling = getHostSibling(fiber)

    expect(sibling).toEqual<Fiber>({
      type: 'span',
      props: {},
    })
  })

  test('empty sibling', () => {
    const fiber: Fiber = {
      type: 'div',
      props: {},
    }

    const sibling = getHostSibling(fiber)

    expect(sibling).toEqual(null)
  })

  test('sibling is null component', () => {
    const fiber: Fiber = {
      type: 'div',
      props: {},
      sibling: {
        type: () => null,
        props: {},
      },
    }

    const sibling = getHostSibling(fiber)

    expect(sibling).toEqual(null)
  })

  test('null component sibling', () => {
    const fiber: Fiber = {
      type: 'div',
      props: {},
      sibling: {
        type: () => null,
        props: {},
        sibling: {
          type: 'span',
          props: {},
        },
      },
    }

    const sibling = getHostSibling(fiber)

    expect(sibling).toEqual<Fiber>({
      type: 'span',
      props: {},
    })
  })
})
