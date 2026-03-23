#!/usr/bin/env python3

"""
Add one RSS source to the local news harvester.

Usage:
    python3 scripts/add_music_rss_sources.py --name "Source Name" --url "https://example.com/feed" --category MUSIC
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request


# The script will try these backend addresses in order and use the first one
# that responds. This keeps the script one-click runnable for both local
# Spring Boot (`8080`) and Docker Compose (`9090`) setups.
BASE_URL_CANDIDATES = [
    "http://localhost:9090",
    "http://localhost:8080",
]

# Feed settings shared by all sources.
SOURCE_TYPE = "RSS"
ENABLED = "true"
ALLOWED_CATEGORIES = {
    "AI",
    "MUSIC",
    "GAMES",
    "COMPETITORS",
    "UNCATEGORIZED",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Add one RSS source to the local news harvester."
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
        "--category",
        required=True,
        type=normalize_category,
        help="Source category. Must be one of: AI, MUSIC, GAMES, COMPETITORS, UNCATEGORIZED.",
    )
    parser.add_argument(
        "--base-url",
        help="Optional backend base URL. If omitted, the script auto-detects one.",
    )
    return parser.parse_args()


def normalize_category(value: str) -> str:
    category = value.strip().upper()
    if category not in ALLOWED_CATEGORIES:
        allowed_values = ", ".join(sorted(ALLOWED_CATEGORIES))
        raise argparse.ArgumentTypeError(
            f"invalid category: {value!r}. Expected one of: {allowed_values}"
        )
    return category


def validate_url(url: str) -> str:
    normalized_url = url.strip()
    if not normalized_url.startswith(("http://", "https://")):
        raise ValueError("url must start with http:// or https://")
    return normalized_url


def validate_name(name: str) -> str:
    normalized_name = name.strip()
    if not normalized_name:
        raise ValueError("name must not be empty")
    return normalized_name


def detect_base_url(base_url_candidates: list[str]) -> str:
    """Pick the first reachable backend URL from the built-in candidates."""
    for base_url in base_url_candidates:
        request = urllib.request.Request(
            url=f"{base_url}/api/feeditems",
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if 200 <= response.status < 300:
                    return base_url
        except urllib.error.URLError:
            continue
    raise RuntimeError(
        "Could not reach the backend. Checked: "
        + ", ".join(base_url_candidates)
    )


def add_feed(base_url: str, name: str, url: str, category: str) -> int:
    """Send one POST request to create an RSS feed."""
    payload = urllib.parse.urlencode(
        {
            "name": name,
            "url": url,
            "sourceType": SOURCE_TYPE,
            "enabled": ENABLED,
            "category": category,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url=f"{base_url}/feeds/new",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            print(f"[{response.status}] {name}")
            print(pretty_body(body))
            print()
            return 0
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"[HTTP {exc.code}] {name}")
        print(pretty_body(body))
        print()
        return 1
    except urllib.error.URLError as exc:
        print(f"[NETWORK ERROR] {name}: {exc}")
        print()
        return 1


def pretty_body(body: str) -> str:
    """Pretty-print JSON responses and fall back to raw text otherwise."""
    try:
        return json.dumps(json.loads(body), ensure_ascii=False, indent=2)
    except json.JSONDecodeError:
        return body


def main() -> int:
    args = parse_args()

    try:
        name = validate_name(args.name)
        url = validate_url(args.url)
    except ValueError as exc:
        print(f"[INPUT ERROR] {exc}", file=sys.stderr)
        return 2

    base_url_candidates = [args.base_url] if args.base_url else BASE_URL_CANDIDATES
    base_url = detect_base_url(base_url_candidates)
    print(f"Using backend: {base_url}")
    print()

    print(f"Adding RSS source: {name}")
    return add_feed(base_url, name, url, args.category)


if __name__ == "__main__":
    sys.exit(main())
