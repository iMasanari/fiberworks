export const PLACEMENT_MUTATION = 'PLACEMENT_MUTATION'
export const UPDATE_MUTATION = 'UPDATE_MUTATION'
export const DELETION_MUTATION = 'DELETION_MUTATION'

export interface PlacementMutationNode {
  type: string
  domId: number
  props: Record<string, string | number | boolean | null>
  events: Record<string, string>
}

interface PlacementMutation {
  type: typeof PLACEMENT_MUTATION
  domId: number
  node: PlacementMutationNode
}

interface UpdateMutation {
  type: typeof UPDATE_MUTATION
  domId: number
  props: Record<string, any>
}

interface DeletionMutation {
  type: typeof DELETION_MUTATION
  domId: number
  children: number[]
}

export type Mutation =
  | PlacementMutation
  | UpdateMutation
  | DeletionMutation
