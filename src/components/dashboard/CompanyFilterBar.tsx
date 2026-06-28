import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCompanyFacets } from '@/hooks/useDashboard'
import { useT, useEnums } from '@/lib/i18n'

const ALL = '__all__'

export interface CompanyFilterState {
  role: string
  country: string
  q: string
}

interface Props {
  value: CompanyFilterState
  onChange: (patch: Partial<CompanyFilterState>) => void
}

/**
 * Directory filter bar — a debounced free-text search plus role and country
 * pickers. Both pickers are populated from the backend facets endpoint, so they
 * list only roles/countries that actually exist in the data (no dropdown of all
 * 9 possible roles, no blind country-code typing). Each change is lifted to the
 * URL by the page.
 */
export function CompanyFilterBar({ value, onChange }: Props) {
  const { t } = useT()
  const { roleLabel } = useEnums()
  const { data: facets } = useCompanyFacets()
  const roles = facets?.roles ?? []
  const countries = facets?.countries ?? []

  // Local mirror so typing in search is responsive; debounce up to the URL.
  const [search, setSearch] = useState(value.q)

  // Re-sync the input when the URL `q` changes externally (back/forward, reset).
  const [syncedQ, setSyncedQ] = useState(value.q)
  if (syncedQ !== value.q) {
    setSyncedQ(value.q)
    setSearch(value.q)
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== value.q) onChange({ q: search })
    }, 350)
    return () => clearTimeout(handle)
  }, [search, value.q, onChange])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('companies.search')}
          className="pl-8"
          aria-label={t('companies.search')}
        />
      </div>

      {roles.length > 0 && (
        <Select
          value={value.role || ALL}
          onValueChange={(v) => onChange({ role: v === ALL ? '' : v })}
        >
          <SelectTrigger
            className="w-[170px]"
            aria-label={t('companies.filterRole')}
          >
            <SelectValue placeholder={t('companies.filterRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('companies.allRoles')}</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {countries.length > 0 && (
        <Select
          value={value.country || ALL}
          onValueChange={(v) => onChange({ country: v === ALL ? '' : v })}
        >
          <SelectTrigger
            className="w-[150px]"
            aria-label={t('companies.filterCountry')}
          >
            <SelectValue placeholder={t('companies.filterCountry')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('companies.allCountries')}</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
