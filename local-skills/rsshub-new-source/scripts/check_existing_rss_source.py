#!/usr/bin/env python3

"""
Check whether an RSS source already exists in the local news harvester.

Usage:
    python3 scripts/check_existing_rss_source.py --name "Source Name" --url "https://example.com/feed"
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

from add_music_rss_sources import BASE_URL_CANDIDATES, detect_base_url, validate_name, validate_url

EXISTS_BY_URL_EXIT_CODE = 10
EXISTS_BY_NAME_EXIT_CODE = 11


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check whether an RSS source already exists in the local news harvester."
    )
    parser.add_argument(
        "--name",
        required=True,
        help="Display name for the RSS source.",
    )
    parser.add_argument(
        "--url",
        required=True,
        help="Reachable RSS feed URL.",
    )
    parser.add_argument(
        "--base-url",
        help="Optional backend base URL. If omitted, the script auto-detects one.",
    )
    return parser.parse_args()


def normalize_feed_url(url: str) -> str:
    normalized_url = url.strip()
    if normalized_url.endswith('/'):
        return normalized_url[:-1]
    return normalized_url


def fetch_feed_items(base_url: str) -> list[dict]:
    request = urllib.request.Request(
        url=f"{base_url}/api/feeditems",
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8", errors="replace")

    payload = json.loads(body)
    data = payload.get("data")
    if not isinstance(data, list):
        raise ValueError("feeditems response missing data array")
    return [item for item in data if isinstance(item, dict)]


def find_existing_sources(feed_items: list[dict], name: str, url: str) -> tuple[list[dict], list[dict]]:
    normalized_url = normalize_feed_url(url)
    url_matches = []
    name_matches = []

    for item in feed_items:
        if item.get("sourceType") != "RSS":
            continue

        item_name = item.get("name")
        item_url = item.get("url")
        if not isinstance(item_name, str) or not isinstance(item_url, str):
            continue

        if normalize_feed_url(item_url) == normalized_url:
            url_matches.append(item)
        elif item_name.strip() == name:
            name_matches.append(item)

    return url_matches, name_matches


def print_result(status: str, base_url: str, name: str, url: str, matches: list[dict]) -> None:
    print(
        json.dumps(
            {
                "status": status,
                "baseUrl": base_url,
                "name": name,
                "url": url,
                "matches": matches,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> int:
    args = parse_args()

    try:
        name = validate_name(args.name)
        url = validate_url(args.url)
    except ValueError as exc:
        print(f"[INPUT ERROR] {exc}", file=sys.stderr)
        return 2

    base_url_candidates = [args.base_url] if args.base_url else BASE_URL_CANDIDATES

    try:
        base_url = detect_base_url(base_url_candidates)
        feed_items = fetch_feed_items(base_url)
    except urllib.error.URLError as exc:
        print(f"[NETWORK ERROR] Could not fetch /api/feeditems: {exc}", file=sys.stderr)
        return 3
    except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
        print(f"[CHECK ERROR] {exc}", file=sys.stderr)
        return 3

    url_matches, name_matches = find_existing_sources(feed_items, name, url)

    if url_matches:
        print_result("exists_by_url", base_url, name, url, url_matches)
        return EXISTS_BY_URL_EXIT_CODE

    if name_matches:
        print_result("exists_by_name", base_url, name, url, name_matches)
        return EXISTS_BY_NAME_EXIT_CODE

    print_result("not_found", base_url, name, url, [])
    return 0


if __name__ == "__main__":
    sys.exit(main())
