"""Async URL fetching and content extraction via trafilatura."""

import asyncio
import logging

import httpx
import trafilatura

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 8.0
MAX_CONCURRENT = 5
MAX_CONTENT_LENGTH = 20_000


async def fetch_url(
    client: httpx.AsyncClient,
    url: str,
    semaphore: asyncio.Semaphore,
) -> tuple[str, str | None]:
    """Fetch a single URL, returning (url, html_or_none)."""
    async with semaphore:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            return (url, resp.text)
        except Exception as e:
            logger.warning("Failed to fetch %s: %s", url, e)
            return (url, None)


async def fetch_many(
    client: httpx.AsyncClient,
    urls: list[str],
    max_concurrent: int = MAX_CONCURRENT,
) -> dict[str, str | None]:
    """Fetch multiple URLs concurrently. Returns {url: html_or_none}."""
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [fetch_url(client, url, semaphore) for url in urls]
    results = await asyncio.gather(*tasks)
    return dict(results)


def extract_content(
    html: str,
    url: str,
    max_length: int = MAX_CONTENT_LENGTH,
) -> dict | None:
    """Extract clean markdown content from HTML using trafilatura.

    Returns {"title": str, "content": str} or None on failure.
    """
    try:
        content = trafilatura.extract(
            html,
            url=url,
            output_format="markdown",
            include_links=True,
            include_tables=True,
            include_formatting=True,
        )
        if not content or len(content.strip()) < 50:
            return None

        title = None
        metadata = trafilatura.extract_metadata(html, default_url=url)
        if metadata:
            title = metadata.title

        # Truncate at paragraph boundary if too long
        if len(content) > max_length:
            cut = content[:max_length].rfind("\n\n")
            if cut > max_length // 2:
                content = content[:cut]
            else:
                content = content[:max_length]

        return {"title": title or "", "content": content.strip()}
    except Exception as e:
        logger.warning("Extraction failed for %s: %s", url, e)
        return None


async def extract_content_async(
    html: str,
    url: str,
    max_length: int = MAX_CONTENT_LENGTH,
) -> dict | None:
    """Async wrapper — runs trafilatura in a thread pool."""
    return await asyncio.to_thread(extract_content, html, url, max_length)


async def fetch_and_extract(
    client: httpx.AsyncClient,
    urls: list[str],
    max_concurrent: int = MAX_CONCURRENT,
    max_length: int = MAX_CONTENT_LENGTH,
) -> list[dict]:
    """Fetch URLs and extract content concurrently.

    Returns list of {"url": str, "title": str, "content": str}.
    Failed URLs are silently skipped.
    """
    html_map = await fetch_many(client, urls, max_concurrent)

    # Extract content concurrently via thread pool
    extract_tasks = []
    for url, html in html_map.items():
        if html is not None:
            extract_tasks.append((url, extract_content_async(html, url, max_length)))

    results = []
    for url, task in extract_tasks:
        extracted = await task
        if extracted:
            results.append({
                "url": url,
                "title": extracted["title"],
                "content": extracted["content"],
            })

    return results
