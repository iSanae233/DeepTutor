"""Discover reasoning choices without sending a completion for every level."""

from __future__ import annotations

from typing import Any

import aiohttp

from deeptutor.services.keypool import primary_api_key
from deeptutor.services.llm.config import LLMConfig
from deeptutor.services.llm.openai_http_client import disable_ssl_verify_enabled
from deeptutor.services.llm.utils import build_auth_headers
from deeptutor.services.model_selection.reasoning import supported_reasoning_efforts


async def detect_reasoning_efforts(
    config: LLMConfig, metadata: dict[str, Any]
) -> tuple[list[str], str]:
    """Prefer account metadata, then exact model metadata, then built-in rules.

    A successful completion alone does not establish the supported enum: some
    gateways silently ignore unknown parameters. Unknown models stay unknown.
    """
    if isinstance(metadata.get("codex_supported_reasoning_levels"), list):
        return supported_reasoning_efforts(
            config.binding, config.model, metadata=metadata
        ), "account"
    url = f"{str(config.base_url or '').rstrip('/')}/models"
    headers = build_auth_headers(primary_api_key(config.api_key), config.binding)
    headers.update(config.extra_headers or {})
    connector = aiohttp.TCPConnector(ssl=False) if disable_ssl_verify_enabled() else None
    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=12), connector=connector, trust_env=True
        ) as session:
            async with session.get(url, headers=headers, allow_redirects=False) as response:
                if response.status == 200:
                    payload = await response.json()
                    records = payload.get("data", []) if isinstance(payload, dict) else payload
                    if isinstance(records, list):
                        for record in records:
                            if not isinstance(record, dict) or record.get("id") != config.model:
                                continue
                            levels = record.get("supported_reasoning_efforts")
                            if not isinstance(levels, list):
                                levels = record.get("supported_reasoning_levels")
                            if isinstance(levels, list) and all(isinstance(v, str) for v in levels):
                                return supported_reasoning_efforts(
                                    config.binding,
                                    config.model,
                                    metadata={"supported_reasoning_efforts": levels},
                                ), "metadata"
    except (aiohttp.ClientError, TimeoutError, ValueError):
        # Capability discovery is optional; never fail a working connection or
        # expose provider response bodies/credentials in diagnostics.
        pass
    levels = supported_reasoning_efforts(config.binding, config.model)
    return levels, "builtin" if levels else "unknown"
