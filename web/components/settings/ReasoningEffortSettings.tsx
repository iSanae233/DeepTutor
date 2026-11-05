"use client";

import { useTranslation } from "react-i18next";
import type { CatalogModel } from "@/lib/model-catalog-types";
import {
  reasoningEffortOptions,
  reasoningEffortOptionsFromSupportedLevels,
} from "@/lib/reasoning-effort";

export function ReasoningEffortSettings({
  model,
  provider,
  onChange,
}: {
  model: CatalogModel;
  provider: string;
  onChange: (levels: string[]) => void;
}) {
  const { t } = useTranslation();
  const declared = model.codex_supported_reasoning_levels ?? model.supported_reasoning_efforts;
  const choices = (
    declared
      ? reasoningEffortOptionsFromSupportedLevels(declared)
      : reasoningEffortOptions(provider, model.model, "", model.capabilities?.reasoning)
  ).filter(option => option.value);
  const enabled = model.enabled_reasoning_efforts ?? choices.map(option => option.value);
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium">{t("Enabled reasoning efforts")}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {choices.map(option => (
          <label key={option.value} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={enabled.includes(option.value)}
              onChange={event =>
                onChange(
                  event.target.checked
                    ? [...enabled, option.value]
                    : enabled.filter(level => level !== option.value)
                )
              }
            />
            {t(option.label)}
          </label>
        ))}
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {choices.length
          ? t(
              "Choose the reasoning levels available in Chat. Testing refreshes supported levels without replacing your choices."
            )
          : t(
              "No reasoning levels are known for this model. Test the model to check provider metadata."
            )}
      </p>
      {model.reasoning_efforts_source && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {t(
            model.reasoning_efforts_source === "builtin"
              ? "Reasoning levels from built-in model rules; not individually tested."
              : "Reasoning levels from provider metadata; not individually tested."
          )}
        </p>
      )}
    </fieldset>
  );
}
