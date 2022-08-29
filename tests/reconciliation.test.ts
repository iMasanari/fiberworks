import { expect, test } from 'vitest'
import { Fiber } from '../src/worker/fiber'
import { reconcileChildren } from '../src/worker/reconciliation'

test('placement child', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [
    { type: 'span', props: {} },
  ])

  expect(fiber).toEqual<Fiber>({
    type: 'div',
    props: {},
    child: expect.anything(),
  })

  expect(fiber.child).toEqual<Fiber>({
    type: 'span',
    props: {},
    alternate: null,
    parent: fiber,
    effectTag: 'PLACEMENT_EFFECT',
    effectData: {
      props: {},
      events: {},
      listeners: {},
    },
  })
})

test('placement children', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [
    { type: 'span', props: {} },
    { type: 'em', props: {} },
  ])

  expect(fiber).toEqual<Fiber>({
    type: 'div',
    props: {},
    child: expect.anything(),
  })

  expect(fiber.child).toEqual<Fiber>({
    type: 'span',
    props: {},
    alternate: null,
    parent: fiber,
    sibling: expect.anything(),
    effectTag: 'PLACEMENT_EFFECT',
    effectData: {
      props: {},
      events: {},
      listeners: {},
    },
  })

  expect(fiber.child!.sibling).toEqual<Fiber>({
    type: 'em',
    props: {},
    alternate: null,
    parent: fiber,
    effectTag: 'PLACEMENT_EFFECT',
    effectData: {
      props: {},
      events: {},
      listeners: {},
    },
  })
})

test('update child', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
    alternate: {
      type: 'div',
      props: {},
    },
  }

  fiber.alternate!.child = {
    type: 'span',
    props: {},
    domId: 1,
    parent: fiber.alternate,
  }

  reconcileChildren(fiber, [
    { type: 'span', props: {} },
  ])

  expect(fiber).toEqual<Fiber>({
    type: 'div',
    props: {},
    child: expect.anything(),
    alternate: expect.anything(),
  })

  expect(fiber.child).toEqual<Fiber>({
    type: 'span',
    props: {},
    domId: 1,
    alternate: expect.anything(),
    parent: fiber,
    effectTag: 'UPDATE_EFFECT',
    effectData: {
      props: null,
      listeners: null,
    },
  })
})

test('delete child', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
    alternate: {
      type: 'div',
      props: {},
    },
  }

  fiber.alternate!.child = {
    type: 'span',
    props: {},
    parent: fiber.alternate,
  }

  reconcileChildren(fiber, [])

  expect(fiber).toEqual<Fiber>({
    type: 'div',
    props: {},
    child: null,
    alternate: expect.anything(),
    deletions: expect.anything(),
  })

  expect(fiber.deletions).toEqual<Fiber[]>([{
    type: 'span',
    props: {},
    parent: fiber.alternate,
  }])
})

test('empty children', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [])

  expect(fiber).toEqual({
    type: 'div',
    props: {},
  })
})
