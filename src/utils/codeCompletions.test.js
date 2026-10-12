import { describe, expect, it } from 'vitest'
import { codeCompletionsFor, codeMemberCompletionsFor } from './codeCompletions'

describe('codeCompletionsFor', () => {
  it('offre un insieme ampio e tipizzato per i linguaggi principali', () => {
    const js = codeCompletionsFor('javascript')
    expect(js.length).toBeGreaterThan(50)
    expect(js).toContainEqual({ label: 'Promise', type: 'type' })
    expect(js).toContainEqual({ label: 'map', type: 'method' })
    expect(js).toContainEqual({ label: 'length', type: 'property' })
    expect(codeCompletionsFor('python')).toContainEqual({ label: 'enumerate', type: 'function' })
    expect(codeCompletionsFor('sql')).toContainEqual({ label: 'SELECT', type: 'keyword' })
  })

  it('condivide le completions per i linguaggi C-like e gestisce plain', () => {
    expect(codeCompletionsFor('c')).toBe(codeCompletionsFor('java'))
    expect(codeCompletionsFor('plain')).toEqual([])
  })

  it('espone i membri JavaScript da proporre immediatamente dopo il punto', () => {
    expect(codeMemberCompletionsFor('javascript')).toContainEqual({ label: 'map', type: 'method' })
    expect(codeMemberCompletionsFor('python')).toEqual([])
  })
})
