import vm from 'node:vm';

import { config } from '@/config';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://www.kwai.com';
const newsroomUrl = `${baseUrl}/newsroom`;

type NewsroomInfo = {
    type?: string;
    content?: string;
    imgUrl?: string;
};

type NewsroomItem = {
    __id__?: number | string;
    en?: {
        title?: string;
        desc?: string;
        date?: string;
        info?: NewsroomInfo[];
    };
};

type NuxtPayload = {
    data?: Array<{
        newsroomList?: NewsroomItem[];
    }>;
};

export const route: Route = {
    path: '/newsroom',
    categories: ['new-media'],
    example: '/kwai/newsroom',
    radar: [
        {
            source: ['www.kwai.com/newsroom'],
            target: '/newsroom',
        },
    ],
    name: 'Newsroom',
    maintainers: ['cantaible'],
    handler,
    url: 'www.kwai.com/newsroom',
    description: 'Kwai newsroom updates with full content.',
};

const buildDescription = (info: NewsroomInfo[] | undefined) => {
    if (!info?.length) {
        return;
    }

    return info
        .map((block) => {
            if (block.type === 'img' && block.imgUrl) {
                return `<img src="${block.imgUrl}">`;
            }
            if (block.content) {
                return block.content;
            }
            if (block.imgUrl) {
                return `<img src="${block.imgUrl}">`;
            }
            return '';
        })
        .filter(Boolean)
        .join('');
};

const getNuxtPayload = (html: string): NuxtPayload => {
    const marker = 'window.__NUXT__=';
    const start = html.indexOf(marker);
    if (start === -1) {
        throw new Error('Unable to locate Kwai newsroom data');
    }
    const end = html.indexOf('</script>', start);
    if (end === -1) {
        throw new Error('Unable to locate Kwai newsroom data');
    }

    let expr = html.slice(start + marker.length, end);
    if (expr.endsWith(';')) {
        expr = expr.slice(0, -1);
    }

    return vm.runInNewContext(expr, {}) as NuxtPayload;
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const html = await ofetch(newsroomUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });

    const payload = getNuxtPayload(html);
    const list = payload.data?.[0]?.newsroomList ?? [];

    const items = list
        .map((item) => {
            const entry = item.en;
            if (!entry?.title) {
                return null;
            }
            const link = `${newsroomUrl}#${item.__id__ ?? entry.title}`;
            const description = buildDescription(entry.info) ?? entry.desc;
            return {
                title: entry.title,
                link,
                guid: link,
                description,
                pubDate: entry.date ? parseDate(entry.date, 'MMMM Do, YYYY') : undefined,
            };
        })
        .filter(Boolean)
        .slice(0, limit);

    return {
        title: 'Kwai Newsroom',
        link: newsroomUrl,
        item: items,
    };
}
