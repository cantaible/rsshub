import { load } from 'cheerio';

import { config } from '@/config';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import parser from '@/utils/rss-parser';

const baseUrl = 'https://jayisgames.com';
const feedUrl = `${baseUrl}/index.xml`;

export const route: Route = {
    path: '/',
    categories: ['new-media'],
    example: '/jayisgames',
    radar: [
        {
            source: ['jayisgames.com/'],
            target: '/jayisgames',
        },
    ],
    name: 'Latest',
    maintainers: ['cantaible'],
    handler,
    url: 'jayisgames.com/',
    description: 'Latest posts from Jay Is Games with full content.',
};

async function handler(ctx) {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const feedXml = await ofetch(feedUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
        responseType: 'text',
    });
    const feed = await parser.parseString(feedXml);

    const list = (feed.items ?? []).slice(0, limit).map((item) => ({
        title: item.title,
        link: item.link,
        guid: item.guid || item.link,
        pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
        description: item.content || item.contentSnippet || item.summary,
        category: item.categories,
    }));

    const items = await Promise.all(
        list.map((item) =>
            item.link
                ? cache.tryGet(item.link, async () => {
                      const detailHtml = await ofetch(item.link, {
                          headers: {
                              'User-Agent': config.trueUA,
                          },
                          responseType: 'text',
                      });
                      const $ = load(detailHtml);
                      const content = $('.entrycontent').first();
                      if (content.length) {
                          return {
                              ...item,
                              description: content.html(),
                          };
                      }

                      return item;
                  })
                : item
        )
    );

    return {
        title: feed.title ?? 'Jay Is Games',
        link: baseUrl,
        item: items,
    };
}
