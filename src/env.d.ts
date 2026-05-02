/// <reference types="vite/client" />

export interface GitStatus {
  current: string | null
  tracking: string | null
  ahead: number
  behind: number
  modified: string[]
  staged: string[]
  not_added: string[]
  deleted: string[]
  conflicted: string[]
  created: string[]
  renamed: string[]
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface GitBranches {
  current: string
  all: string[]
}

export interface WorkspaceProject {
  id: string
  name: string
  groupCount: number
  repoCount: number
  updatedAt: number
}

export interface LocalIssueComment {
  id: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface LocalIssue {
  id: string
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  priority: 'none' | 'low' | 'medium' | 'high'
  labels: string[]
  starred: boolean
  comments: LocalIssueComment[]
  createdAt: number
  updatedAt: number
}

export interface GhRepoInfo {
  id: number
  name: string
  fullName: string
  owner: { login: string; avatar_url: string }
  private: boolean
  updatedAt: string
}

declare global {
  interface Window {
    electron: {
      git: {
        status:    (path: string) => Promise<GitStatus>
        log:       (path: string, limit?: number) => Promise<GitCommit[]>
        stage:     (path: string, files: string[]) => Promise<void>
        stageAll:  (path: string) => Promise<void>
        unstage:   (path: string, files: string[]) => Promise<void>
        commit:    (path: string, message: string) => Promise<void>
        push:      (path: string) => Promise<void>
        pull:      (path: string) => Promise<void>
        branches:  (path: string) => Promise<GitBranches>
        checkout:  (path: string, branch: string) => Promise<void>
        diff:      (path: string, file: string, staged?: boolean) => Promise<string>
        isRepo:    (path: string) => Promise<boolean>
        scanRepos: (path: string, maxDepth?: number) => Promise<{ path: string; name: string }[]>
      }
      project: {
        listWorkspace:     () => Promise<WorkspaceProject[]>
        createInWorkspace: (name: string) => Promise<any>
        loadFromPath:      (id: string) => Promise<any>
        save:              (args: { project: any }) => Promise<string>
        delete:            (id: string) => Promise<void>
        import:            () => Promise<any>
      }
      notes: {
        load:           (projectId: string) => Promise<{ notebooks: any[]; hasPassword: boolean }>
        saveNotebook:   (args: { projectId: string; notebook: any; notebookOrder: string[] }) => Promise<void>
        saveNote:       (args: { projectId: string; notebookId: string; note: any; noteOrder: string[] }) => Promise<void>
        deleteNote:     (args: { projectId: string; notebookId: string; noteId: string }) => Promise<void>
        deleteNotebook: (args: { projectId: string; notebookId: string }) => Promise<void>
        hasPassword:    () => Promise<boolean>
        setPassword:    (password: string) => Promise<void>
        verifyPassword: (password: string) => Promise<boolean>
        removePassword: () => Promise<void>
        encrypt:        (args: { content: string; password: string }) => Promise<string>
        decrypt:        (args: { encrypted: string; password: string }) => Promise<{ content: string | null; error: string | null }>
      }
      localIssue: {
        load:          (slug: string) => Promise<{ groups: any[]; nextNumber: number }>
        addGroup:      (slug: string, label: string) => Promise<any>
        renameGroup:   (slug: string, groupId: string, label: string) => Promise<void>
        toggleGroup:   (slug: string, groupId: string) => Promise<void>
        reorderGroups: (slug: string, order: string[]) => Promise<void>
        deleteGroup:   (slug: string, groupId: string) => Promise<void>
        addLista:      (slug: string, groupId: string, label: string) => Promise<any>
        renameLista:   (slug: string, groupId: string, listaId: string, label: string) => Promise<void>
        deleteLista:   (slug: string, groupId: string, listaId: string) => Promise<void>
        createIssue:   (slug: string, groupId: string, listaId: string, data: { title: string; body?: string; priority?: string; labels?: string[] }) => Promise<LocalIssue>
        updateIssue:   (slug: string, issueId: string, patch: Partial<LocalIssue>) => Promise<LocalIssue | null>
        deleteIssue:   (slug: string, issueId: string) => Promise<void>
        addComment:    (slug: string, issueId: string, body: string) => Promise<LocalIssueComment | null>
        deleteComment: (slug: string, issueId: string, commentId: string) => Promise<void>
        updateComment: (slug: string, issueId: string, commentId: string, body: string) => Promise<void>
      }
      github: {
        getToken:             () => Promise<string>
        setToken:             (token: string) => Promise<void>
        detectRepo:           (repoPath: string) => Promise<{ owner: string; repo: string } | null>
        listIssues:           (repoPath: string, state?: string) => Promise<any[]>
        getIssue:             (repoPath: string, number: number) => Promise<any>
        getComments:          (repoPath: string, number: number) => Promise<any[]>
        addComment:           (repoPath: string, number: number, body: string) => Promise<any>
        updateIssue:          (repoPath: string, number: number, patch: any) => Promise<any>
        updateComment:        (repoPath: string, commentId: number, body: string) => Promise<any>
        listLabels:           (repoPath: string) => Promise<any[]>
        getNotifications:     (participating?: boolean) => Promise<any[]>
        markNotificationRead: (threadId: string) => Promise<void>
        createIssue:          (repoPath: string, payload: any) => Promise<any>
        listAllRepos:         () => Promise<GhRepoInfo[]>
      }
      backup: {
        export:     () => Promise<{ ok: boolean; path?: string }>
        import:     () => Promise<{ ok: boolean; projectCount?: number; error?: string }>
        openFolder: () => Promise<void>
      }
      dialog: {
        openDirectory: () => Promise<string | null>
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      app: {
        versions: Record<string, string>
        platform: string
      }
    }
  }
}
