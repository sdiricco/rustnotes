import { describe, it, expect } from 'vitest'
import { CLAUDE_ACTIONS, buildInstruction, stripOuterFence } from './claudeActions'

describe('claudeActions', () => {
  it('ogni azione ha id, icona, primario valido e istruzione', () => {
    for (const a of CLAUDE_ACTIONS) {
      expect(a.id).toBeTruthy()
      expect(a.icon).toMatch(/^lucide:/)
      expect(['replace', 'insert']).toContain(a.primary)
      expect(a.instruction.length).toBeGreaterThan(20)
    }
  })

  it('aggiunge il suggerimento sul formato', () => {
    const a = CLAUDE_ACTIONS[0]
    expect(buildInstruction(a, { inline: true })).toMatch(/plain text/)
    expect(buildInstruction(a, { inline: false })).toMatch(/Markdown/)
  })

  it('toglie solo la cornice esterna di codice', () => {
    expect(stripOuterFence('```markdown\n# Titolo\n\n- a\n```\n')).toBe('# Titolo\n\n- a')
    expect(stripOuterFence('  ciao  ')).toBe('ciao')
    const inner = 'testo\n```js\nx\n```\naltro'
    expect(stripOuterFence(inner)).toBe(inner)
  })
})
