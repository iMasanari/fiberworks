export const PLACEMENT_EFFECT = 'PLACEMENT_EFFECT'
export const UPDATE_EFFECT = 'UPDATE_EFFECT'
export const DELETION_EFFECT = 'DELETION_EFFECT'

export type EffectTag =
  | typeof PLACEMENT_EFFECT
  | typeof UPDATE_EFFECT
  | typeof DELETION_EFFECT
