import { describe, expect, it } from 'vitest'
import { isRoleValue, roleLabel } from './roles'

describe('role helpers', () => {
  it('maps role codes to unified Chinese labels', () => {
    expect(roleLabel('admin')).toBe('管理員')
    expect(roleLabel('editor')).toBe('編輯者')
    expect(roleLabel('viewer')).toBe('檢視者')
  })

  it('falls back to the raw value for unknown roles', () => {
    expect(roleLabel('custom')).toBe('custom')
  })

  it('validates role values', () => {
    expect(isRoleValue('admin')).toBe(true)
    expect(isRoleValue('editor')).toBe(true)
    expect(isRoleValue('viewer')).toBe(true)
    expect(isRoleValue('owner')).toBe(false)
    expect(isRoleValue(null)).toBe(false)
  })
})
