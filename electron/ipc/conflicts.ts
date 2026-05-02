import { ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import simpleGit from 'simple-git'

export function registerConflictHandlers() {
  // Lista ficheiros com conflitos — usa múltiplos métodos para garantir detecção
  ipcMain.handle('conflict:list', async (_, repoPath: string) => {
    const git = simpleGit(repoPath)

    // Método 1: diff --name-only --diff-filter=U (ficheiros com conflito UU, AA, DD, etc.)
    try {
      const out = await git.raw(['diff', '--name-only', '--diff-filter=U'])
      const files = out.trim().split('\n').filter(Boolean)
      if (files.length) return files
    } catch {}

    // Método 2: ls-files --unmerged
    try {
      const out = await git.raw(['ls-files', '--unmerged'])
      const files = [...new Set(
        out.trim().split('\n').filter(Boolean).map((l) => l.split('\t')[1]).filter(Boolean)
      )]
      if (files.length) return files
    } catch {}

    // Método 3: status().conflicted (fallback)
    const status = await git.status()
    return status.conflicted
  })

  // Lê conteúdo bruto do ficheiro (com marcadores <<<<<)
  ipcMain.handle('conflict:readFile', async (_, repoPath: string, file: string) => {
    const { join } = await import('path')
    const fullPath = join(repoPath, file)
    return readFileSync(fullPath, 'utf-8')
  })

  // Escreve conteúdo resolvido e faz git add
  ipcMain.handle('conflict:resolveFile', async (_, repoPath: string, file: string, content: string) => {
    const { join } = await import('path')
    const fullPath = join(repoPath, file)
    writeFileSync(fullPath, content, 'utf-8')
    await simpleGit(repoPath).add(file)
  })

  // Resolução rápida: usa inteiramente a versão "ours" ou "theirs"
  ipcMain.handle('conflict:resolveWith', async (_, repoPath: string, file: string, side: 'ours' | 'theirs') => {
    const git = simpleGit(repoPath)
    const strategy = side === 'ours' ? '--ours' : '--theirs'
    await git.raw(['checkout', strategy, '--', file])
    await git.add(file)
  })

  // Abortar merge em curso
  ipcMain.handle('conflict:abortMerge', async (_, repoPath: string) => {
    await simpleGit(repoPath).merge(['--abort'])
  })
}
