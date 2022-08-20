import { beforeEach, expect, test } from 'vitest'
import { Fiber } from '../src/worker/fiber'
import { reconcileChildren } from '../src/worker/reconciliation'

let deletions: Fiber[] = []

beforeEach(() => {
  deletions = []
})

test('placement child', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [
    { type: 'span', props: {} },
  ], deletions)

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

  expect(deletions).toEqual([])
})

test('placement children', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [
    { type: 'span', props: {} },
    { type: 'em', props: {} },
  ], deletions)

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

  expect(deletions).toEqual([])
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
  ], deletions)

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

  expect(deletions).toEqual([])
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

  reconcileChildren(fiber, [], deletions)

  expect(fiber).toEqual<Fiber>({
    type: 'div',
    props: {},
    child: null,
    alternate: expect.anything(),
  })

  expect(deletions).toEqual<Fiber[]>([{
    type: 'span',
    props: {},
    parent: fiber.alternate,
    effectTag: 'DELETION_EFFECT',
  }])
})

test('empty children', () => {
  const fiber: Fiber = {
    type: 'div',
    props: {},
  }

  reconcileChildren(fiber, [], deletions)

  expect(fiber).toEqual({
    type: 'div',
    props: {},
  })

  expect(deletions).toEqual([])
})
