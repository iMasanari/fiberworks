export const PLACEMENT_MUTATION = 'PLACEMENT_MUTATION'
export const UPDATE_MUTATION = 'UPDATE_MUTATION'
export const DELETION_MUTATION = 'DELETION_MUTATION'

export interface PlacementMutation {
  type: typeof PLACEMENT_MUTATION
  domId: number
  parentId: number
  nodeType: string
  props: Record<string, unknown>
  events: Record<string, string>
}

export interface UpdateMutation {
  type: typeof UPDATE_MUTATION
  domId: number
  props: Record<string, unknown>
}

export interface DeletionMutation {
  type: typeof DELETION_MUTATION
  domId: number
  children: number[]
}

export type Mutation =
  | PlacementMutation
  | UpdateMutation
  | DeletionMutation
