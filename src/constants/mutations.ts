export const PLACEMENT_MUTATION = 'PLACEMENT_MUTATION'
export const REORDER_MUTATION = 'REORDER_MUTATION'
export const UPDATE_MUTATION = 'UPDATE_MUTATION'
export const DELETION_MUTATION = 'DELETION_MUTATION'

export interface PlacementMutation {
  type: typeof PLACEMENT_MUTATION
  domId: number
  parentId: number
  siblingId: number | null | undefined
  nodeType: string
  props: Record<string, unknown>
  events: Record<string, string>
}

export interface UpdateMutation {
  type: typeof UPDATE_MUTATION
  domId: number
  props: Record<string, unknown>
}

export interface ReorderMutation {
  type: typeof REORDER_MUTATION
  domId: number
  parentId: number
  siblingId: number | null | undefined
}

export interface DeletionMutation {
  type: typeof DELETION_MUTATION
  domId: number
  children: number[]
}

export type Mutation =
  | PlacementMutation
  | UpdateMutation
  | ReorderMutation
  | DeletionMutation
