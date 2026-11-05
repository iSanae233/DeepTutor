'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOutsideClick } from '@/hooks/use-outside-click'
import type { CatalogModel } from '@/lib/model-catalog-types'
import {
  reasoningEffortOptions,
  reasoningEffortOptionsFromSupportedLevels,
} from '@/lib/reasoning-effort'

export function ReasoningEffortSettings({
  model,
  provider,
  onChange,
}: {
  model: CatalogModel
  provider: string
  onChange: (levels: string[]) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  useOutsideClick(rootRef, open, () => setOpen(false))
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus()
  }, [open])
  const declared = model.codex_supported_reasoning_levels ?? model.supported_reasoning_efforts
  const supported = (
    declared
      ? reasoningEffortOptionsFromSupportedLevels(declared)
      : reasoningEffortOptions(provider, model.model, '', model.capabilities?.reasoning)
  )
    .filter(option => option.value)
    .map(option => option.value)
  const enabled = (model.enabled_reasoning_efforts ?? supported).filter(level =>
    supported.includes(level)
  )
  // Keep the whole scale visible, without offering unsupported API values.
  const levels = [
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    ...(supported.includes('adaptive') ? ['adaptive'] : []),
  ]
  const items = reasoningEffortOptionsFromSupportedLevels(levels)
    .filter(option => option.value)
    .map(option => ({ ...option, label: option.value === 'max' ? 'Max' : option.label }))
  const selected = items.filter(option => enabled.includes(option.value))
  const summary =
    selected.length > 1
      ? `${t(selected[0].label)} → ${t(selected[selected.length - 1].label)}`
      : selected.length
        ? t(selected[0].label)
        : t('None')
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">{t('Enabled reasoning efforts')}</legend>
      <div
        ref={rootRef}
        className="relative"
        onKeyDown={event => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            triggerRef.current?.focus()
          }
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={t('Enabled reasoning efforts')}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => {
            setOpen(current => !current)
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px]"
        >
          <span>{summary}</span>
          <ChevronDown size={15} className="text-[var(--muted-foreground)]" />
        </button>
        {open && (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={t('Enabled reasoning efforts')}
            className="absolute left-0 top-full z-50 mt-1 w-full min-w-48 rounded-xl border border-[var(--border)] bg-[var(--popover)] shadow-lg"
          >
            <div className="max-h-80 overflow-y-auto p-1">
              {items.map(option => {
                const available = supported.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className={`relative flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] focus-within:ring-2 focus-within:ring-[var(--ring)] ${available ? 'cursor-pointer hover:bg-[var(--muted)]' : 'cursor-not-allowed opacity-40'}`}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      disabled={!available}
                      checked={enabled.includes(option.value)}
                      onChange={event =>
                        onChange(
                          items
                            .filter(item =>
                              item.value === option.value
                                ? event.target.checked
                                : enabled.includes(item.value)
                            )
                            .map(item => item.value)
                        )
                      }
                    />
                    <Check
                      size={16}
                      aria-hidden
                      className="shrink-0 opacity-0 peer-checked:opacity-100"
                    />
                    <span>{t(option.label)}</span>
                    {!available && <span className="ml-auto text-xs">{t('Not supported')}</span>}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {supported.length
          ? t(
              'Choose the reasoning levels available in Chat. Testing refreshes supported levels without replacing your choices.'
            )
          : t(
              'No reasoning levels are known for this model. Test the model to check provider metadata.'
            )}
      </p>
      {model.reasoning_efforts_source && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {t(
            model.reasoning_efforts_source === 'builtin'
              ? 'Reasoning levels from built-in model rules; not individually tested.'
              : 'Reasoning levels from provider metadata; not individually tested.'
          )}
        </p>
      )}
    </fieldset>
  )
}
