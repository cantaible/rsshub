import { load } from 'cheerio';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://blog.youtube';
const categoryPath = '/news-and-events/';
const categoryUrl = `${baseUrl}${categoryPath}`;
const sitemapUrl = `${baseUrl}/en-us/sitemap.xml`;

type SitemapEntry = {
    link: string;
    lastmod?: string;
};

export const route: Route = {
    path: '/news-and-events',
    categories: ['new-media'],
    example: '/youtubeblog/news-and-events',
    radar: [
        {
            source: ['blog.youtube/news-and-events/'],
            target: '/news-and-events',
        },
    ],
    name: 'News and Events',
    maintainers: ['cantaible'],
    handler,
    url: 'blog.youtube/news-and-events/',
    description: 'YouTube Blog News and Events with full content.',
};

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

const fixRelativeAttributes = ($, root) => {
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

const parseSitemap = (xml: string): SitemapEntry[] => {
    const entries: SitemapEntry[] = [];
    const regex = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
    let match = regex.exec(xml);
    while (match) {
        const link = match[1];
        const lastmod = match[2];
        if (link.startsWith(categoryUrl) && link !== categoryUrl) {
            entries.push({ link, lastmod });
        }
        match = regex.exec(xml);
    }
    return entries;
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const sitemapXml = await ofetch(sitemapUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });

    const entries = parseSitemap(sitemapXml)
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

    const items = await Promise.all(
        entries.map((entry) =>
            cache.tryGet(entry.link, async () => {
                const detailHtml = await ofetch(entry.link, {
                    headers: {
                        'User-Agent': config.trueUA,
                    },
                    responseType: 'text',
                });
                const $ = load(detailHtml);
                const title = $('.yt-archive__title').first().text().trim();
                const dateText = $('.yt-archive__date').first().text().trim();
                const pubDate = dateText ? parseDate(dateText, 'MMM.DD.YYYY') : entry.lastmodDate;
                const contentBlocks = $('.yt-archive__content');
                const description = contentBlocks
                    .toArray()
                    .map((block) => {
                        const node = $(block);
                        fixRelativeAttributes($, node);
                        return node.html();
                    })
                    .filter(Boolean)
                    .join('');
                const category = $('.yt-article-rel-tags__item')
                    .toArray()
                    .map((item) => $(item).text().trim())
                    .filter(Boolean);

                return {
                    title: title || entry.link,
                    link: entry.link,
                    guid: entry.link,
                    description: description || undefined,
                    pubDate,
                    category: category.length ? category : undefined,
                };
            })
        )
    );

    return {
        title: 'YouTube Blog - News and Events',
        link: categoryUrl,
        item: items,
    };
}
