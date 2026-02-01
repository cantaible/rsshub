import Parser from '@postlight/parser';

import { config } from '@/config';
import type { Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import parser from '@/utils/rss-parser';

const feedUrl = 'https://tldr.tech/rss';
const jinaFeedUrl = 'https://r.jina.ai/http://tldr.tech/rss';

const fetchFeedXml = async () => {
    const response = await ofetch(feedUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });

    const trimmed = response.trim();
    if (trimmed.startsWith('<')) {
        return response;
    }

    const fallback = await ofetch(jinaFeedUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });
    if (fallback.trim().startsWith('<')) {
        return fallback;
    }

    throw new Error('TLDR RSS is not returning XML');
};

export const route: Route = {
    path: '/tech',
    name: 'Tech',
    url: 'tldr.tech',
    maintainers: ['cantaible'],
    example: '/tldr/tech',
    description: 'TLDR Tech RSS feed with full article content.',
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
            source: ['tldr.tech', 'tldr.tech/rss'],
            target: '/tech',
        },
    ],
    view: ViewType.Articles,
    handler: async (ctx) => {
        const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
        const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

        const feedXml = await fetchFeedXml();
        const feed = await parser.parseString(feedXml);
        const list = (feed.items ?? []).slice(0, limit).map((item) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.content || item.contentSnippet || item.summary,
        }));

        const items = await Promise.all(
            list.map((item) =>
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
                              // ignore parse errors and fall back to feed content
                          }
                          return item;
                      })
                    : item
            )
        );

        return {
            title: feed.title ?? 'TLDR Tech',
            link: feed.link ?? 'https://tldr.tech/',
            item: items,
        };
    },
};
