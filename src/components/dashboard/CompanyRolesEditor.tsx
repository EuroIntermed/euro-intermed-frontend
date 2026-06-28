import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateCompanyRoles } from '@/lib/api'
import { useT, useEnums } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Props {
  companyId: string
  roles: string[]
}

/**
 * Inline editor for a company's roles[]. Staff toggle the canonical roles as
 * chips and Save; the backend validates + audits the change. Used on the company
 * detail page. Reuses the shadcn Badge/Button primitives (no custom CSS).
 */
export function CompanyRolesEditor({ companyId, roles }: Props) {
  const { t } = useT()
  const { companyRoles } = useEnums()
  const queryClient = useQueryClient()

  // Local selection mirror; re-sync (render-time pattern) when the persisted
  // roles change externally (refetch, navigation to another company).
  const [selected, setSelected] = useState<string[]>(roles)
  const [synced, setSynced] = useState(roles.join(','))
  const key = roles.join(',')
  if (synced !== key) {
    setSynced(key)
    setSelected(roles)
  }

  const mutation = useMutation({
    mutationFn: (next: string[]) => updateCompanyRoles(companyId, next),
    onError: () => toast.error(t('companies.rolesError')),
    onSuccess: () => toast.success(t('companies.rolesSaved')),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company-facets'] })
    },
  })

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((r) => r !== value)
        : [...prev, value],
    )
  }

  const sortedSel = [...selected].sort().join(',')
  const dirty = sortedSel !== [...roles].sort().join(',')
  const busy = mutation.isPending

  return (
    <div className="mt-3">
      <dt className="text-xs text-muted-foreground mb-1.5">
        {t('companies.colRoles')}
      </dt>
      <div className="flex flex-wrap gap-1.5">
        {companyRoles.map((r) => {
          const on = selected.includes(r.value)
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => toggle(r.value)}
              disabled={busy}
              aria-pressed={on}
            >
              <Badge
                variant={on ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer select-none gap-1',
                  !on && 'text-muted-foreground',
                )}
              >
                {on && <Check className="h-3 w-3" />}
                {r.label}
              </Badge>
            </button>
          )
        })}
      </div>
      {dirty && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => mutation.mutate(selected)}
          >
            {busy ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelected(roles)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
