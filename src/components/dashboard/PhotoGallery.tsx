import { Skeleton } from '@/components/ui/skeleton'
import { useListingPhotos } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

/**
 * Seller-photo gallery for a PalletClearance listing. Fetches signed, time-limited
 * URLs by listing id and renders a responsive thumbnail grid; each opens the full
 * image in a new tab. Only mount it when the listing actually has photos.
 */
export function PhotoGallery({ listingId }: { listingId: string }) {
  const { t } = useT()
  const { data, isLoading, error } = useListingPhotos(listingId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">{t('detail.photosError')}</p>
    )
  }

  const photos = data ?? []
  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('detail.noPhotos')}</p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
        >
          <img
            src={p.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </a>
      ))}
    </div>
  )
}
