import { load } from 'cheerio';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://telegram.org';
const blogUrl = `${baseUrl}/blog`;

export const route: Route = {
    path: '/blog',
    categories: ['new-media'],
    example: '/telegramorg/blog',
    radar: [
        {
            source: ['telegram.org/blog'],
            target: '/blog',
        },
    ],
    name: 'Blog',
    maintainers: ['cantaible'],
    handler,
    url: 'telegram.org/blog',
    description: 'Latest Telegram blog posts with full content.',
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

    const items = $('.dev_blog_card_link_wrap')
        .toArray()
        .map((element) => {
            const node = $(element);
            const href = node.attr('href');
            const link = href ? absoluteUrl(href) : undefined;
            const title = node.find('.dev_blog_card_title').first().text().trim();
            const dateText = node.find('.dev_blog_card_date').first().text().trim();
            const pubDate = dateText ? parseDate(dateText, 'MMM D, YYYY') : undefined;

            return {
                title,
                link,
                pubDate,
            };
        })
        .filter((item) => item.link && item.title)
        .slice(0, limit);

    const enriched = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailHtml = await ofetch(item.link!, {
                    headers: {
                        'User-Agent': config.trueUA,
                    },
                    responseType: 'text',
                });
                const detail = load(detailHtml);
                const content = detail('#dev_page_content');
                if (content.length) {
                    fixRelativeAttributes(detail, content);
                    const publishedTime = detail('meta[property="article:published_time"]').attr('content');
                    const pubDate = publishedTime ? parseDate(publishedTime) : item.pubDate;
                    return {
                        ...item,
                        pubDate,
                        description: content.html(),
                    };
                }

                return item;
            })
        )
    );

    return {
        title: 'Telegram Blog',
        link: blogUrl,
        item: enriched,
    };
}
