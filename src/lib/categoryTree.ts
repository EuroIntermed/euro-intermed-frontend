import type { Category } from '@/lib/api'

/**
 * One root category plus its children, assembled client-side from the flat
 * `listCategories()` list (each node carries `parent_id`). Kept in its own module
 * (not the picker component file) so consumers can import the helper without
 * tripping React Fast Refresh's "components-only export" rule.
 */
export interface CategoryTreeNode {
  node: Category
  children: Category[]
}

/**
 * Builds the parent/child tree from the flat category list. Roots have an empty
 * `parent_id`; children are grouped under their resolved root and kept in the
 * backend's order (the API returns sort_order-then-name, so input order is
 * preserved). Orphans (a `parent_id` with no matching root) are promoted to
 * roots so they stay selectable rather than silently disappearing.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const roots: Category[] = []
  const childrenOf = new Map<string, Category[]>()

  for (const c of categories) {
    const isRoot = !c.parent_id || !byId.has(c.parent_id)
    if (isRoot) {
      roots.push(c)
    } else {
      const list = childrenOf.get(c.parent_id) ?? []
      list.push(c)
      childrenOf.set(c.parent_id, list)
    }
  }

  return roots.map((node) => ({
    node,
    children: childrenOf.get(node.id) ?? [],
  }))
}
