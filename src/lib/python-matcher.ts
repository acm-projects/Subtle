import { spawn } from 'child_process'
import path from 'path'
import type { Listing as MatchListing } from '../components/matches/listings'

export type PythonMatchResponse = {
  scored: MatchListing[]
  mlAnalytics: Array<{
    id: string
    title: string
    finalScore: number
    vectorSimilarity: number
    budgetFit: number
    commuteFit: number
  }>
}

/**
 * Executes the Python Vector & Machine Learning Matching Engine (ml/vector_matcher.py)
 * Passes listings and user profile as JSON over stdin and reads the scored results from stdout.
 */
export async function runPythonVectorMatcher(
  listings: MatchListing[],
  userProfile: Record<string, any> | null,
): Promise<PythonMatchResponse | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), 'ml', 'vector_matcher.py')
      const pyProcess = spawn('python', [scriptPath])

      let stdoutData = ''
      let stderrData = ''

      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString()
      })

      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString()
      })

      pyProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData)
            resolve(parsed)
          } catch {
            resolve(null)
          }
        } else {
          console.warn('Python vector matcher exited with code:', code, stderrData)
          resolve(null)
        }
      })

      pyProcess.on('error', (err) => {
        console.warn('Could not launch Python vector matcher:', err.message)
        resolve(null)
      })

      const payload = JSON.stringify({ userProfile, listings })
      pyProcess.stdin.write(payload)
      pyProcess.stdin.end()
    } catch (e) {
      console.warn('Python runner error:', e)
      resolve(null)
    }
  })
}

