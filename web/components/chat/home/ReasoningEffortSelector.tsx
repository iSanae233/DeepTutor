'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOutsideClick } from '@/hooks/use-outside-click'
import type { LLMSelection } from '@/features/chat/model/protocol'
import { sameLLMSelection, type LLMOption } from '@/lib/llm-options'
import { reasoningEffortOptionsFromSupportedLevels } from '@/lib/reasoning-effort'
import styles from './ReasoningEffortSelector.module.css'

export default function ReasoningEffortSelector({
  options,
  activeDefault,
  value,
  disabled,
  onChange,
}: {
  options: LLMOption[]
  activeDefault: LLMSelection | null
  value: LLMSelection | null
  disabled: boolean
  onChange: (selection: LLMSelection | null) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const sliderRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  useOutsideClick(rootRef, open, () => setOpen(false))
  const model = options.find(option => sameLLMSelection(option, value ?? activeDefault))
  const levels = model?.supported_reasoning_efforts ?? []
  const configuredEffort =
    model?.reasoning_effort && levels.includes(model.reasoning_effort)
      ? model.reasoning_effort
      : undefined
  const effort =
    value?.reasoning_effort && levels.includes(value.reasoning_effort)
      ? value.reasoning_effort
      : configuredEffort

  useEffect(() => {
    if (open) sliderRef.current?.focus()
  }, [open])

  if (!model || !levels.length) return null
  const choices = reasoningEffortOptionsFromSupportedLevels(levels).filter(option => option.value)
  const label = t(choices.find(option => option.value === effort)?.label ?? 'Auto')
  // An unset value has no known provider effort. This is only the starting
  // position for user input; opening the control never changes the request.
  const index = effort ? levels.indexOf(effort) : Math.max(0, levels.indexOf('medium'))
  const position = dragPosition ?? index
  const progress = levels.length > 1 ? (position / (levels.length - 1)) * 100 : 100
  const select = (level: string) =>
    onChange({
      profile_id: model.profile_id,
      model_id: model.model_id,
      reasoning_effort: level as LLMSelection['reasoning_effort'],
    })

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          buttonRef.current?.focus()
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={t('Reasoning effort')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={t('Applies to the next message in this conversation.')}
        onClick={() => setOpen(current => !current)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]/55 disabled:opacity-40"
      >
        <span>{label}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('Reasoning effort')}
          className={`${styles.panel} absolute bottom-full right-0 z-50 mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2.5 shadow-lg`}
        >
          <div className="relative mb-2 px-5 text-center">
            <p className="text-[13px] font-medium text-[var(--foreground)]" aria-live="polite">
              <span key={effort} className={styles.label}>
                {label}
              </span>
            </p>
            <p className="truncate text-[11px] text-[var(--muted-foreground)]" title={model.model}>
              {model.model}
            </p>
            <button
              type="button"
              aria-label={t('Reset')}
              title={t('Reset')}
              disabled={disabled || !value?.reasoning_effort}
              onClick={() => {
                if (!value) return
                onChange({ profile_id: value.profile_id, model_id: value.model_id })
              }}
              className="absolute right-0 top-0 rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <div
            className={styles.track}
            data-dragging={dragPosition !== null}
            style={
              {
                '--effort-progress': `calc(10px + ${progress}% - ${progress * 0.2}px)`,
              } as CSSProperties
            }
          >
            <span className={styles.thumb} aria-hidden />
            <div className={styles.ticks} aria-hidden>
              {levels.map((level, position) => (
                <span
                  key={level}
                  style={{
                    left: `${levels.length > 1 ? (position / (levels.length - 1)) * 100 : 50}%`,
                  }}
                />
              ))}
            </div>
            <input
              ref={sliderRef}
              className={styles.slider}
              type="range"
              min={0}
              max={levels.length - 1}
              step={dragPosition === null ? 1 : 'any'}
              value={position}
              aria-label={t('Reasoning effort')}
              aria-valuetext={label}
              disabled={disabled || levels.length < 2}
              onPointerDown={() => setDragPosition(index)}
              onPointerUp={event => {
                select(levels[Math.round(Number(event.currentTarget.value))])
                setDragPosition(null)
              }}
              onPointerCancel={() => setDragPosition(null)}
              onLostPointerCapture={() => setDragPosition(null)}
              onBlur={() => setDragPosition(null)}
              onChange={event => {
                const next = Number(event.target.value)
                if (dragPosition !== null) setDragPosition(next)
                const level = levels[Math.round(next)]
                if (level !== effort) select(level)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
