import { ipcMain } from 'electron'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import simpleGit from 'simple-git'

// Wrapper que distingue erros reais de output informativo do git
function gitExec(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd }, (error, stdout, stderr) => {
      const combined = (stdout + '\n' + stderr).trim()
      if (error) {
        const isRealError = /\b(error:|fatal:|CONFLICT|rejected|Cannot|failed to|Authentication failed|not a git)\b/i.test(combined)
        if (isRealError) {
          reject(new Error(combined))
        } else {
          // Saiu com código não-zero mas sem indicadores reais de erro (output informativo)
          resolve(combined)
        }
      } else {
        resolve(combined)
      }
    })
  })
}

function git(repoPath: string) {
  return simpleGit(repoPath)
}

export function registerGitHandlers() {
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    const s = await git(repoPath).status()
    return {
      current: s.current,
      tracking: s.tracking,
      ahead: s.ahead,
      behind: s.behind,
      modified: s.modified,
      staged: s.staged,
      not_added: s.not_added,
      deleted: s.deleted,
      conflicted: s.conflicted,
      created: s.created,
      renamed: s.renamed.map((r) => r.to),
    }
  })

  ipcMain.handle('git:log', async (_, repoPath: string, limit = 30) => {
    const log = await git(repoPath).log({ maxCount: limit })
    return log.all.map((c) => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      author: c.author_name,
      date: c.date,
    }))
  })

  ipcMain.handle('git:stage', async (_, repoPath: string, files: string[]) => {
    await git(repoPath).add(files)
  })

  ipcMain.handle('git:stageAll', async (_, repoPath: string) => {
    await git(repoPath).add('.')
  })

  ipcMain.handle('git:unstage', async (_, repoPath: string, files: string[]) => {
    await git(repoPath).reset(['HEAD', '--', ...files])
  })

  ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
    await git(repoPath).commit(message)
  })

  ipcMain.handle('git:push', async (_, repoPath: string) => {
    const g = git(repoPath)
    const status = await g.status()
    const branch = status.current
    if (!branch) throw new Error('Nao foi possivel determinar o branch actual')

    // Usar tracking branch se existir, senao empurrar para origin/branch
    const tracking = status.tracking
    if (tracking) {
      const [remote] = tracking.split('/')
      const result = await g.push(remote, branch)
      return result
    } else {
      // Sem upstream configurado — definir origin como destino
      const result = await g.push(['--set-upstream', 'origin', branch])
      return result
    }
  })

  ipcMain.handle('git:pull', async (_, repoPath: string, strategy: 'merge' | 'rebase' | 'ff-only' = 'merge') => {
    const g = git(repoPath)
    const status = await g.status()
    const branch = status.current
    if (!branch) throw new Error('Nao foi possivel determinar o branch actual')

    const remote = status.tracking ? status.tracking.split('/')[0] : 'origin'

    // Chamar o git directamente via child_process — simple-git interfere com os flags
    const configFlag = strategy === 'rebase'  ? 'pull.rebase=true'
                     : strategy === 'ff-only' ? 'pull.ff=only'
                     : 'pull.rebase=false'

    return await gitExec(['-c', configFlag, 'pull', remote, branch], repoPath)
  })

  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    const b = await git(repoPath).branchLocal()
    return { current: b.current, all: b.all }
  })

  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string) => {
    await git(repoPath).checkout(branch)
  })

  ipcMain.handle('git:diff', async (_, repoPath: string, file: string, staged = false) => {
    if (staged) {
      return await git(repoPath).diff(['--staged', '--', file])
    }
    const diff = await git(repoPath).diff(['--', file])
    if (diff) return diff
    // Empty diff = ficheiro novo não-rastreado → mostrar conteúdo completo como adições
    return gitExec(['diff', '--no-index', '--', '/dev/null', file], repoPath)
  })

  ipcMain.handle('git:showCommit', async (_, repoPath: string, hash: string) => {
    const result = await git(repoPath).show([hash, '--stat', '--format=fuller'])
    return result
  })

  ipcMain.handle('git:commitDiff', async (_, repoPath: string, hash: string) => {
    return await git(repoPath).show([hash, '--patch', '--format='])
  })

  ipcMain.handle('git:commitFiles', async (_, repoPath: string, hash: string) => {
    const result = await git(repoPath).show([hash, '--name-status', '--format='])
    return result.trim().split('\n').filter(Boolean).map((line) => {
      const [status, ...rest] = line.split('\t')
      return { status: status.trim(), file: rest.join('\t').trim() }
    })
  })

  ipcMain.handle('git:isRepo', async (_, dirPath: string) => {
    try {
      await git(dirPath).status()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('git:scanRepos', async (_, rootPath: string, maxDepth = 6) => {
    const results: { path: string; name: string }[] = []
    const SKIP = new Set([
      'node_modules', '.git', 'vendor', 'dist', 'build', 'out',
      '.cache', '__pycache__', 'target', 'venv', '.venv',
    ])

    function walk(dir: string, depth: number) {
      if (depth > maxDepth) return
      let entries: string[]
      try {
        entries = readdirSync(dir)
      } catch {
        return
      }

      if (entries.includes('.git')) {
        results.push({ path: dir, name: dir.split('/').pop() ?? dir })
        return // não descer dentro de um repo
      }

      for (const entry of entries) {
        if (SKIP.has(entry) || entry.startsWith('.')) continue
        const full = join(dir, entry)
        try {
          if (statSync(full).isDirectory()) walk(full, depth + 1)
        } catch { /* sem permissão, ignorar */ }
      }
    }

    walk(rootPath, 0)
    return results
  })
}
