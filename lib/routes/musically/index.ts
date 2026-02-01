import { config } from '@/config';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://musically.com';
const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

type EmbeddedTerm = {
    taxonomy?: string;
    name?: string;
};

type EmbeddedAuthor = {
    name?: string;
};

type WpPost = {
    title?: { rendered?: string };
    link?: string;
    guid?: { rendered?: string };
    content?: { rendered?: string };
    date_gmt?: string;
    date?: string;
    _embedded?: {
        author?: EmbeddedAuthor[];
        'wp:term'?: EmbeddedTerm[][];
    };
};

export const route: Route = {
    path: '/',
    categories: ['new-media'],
    example: '/musically',
    radar: [
        {
            source: ['musically.com/'],
            target: '/musically',
        },
    ],
    name: 'Latest',
    maintainers: ['cantaible'],
    handler,
    url: 'musically.com/',
    description: 'Latest news from Musically.',
};

async function handler(ctx) {
    const limit = ctx.req.query('limit') ?? '30';
    const posts = await ofetch<WpPost[]>(apiUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        query: {
            per_page: limit,
            _embed: 1,
        },
    });

    const items = posts.map((post) => {
        const categories = post._embedded?.['wp:term']
            ?.flat()
            .filter((term) => term?.taxonomy === 'category' || term?.taxonomy === 'post_tag')
            .map((term) => term?.name)
            .filter(Boolean);
        const date = post.date_gmt || post.date;

        return {
            title: post.title?.rendered,
            link: post.link,
            guid: post.guid?.rendered || post.link,
            description: post.content?.rendered,
            pubDate: date ? parseDate(date) : undefined,
            category: categories ? [...new Set(categories)] : undefined,
            author: post._embedded?.author?.[0]?.name,
        };
    });

    return {
        title: 'Musically',
        link: baseUrl,
        item: items,
    };
}
