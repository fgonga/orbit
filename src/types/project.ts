export interface Repo {
  id: string
  label: string
  path: string
}

export interface Group {
  id: string
  label: string
  repos: Repo[]
  collapsed?: boolean
  columns?: 1 | 2 | 3
}

export interface Project {
  id: string
  name: string
  version: number
  groups: Group[]
  layout: Record<string, unknown>
}
