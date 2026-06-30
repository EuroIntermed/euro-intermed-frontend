import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare, Workflow } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { ListingStatusBadge } from '@/components/dashboard/ListingStatusBadge'
import { ConfidentialBadge } from '@/components/dashboard/ConfidentialBadge'
import { Banner } from '@/components/dashboard/Banner'
import { SectionCard } from '@/components/dashboard/SectionCard'
import { DetailHeader, MetaField } from '@/components/dashboard/DetailHeader'
import { PhotoGallery } from '@/components/dashboard/PhotoGallery'
import { LeadActivity } from '@/components/dashboard/LeadActivity'
import { ConversationPanel } from '@/components/dashboard/ConversationPanel'
import { type RequestRef } from '@/components/dashboard/TranscriptThread'
import { OfferCard } from '@/components/dashboard/OfferCard'
import { FollowUpCard } from '@/components/dashboard/FollowUpCard'
import { AssigneeCard } from '@/components/dashboard/AssigneeCard'
import { PageShell } from '@/components/layout/PageShell'
import {
  useT,
  useEnums,
  formatDateTime,
  formatDate,
  formatRON,
} from '@/lib/i18n'
import type {
  AuthedLeadDetail,
  BuyerProfileView,
  LeadSibling,
  ListingDetailView,
  PublicUser,
} from '@/lib/api'

interface FieldProps {
  label: string
  value?: string | number | null
}

function Field({ label, value }: FieldProps) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5 break-words">
        {String(value)}
      </dd>
    </div>
  )
}

/**
 * PalletClearance SELLER lot card (LeadDetail.listing). Mirrors the sourcing-
 * request card's card/dl styling so all typed requests look consistent. Renders
 * stock type, food/non-food (localized), category, quantity+unit, location,
 * country, expiry (formatted date), target price (formatted RON), the
 * confidential flag, a reused listing status badge, the documents list and a
 * photo-count badge. Optional empty fields are hidden via <Field>.
 */
function ListingCard({ listing }: { listing: ListingDetailView }) {
  const { t, lang } = useT()
  const { foodNonFoodLabel } = useEnums()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('detail.listing')}
          <ListingStatusBadge status={listing.status} />
          {listing.confidential && <ConfidentialBadge />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          <Field label={t('detail.stockType')} value={listing.stock_type} />
          <Field
            label={t('detail.foodNonFood')}
            value={
              listing.food_non_food
                ? foodNonFoodLabel(listing.food_non_food)
                : undefined
            }
          />
          <Field label={t('detail.category')} value={listing.category} />
          <Field
            label={t('pipeline.colQuantity')}
            value={
              listing.quantity != null
                ? `${listing.quantity}${listing.unit ? ` ${listing.unit}` : ''}`
                : undefined
            }
          />
          <Field label={t('pipeline.colLocation')} value={listing.location} />
          <Field label={t('detail.country')} value={listing.country} />
          <Field
            label={t('detail.expiry')}
            value={
              listing.expiry ? formatDate(lang, listing.expiry) : undefined
            }
          />
          <Field
            label={t('detail.targetPrice')}
            value={
              listing.target_price != null
                ? formatRON(lang, listing.target_price, t('common.none'))
                : undefined
            }
          />
        </dl>

        <Separator className="my-4" />

        <div className="flex flex-col gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('detail.photoCount')}
            </dt>
            <dd className="mt-0.5">
              <Badge variant="secondary">
                {t('inventory.photosCount', { n: listing.photo_count })}
              </Badge>
            </dd>
          </div>
          {listing.id && listing.photo_count > 0 && (
            <PhotoGallery listingId={listing.id} />
          )}
          {listing.documents && listing.documents.length > 0 && (
            <div>
              <dt className="mb-1.5 text-xs text-muted-foreground">
                {t('detail.documents')}
              </dt>
              <ul className="flex flex-col gap-1 text-sm font-medium">
                {listing.documents.map((doc, i) => (
                  <li key={`${doc}-${i}`} className="break-words">
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * PalletClearance BUYER standing-demand profile card (LeadDetail.buyer_profile).
 * Mirrors the sourcing-request card styling; renders categories of interest,
 * volume, countries of interest, and the near-expiry / subscribed yes-no flags.
 * Empty optional arrays/strings are hidden gracefully.
 */
function BuyerProfileCard({ profile }: { profile: BuyerProfileView }) {
  const { t } = useT()
  const categories = profile.categories ?? []
  const countries = profile.countries ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('detail.buyerProfile')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          {categories.length > 0 && (
            <div>
              <dt className="mb-1.5 text-xs text-muted-foreground">
                {t('detail.categories')}
              </dt>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Field label={t('detail.volume')} value={profile.volume} />
          {countries.length > 0 && (
            <div>
              <dt className="mb-1.5 text-xs text-muted-foreground">
                {t('detail.countries')}
              </dt>
              <div className="flex flex-wrap gap-1.5">
                {countries.map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Field
            label={t('detail.nearExpiryOk')}
            value={profile.near_expiry_ok ? t('detail.yes') : t('detail.no')}
          />
          <Field
            label={t('detail.subscribed')}
            value={profile.subscribed ? t('detail.yes') : t('detail.no')}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

/**
 * Maps a 0..100 quality score to a shadcn Badge variant by band: high (≥70)
 * gets the default (emphasized) variant, mid (40–69) secondary, low (<40)
 * outline. Color is a redundant cue — the numeric label carries the meaning.
 */
function qualityVariant(score: number): 'default' | 'secondary' | 'outline' {
  if (score >= 70) return 'default'
  if (score >= 40) return 'secondary'
  return 'outline'
}

/**
 * "Other requests from this client" — the conversation's sibling requests
 * (LeadDetail.sibling_requests). Each row shows the #seq handle, best-effort
 * product, vertical/intent, a localized status badge, the "active in chat"
 * marker for the conversation's currently-focused request, and deep-links to
 * that lead's detail page. Returns null (hidden) when there are no siblings.
 */
function SiblingRequests({ siblings }: { siblings: LeadSibling[] }) {
  const { t } = useT()
  const { verticalLabel, intentLabel } = useEnums()

  if (siblings.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('detail.siblingRequests')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('detail.siblingRequestsHint')}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {siblings.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              {s.seq != null && (
                <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                  #{s.seq}
                </span>
              )}
              <span className="min-w-0 flex-1 break-words text-sm font-medium">
                {s.product || t('common.none')}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {s.active && (
                  <Badge title={t('detail.siblingActiveHint')}>
                    {t('detail.siblingActive')}
                  </Badge>
                )}
                <Badge variant="secondary">{verticalLabel(s.vertical)}</Badge>
                <Badge variant="outline">{intentLabel(s.intent)}</Badge>
                <StatusBadge status={s.status} />
              </span>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5"
              >
                <Link to={`/dashboard/${s.id}`}>
                  {t('detail.viewRequest')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface Props {
  lead: AuthedLeadDetail
  users: PublicUser[]
}

export function LeadDetail({ lead, users }: Props) {
  const { t, lang } = useT()
  const { verticalLabel, roleLabel, intentLabel } = useEnums()

  const company = lead.company
  const contact = lead.contact
  const verification = company?.verification
  const sr = lead.sourcing_request
  // Exactly one typed request is populated per lead (by vertical/intent). Pick
  // the PalletClearance views first; otherwise fall back to the Angrosist
  // sourcing-request rendering (also the default for legacy/untyped leads).
  const listing = lead.listing
  const buyerProfile = lead.buyer_profile

  // Multi-product line items (openapi SourcingRequest.items). Empty/absent for a
  // legacy single-product request — we fall back to the scalar fields below.
  const lineItems = sr?.items ?? []
  const hasLineItems = lineItems.length > 0

  const qualityScore = lead.quality_score

  // This request + its siblings, so the transcript can caption per-request
  // dividers when the conversation holds more than one request.
  const requests: RequestRef[] = [
    { id: lead.id, seq: lead.seq, product: lead.product_name },
    ...(lead.sibling_requests ?? []).map((s) => ({
      id: s.id,
      seq: s.seq,
      product: s.product,
    })),
  ]

  const administrators = (() => {
    const a = verification?.administrators
    if (!a) return []
    if (Array.isArray(a)) return a
    return []
  })()

  const title = lead.company_name || t('detail.fallbackTitle')

  return (
    <PageShell
      hideTitle
      breadcrumbs={[
        { label: t('nav.pipeline'), to: '/dashboard/pipeline' },
        { label: title },
      ]}
      title={title}
    >
      <DetailHeader
        className="mb-6"
        icon={Workflow}
        eyebrow={t('detail.eyebrowLead')}
        title={title}
        actions={
          // Small/medium screens have no room for the sticky conversation rail,
          // so the transcript lives behind a Sheet toggle here; the desktop rail
          // hides this control (xl:hidden).
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 xl:hidden">
                <MessageSquare className="size-4" />
                {t('detail.viewTranscript')}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full gap-0 p-4 sm:max-w-md"
            >
              <SheetHeader className="space-y-1 p-0 pb-3">
                <SheetTitle>{t('detail.sectionTranscript')}</SheetTitle>
                <SheetDescription>
                  {t('detail.sectionTranscriptDesc')}
                </SheetDescription>
              </SheetHeader>
              <ConversationPanel
                bare
                className="min-h-0 flex-1"
                messages={lead.transcript ?? []}
                requests={requests}
                needsHuman={lead.needs_human}
              />
            </SheetContent>
          </Sheet>
        }
        badges={
          <>
            {lead.seq != null && (
              <Badge variant="outline" className="tabular-nums">
                {t('detail.seqHandle', { n: lead.seq })}
              </Badge>
            )}
            {lead.vertical && (
              <Badge variant="secondary">{verticalLabel(lead.vertical)}</Badge>
            )}
            {lead.intent && (
              <Badge variant="outline">{intentLabel(lead.intent)}</Badge>
            )}
            <StatusBadge status={lead.status} />
            {qualityScore != null && (
              <Badge variant={qualityVariant(qualityScore)}>
                {t('detail.qualityScoreValue', { n: qualityScore })}
              </Badge>
            )}
          </>
        }
        meta={
          <>
            <MetaField label={t('detail.metaCreated')}>
              {formatDate(lang, lead.created_at)}
            </MetaField>
            <MetaField label={t('detail.metaStatus')}>
              <StatusBadge status={lead.status} />
            </MetaField>
            {lead.vertical && (
              <MetaField label={t('detail.metaVertical')}>
                {verticalLabel(lead.vertical)}
              </MetaField>
            )}
            {lead.delivery_location && (
              <MetaField label={t('detail.metaLocation')}>
                {lead.delivery_location}
              </MetaField>
            )}
            {qualityScore != null && (
              <MetaField label={t('detail.metaQuality')}>
                {t('detail.qualityScoreValue', { n: qualityScore })}
              </MetaField>
            )}
          </>
        }
      />

      {lead.needs_human && (
        <Banner
          className="mb-4"
          tone="danger"
          title={t('detail.handoffTitle')}
          description={t('detail.handoffDesc')}
        />
      )}

      {/* Two-column body: all lead content (request, reference + action cards)
          fills the main left column, while the conversation lives in a sticky,
          independently-scrollable right rail (xl+). Below xl the rail collapses
          and the transcript is reachable via the header Sheet toggle. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* LEFT — main content */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Typed request: PalletClearance listing / buyer profile, else the
              Angrosist sourcing-request (extracted) card. */}
          {listing ? (
          <ListingCard listing={listing} />
        ) : buyerProfile ? (
          <BuyerProfileCard profile={buyerProfile} />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t('detail.extracted')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasLineItems ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <dt className="mb-1.5 text-xs text-muted-foreground">
                      {t('detail.lineItems')}
                    </dt>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('pipeline.colProduct')}</TableHead>
                          <TableHead className="text-right">
                            {t('pipeline.colQuantity')}
                          </TableHead>
                          <TableHead>{t('detail.colSpec')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, i) => (
                          <TableRow key={`${item.product}-${i}`}>
                            <TableCell className="font-medium break-words">
                              {item.product}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {item.quantity != null
                                ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
                                : t('common.none')}
                            </TableCell>
                            <TableCell className="text-muted-foreground break-words">
                              {item.spec || t('common.none')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <dl className="flex flex-col gap-3">
                    <Field
                      label={t('pipeline.colLocation')}
                      value={lead.delivery_location}
                    />
                    {sr?.budget != null && (
                      <Field label={t('detail.budget')} value={sr.budget} />
                    )}
                    {sr?.recurring && (
                      <Field
                        label={t('detail.recurring')}
                        value={t('detail.yes')}
                      />
                    )}
                  </dl>
                </div>
              ) : (
                <dl className="flex flex-col gap-3">
                  <Field
                    label={t('pipeline.colProduct')}
                    value={lead.product_name}
                  />
                  <Field
                    label={t('pipeline.colQuantity')}
                    value={
                      lead.quantity != null
                        ? `${lead.quantity} ${lead.unit}`
                        : undefined
                    }
                  />
                  <Field
                    label={t('pipeline.colLocation')}
                    value={lead.delivery_location}
                  />
                  {sr?.budget != null && (
                    <Field label={t('detail.budget')} value={sr.budget} />
                  )}
                  {sr?.recurring && (
                    <Field
                      label={t('detail.recurring')}
                      value={t('detail.yes')}
                    />
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
          )}

          {/* Actions + reference cards. Two responsive columns so short cards
              (offer/assignee/follow-up, company/contact) pack tightly instead of
              leaving tall voids in a single column. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OfferCard lead={lead} />
            <AssigneeCard lead={lead} users={users} />
            <FollowUpCard lead={lead} />
            <LeadActivity leadId={lead.id} />

            {company && (
            <SectionCard title={t('detail.company')}>
              <dl className="flex flex-col gap-3">
                <Field label={t('detail.company')} value={company.name} />
                <Field
                  label={t('companies.colCui')}
                  value={company.cui || company.reg_no}
                />
                <Field label={t('detail.country')} value={company.country} />
                <Field label={t('detail.caen')} value={company.caen} />
                <Field
                  label={t('detail.vatStatus')}
                  value={company.vat_status || verification?.vat_status}
                />
              </dl>

              {company.roles && company.roles.length > 0 && (
                <div className="mt-3">
                  <dt className="mb-1.5 text-xs text-muted-foreground">
                    {t('detail.roles')}
                  </dt>
                  <div className="flex flex-wrap gap-1.5">
                    {company.roles.map((r) => (
                      <Badge key={r} variant="outline">
                        {roleLabel(r)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              {verification ? (
                <div className="flex flex-col gap-3">
                  <Banner
                    tone="success"
                    title={t('detail.verifiedTitle')}
                    description={
                      verification.checked_at
                        ? t('detail.verifiedDesc', {
                            date: formatDateTime(lang, verification.checked_at),
                          })
                        : undefined
                    }
                  />
                  {administrators.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('detail.administrators')}
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium">
                        {administrators.join(', ')}
                      </dd>
                    </div>
                  )}
                </div>
              ) : (
                <Banner
                  tone="warning"
                  title={t('detail.unverifiedTitle')}
                  description={t('detail.unverifiedDesc')}
                />
              )}
          </SectionCard>
        )}

        {/* Contact */}
        {(contact || lead.phone || lead.email) && (
          <SectionCard title={t('detail.contact')}>
              <dl className="flex flex-col gap-3">
                <Field label={t('detail.contactName')} value={contact?.name} />
                <Field
                  label={t('detail.contactPhone')}
                  value={contact?.phone || lead.phone}
                />
                <Field
                  label={t('detail.contactEmail')}
                  value={contact?.email || lead.email}
                />
              </dl>
          </SectionCard>
          )}
          </div>

          <SiblingRequests siblings={lead.sibling_requests ?? []} />
        </div>

        {/* RIGHT — conversation companion. Sticky within the grid cell and given
            a bounded, independently-scrollable height so it stays visible while
            the left column scrolls. Hidden below xl (the header Sheet covers it). */}
        <aside className="hidden xl:block">
          <ConversationPanel
            className="sticky top-20 h-[calc(100dvh-7rem)]"
            messages={lead.transcript ?? []}
            requests={requests}
            needsHuman={lead.needs_human}
          />
        </aside>
      </div>
    </PageShell>
  )
}
