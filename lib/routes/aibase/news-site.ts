import { load } from 'cheerio';

import { config } from '@/config';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://news.aibase.com';
const listPath = '/zh/news';
const listUrl = new URL(listPath, baseUrl).href;

const getValue = (data: unknown[], value: unknown) => (typeof value === 'number' ? data[value] : value);

export const handler = async (ctx): Promise<Data> => {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const html = await ofetch(listUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
    });

    const $ = load(html);
    const rawData = $('#__NUXT_DATA__').text();
    if (!rawData) {
        throw new Error('Nuxt payload not found');
    }

    const data = JSON.parse(rawData) as unknown[];
    const listContainer = data.find((item) => item && typeof item === 'object' && 'list' in item && 'totalCount' in item) as { list: number } | undefined;

    if (!listContainer) {
        throw new Error('News list not found');
    }

    const listIndices = data[listContainer.list] as number[];
    const items = listIndices.slice(0, limit).map((index) => {
        const item = data[index] as Record<string, unknown>;
        const title = String(getValue(data, item.title) ?? '').trim();
        const descriptionText = String(getValue(data, item.description) ?? '').trim();
        const imageUrl = getValue(data, item.thumb);
        const oid = getValue(data, item.oid);
        const createTime = getValue(data, item.createTime);
        const author = String(getValue(data, item.author) ?? '').trim();

        const descriptionParts = [];
        if (imageUrl) {
            descriptionParts.push(`<img src="${imageUrl}">`);
        }
        if (descriptionText) {
            descriptionParts.push(descriptionText);
        }

        return {
            title,
            link: oid ? new URL(`/zh/news/${oid}`, baseUrl).href : undefined,
            description: descriptionParts.join('\n'),
            pubDate: createTime ? parseDate(String(createTime)) : undefined,
            author: author || undefined,
        };
    });

    return {
        title: 'AIbase 新闻',
        link: listUrl,
        item: items,
        allowEmpty: true,
    };
};

export const route: Route = {
    path: '/news-site',
    name: '资讯（news.aibase.com）',
    url: 'news.aibase.com',
    maintainers: ['cantaible'],
    example: '/aibase/news-site',
    description: 'AIbase 新闻站点资讯列表。',
    categories: ['new-media'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['news.aibase.com/zh/news'],
            target: '/news-site',
        },
    ],
    view: ViewType.Articles,
    handler,
};
