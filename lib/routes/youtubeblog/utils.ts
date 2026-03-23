import { load, type Cheerio, type CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

import { config } from '@/config';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const baseUrl = 'https://blog.youtube';
export const feedUrl = `${baseUrl}/feed/`;

type SitemapEntry = {
    link: string;
    lastmod?: string;
};

const sitemapUrl = `${baseUrl}/en-us/sitemap.xml`;
const articleSections = new Set(['news-and-events', 'creator-and-artist-stories', 'culture-and-trends', 'inside-youtube', 'madeonyoutube']);

const fixSrcset = (value: string) =>
    value
        .split(',')
        .map((part) => {
            const trimmed = part.trim();
            if (!trimmed) {
                return '';
            }

            const [url, descriptor] = trimmed.split(/\s+/, 2);
            const resolved = url.startsWith('http') || url.startsWith('data:') ? url : new URL(url, baseUrl).href;

            return descriptor ? `${resolved} ${descriptor}` : resolved;
        })
        .filter(Boolean)
        .join(', ');

const fixRelativeAttributes = ($: CheerioAPI, root: Cheerio<Element>) => {
    root.find('img').each((_, element) => {
        const src = $(element).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            $(element).attr('src', new URL(src, baseUrl).href);
        }

        const srcset = $(element).attr('srcset');
        if (srcset) {
            $(element).attr('srcset', fixSrcset(srcset));
        }
    });

    root.find('source').each((_, element) => {
        const srcset = $(element).attr('srcset');
        if (srcset) {
            $(element).attr('srcset', fixSrcset(srcset));
        }
    });

    root.find('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
            $(element).attr('href', new URL(href, baseUrl).href);
        }
    });
};

const parseSitemap = (xml: string) => {
    const entries: SitemapEntry[] = [];
    const regex = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
    let match = regex.exec(xml);

    while (match) {
        const link = match[1];
        const lastmod = match[2];
        entries.push({ link, lastmod });
        match = regex.exec(xml);
    }

    return entries;
};

const getPathSegments = (link: string) => new URL(link).pathname.split('/').filter(Boolean);

const isArticleLink = (link: string, section?: string) => {
    const [firstSegment, ...restSegments] = getPathSegments(link);

    if (!firstSegment || restSegments.length === 0) {
        return false;
    }

    if (section) {
        return firstSegment === section;
    }

    return articleSections.has(firstSegment);
};

const getSitemapEntries = async () => {
    const sitemapXml = await cache.tryGet('youtubeblog:sitemap', async () =>
        ofetch(sitemapUrl, {
            headers: {
                'User-Agent': config.trueUA,
            },
            responseType: 'text',
        })
    );

    return parseSitemap(sitemapXml);
};

const getArticleDescription = ($: CheerioAPI) => {
    const blocks = $('.yt-archive__content, .yt-article-main-content .rich-text')
        .toArray()
        .map((block) => {
            const node = $(block);
            fixRelativeAttributes($, node);
            return node.html();
        })
        .filter(Boolean);

    return blocks.join('');
};

const getArticleItem = (entry: SitemapEntry) =>
    cache.tryGet(`youtubeblog:article:${entry.link}`, async () => {
        const detailHtml = await ofetch(entry.link, {
            headers: {
                'User-Agent': config.trueUA,
            },
            responseType: 'text',
        });
        const $ = load(detailHtml);
        const description = getArticleDescription($);
        const category = $('.yt-article-rel-tags__item')
            .toArray()
            .map((item) => $(item).text().trim())
            .filter(Boolean);
        const pubDate = $('meta[name="published_time"]').attr('content') ?? entry.lastmod;

        return {
            title: $('meta[property="og:title"]').attr('content') || $('.yt-archive__title, .yt-article-hero-section__page-content__title').first().text(),
            link: entry.link,
            description: description || undefined,
            pubDate: pubDate ? parseDate(pubDate) : undefined,
            author:
                $('meta[name="authors"]').attr('content') ||
                $('.yt-archive__author-item').first().text() ||
                $('.yt-article-hero-section__page-content-author b').first().text() ||
                undefined,
            category: category.length > 0 ? [...new Set(category)] : undefined,
        };
    });

export const getLatestItems = async ({ limit, section }: { limit: number; section?: string }) => {
    const entries = (await getSitemapEntries())
        .filter((entry) => isArticleLink(entry.link, section))
        .map((entry) => ({
            ...entry,
            lastmodDate: entry.lastmod ? parseDate(entry.lastmod) : undefined,
        }))
        .sort((a, b) => {
            const aTime = a.lastmodDate?.getTime() ?? 0;
            const bTime = b.lastmodDate?.getTime() ?? 0;

            return bTime - aTime;
        })
        .slice(0, limit);

    return Promise.all(entries.map((entry) => getArticleItem(entry)));
};
