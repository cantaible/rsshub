import type { Route } from '@/types';

import { baseUrl, getLatestItems } from './utils';

const categoryUrl = `${baseUrl}/news-and-events/`;

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

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;
    const items = await getLatestItems({ limit, section: 'news-and-events' });

    return {
        title: 'YouTube Blog - News and Events',
        link: categoryUrl,
        item: items,
    };
}
