import { EffectTag } from '../constants/effects'
import { Component } from './jsx'

export interface EffectData {
  props?: Record<string, unknown> | null
  events?: Record<string, string> | null
  listeners?: Record<string, (arg: unknown) => void> | null
}

export interface Fiber<P = Record<string, unknown>> {
  type: string | Component<P>
  props: P
  domId?: number
  effectTag?: EffectTag
  effectData?: EffectData
  alternate?: Fiber | null
  parent?: Fiber | null
  child?: Fiber | null
  sibling?: Fiber | null
  hooks?: any[]
}
