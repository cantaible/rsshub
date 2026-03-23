import type { Route } from '@/types';

import { feedUrl, getLatestItems } from './utils';

export const route: Route = {
    path: '/feed',
    categories: ['new-media'],
    example: '/youtubeblog/feed',
    radar: [
        {
            source: ['blog.youtube/', 'blog.youtube/feed/'],
            target: '/feed',
        },
    ],
    name: 'Latest',
    maintainers: ['cantaible'],
    handler,
    url: 'blog.youtube/feed/',
    description: 'Latest posts from the YouTube Blog with full content.',
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;
    const items = await getLatestItems({ limit });

    return {
        title: 'YouTube Blog - Latest',
        link: feedUrl,
        item: items,
    };
}
