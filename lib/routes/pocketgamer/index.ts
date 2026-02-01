import { load } from 'cheerio';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://pocketgamer.biz';
const newsUrl = `${baseUrl}/news/`;

export const route: Route = {
    path: '/',
    categories: ['new-media'],
    example: '/pocketgamer',
    radar: [
        {
            source: ['pocketgamer.biz/news/'],
            target: '/pocketgamer',
        },
    ],
    name: 'News',
    maintainers: ['cantaible'],
    handler,
    url: 'pocketgamer.biz/news/',
    description: 'Latest PocketGamer.biz news with full content.',
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const listHtml = await ofetch(newsUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });
    const $ = load(listHtml);

    const items = $('article[data-href]')
        .toArray()
        .map((article) => {
            const element = $(article);
            const href = element.attr('data-href');
            const link = href ? new URL(href, baseUrl).href : undefined;
            const title = element.find('h3 a, h2 a').first().text().trim() || element.find('h3, h2').first().text().trim();
            const timeText = element.find('time[datetime]').attr('datetime');
            const pubDate = timeText ? parseDate(timeText) : undefined;

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
                const content = detail('article div.body').first();
                if (content.length) {
                    content.find('.art-subscribe').remove();
                    return {
                        ...item,
                        description: content.html(),
                        author: detail('article .byline .name').first().text().trim() || undefined,
                        category: detail('article .cats a')
                            .toArray()
                            .map((cat) => detail(cat).text().trim())
                            .filter(Boolean),
                    };
                }

                return item;
            })
        )
    );

    return {
        title: 'PocketGamer.biz News',
        link: newsUrl,
        item: enriched,
    };
}
