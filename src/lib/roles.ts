export const ROLE_VALUES = ['admin', 'editor', 'viewer'] as const

export type RoleValue = (typeof ROLE_VALUES)[number]

export const ROLE_LABELS: Record<RoleValue, string> = {
  admin: '管理員',
  editor: '編輯者',
  viewer: '檢視者',
}

/** 將角色代碼轉為一致的中文標籤（外層全域角色與站內角色共用）。 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as RoleValue] ?? role
}

export function isRoleValue(value: unknown): value is RoleValue {
  return typeof value === 'string' && (ROLE_VALUES as readonly string[]).includes(value)
}
