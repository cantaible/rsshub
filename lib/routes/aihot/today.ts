import Parser from '@postlight/parser';

import { config } from '@/config';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'http://aihot.today/';
const jinaUrl = 'https://r.jina.ai/http://aihot.today/';

const headerRegex = /\[!\[Image[^\]]*\]\(([^)]+)\)\s*([^\]]+)\]\(([^)]+)\)([^\n]+)/g;
const itemRegex = /\[(\d+)\.\s*([^\]]+?)\]\((https?:\/\/[^)]+)\)/g;

export const handler = async (ctx): Promise<Data> => {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const text = await ofetch(jinaUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });

    const headers = [...text.matchAll(headerRegex)].map((match) => ({
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
        logo: match[1]?.trim(),
        sourceName: match[2]?.trim(),
        sourceUrl: match[3]?.trim(),
        timeText: match[4]?.trim(),
    }));

    const year = new Date().getFullYear();
    const items = [] as Data['item'];

    for (let i = 0; i < headers.length && items.length < limit; i++) {
        const header = headers[i];
        const end = i + 1 < headers.length ? headers[i + 1].start : text.length;
        const section = text.slice(header.end, end);

        for (const match of section.matchAll(itemRegex)) {
            if (items.length >= limit) {
                break;
            }

            const title = match[2]?.trim();
            const link = match[3]?.trim();
            const dateText = header.timeText ? `${year}年${header.timeText}` : undefined;
            const pubDate = dateText ? parseDate(dateText, 'YYYY年MM月DD日 HH:mm') : undefined;

            const descriptionParts = [];
            if (header.logo) {
                descriptionParts.push(`<img src=\"${header.logo}\">`);
            }
            if (header.sourceName) {
                descriptionParts.push(`来源：${header.sourceName}`);
            }
            if (header.timeText) {
                descriptionParts.push(`更新时间：${header.timeText}`);
            }
            if (header.sourceUrl) {
                descriptionParts.push(`原站：${header.sourceUrl}`);
            }

            items.push({
                title,
                link,
                description: descriptionParts.join('\n'),
                pubDate,
            });
        }
    }

    const itemsWithContent = await Promise.all(
        items.map((item) =>
            item.link
                ? cache.tryGet(item.link, async () => {
                      try {
                          const detailHtml = await ofetch(item.link, {
                              headers: {
                                  'User-Agent': config.trueUA,
                              },
                              responseType: 'text',
                          });
                          const parsed = await Parser.parse(item.link, { html: detailHtml });
                          if (parsed?.content) {
                              return {
                                  ...item,
                                  description: parsed.content,
                              };
                          }
                      } catch {
                          // ignore parse errors and fall back to summary description
                      }

                      return item;
                  })
                : item
        )
    );

    return {
        title: 'AI今日热榜',
        link: baseUrl,
        item: itemsWithContent,
        allowEmpty: true,
    };
};

export const route: Route = {
    path: '/today',
    name: 'AI今日热榜',
    url: 'aihot.today',
    maintainers: ['cantaible'],
    example: '/aihot/today',
    description: 'AI今日热榜聚合的热点资讯列表。',
    categories: ['new-media'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['aihot.today', 'aihot.today/ai-news'],
            target: '/today',
        },
    ],
    view: ViewType.Articles,
    handler,
};
