import { load } from 'cheerio';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://developers.facebook.com';
const blogUrl = `${baseUrl}/blog`;

export const route: Route = {
    path: '/blog',
    categories: ['new-media'],
    example: '/facebookdevelopers/blog',
    radar: [
        {
            source: ['developers.facebook.com/blog/'],
            target: '/blog',
        },
    ],
    name: 'Blog',
    maintainers: ['cantaible'],
    handler,
    url: 'developers.facebook.com/blog/',
    description: 'Latest Facebook Developers blog posts with full content.',
};

const absoluteUrl = (input: string) => new URL(input, baseUrl).href;

const fixSrcset = (value: string) =>
    value
        .split(',')
        .map((part) => {
            const trimmed = part.trim();
            if (!trimmed) {
                return '';
            }
            const [url, descriptor] = trimmed.split(/\s+/, 2);
            const resolved = url.startsWith('http') || url.startsWith('data:') ? url : absoluteUrl(url);
            return descriptor ? `${resolved} ${descriptor}` : resolved;
        })
        .filter(Boolean)
        .join(', ');

const fixRelativeAttributes = ($, root) => {
    root.find('img').each((_, element) => {
        const src = $(element).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            $(element).attr('src', absoluteUrl(src));
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
            $(element).attr('href', absoluteUrl(href));
        }
    });
};

const parseDateFromLink = (link: string) => {
    const match = link.match(/\/blog\/post\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (!match) {
        return;
    }
    return parseDate(`${match[1]}-${match[2]}-${match[3]}`);
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const listHtml = await ofetch(blogUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });
    const $ = load(listHtml);

    const links = new Map();
    $('a[href^="/blog/post/"], a[href^="https://developers.facebook.com/blog/post/"]').each((_, element) => {
        const node = $(element);
        const href = node.attr('href');
        if (!href) {
            return;
        }
        const link = href.startsWith('http') ? href : absoluteUrl(href);
        if (links.has(link)) {
            return;
        }
        const title = node.find('h2').first().text().trim() || node.find('h3').first().text().trim();
        links.set(link, {
            title,
            link,
            pubDate: parseDateFromLink(link),
        });
    });

    const items = [...links.values()].filter((item) => item.link && item.title).slice(0, limit);

    const enriched = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailHtml = await ofetch(item.link, {
                    headers: {
                        'User-Agent': config.trueUA,
                    },
                    responseType: 'text',
                });
                const detail = load(detailHtml);
                let content = detail('div._6u4h').first();
                if (!content.length) {
                    const firstParagraph = detail('p._8zym').first();
                    if (firstParagraph.length) {
                        content = firstParagraph.parent();
                    }
                }
                if (content.length) {
                    fixRelativeAttributes(detail, content);
                    return {
                        ...item,
                        description: content.html(),
                    };
                }

                return item;
            })
        )
    );

    return {
        title: 'Facebook Developers Blog',
        link: blogUrl,
        item: enriched,
    };
}
