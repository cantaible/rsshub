import { load } from 'cheerio';
import type { Context } from 'hono';

import { config } from '@/config';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://news.mit.edu';
const listPath = '/topic/artificial-intelligence2';
const listUrl = new URL(listPath, baseUrl).href;

export const handler = async (ctx: Context): Promise<Data> => {
    const requestedLimit = Number.parseInt(ctx.req.query('limit') ?? '30', 10);
    const limit = Number.isNaN(requestedLimit) ? 30 : requestedLimit;

    const html = await ofetch(listUrl, {
        headers: {
            'User-Agent': config.trueUA,
        },
    });

    const $ = load(html);

    const list = $('.term-page--news-article--item')
        .slice(0, limit)
        .toArray()
        .map((element) => {
            const $element = $(element);
            const $titleLink = $element.find('.term-page--news-article--item--title--link').first();
            const href = $titleLink.attr('href') ?? $element.find('a.image--link').first().attr('href');
            const link = href ? new URL(href, baseUrl).href : undefined;

            const title = $titleLink.text().trim();
            const descriptionText = $element.find('.term-page--news-article--item--dek').text().trim();
            const dateTime = $element.find('time').attr('datetime');
            const dateText = $element.find('time').text().trim();

            const imageElement = $element.find('img.ondemand').first();
            const imageSrc = imageElement.attr('data-src') || imageElement.attr('src');
            const imageUrl = imageSrc ? new URL(imageSrc, baseUrl).href : undefined;

            const descriptionParts = [];
            if (imageUrl) {
                descriptionParts.push(`<img src="${imageUrl}">`);
            }
            if (descriptionText) {
                descriptionParts.push(descriptionText);
            }

            return {
                title,
                link,
                description: descriptionParts.join('\n'),
                pubDate: dateTime ? parseDate(dateTime) : dateText ? parseDate(dateText) : undefined,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            item.link
                ? cache.tryGet(item.link, async () => {
                      const detailHtml = await ofetch(item.link, {
                          headers: {
                              'User-Agent': config.trueUA,
                          },
                      });
                      const $$ = load(detailHtml);
                      const content = $$('[itemprop="articleBody"]').first();
                      const description = content.html() || item.description;
                      return {
                          ...item,
                          description,
                      };
                  })
                : item
        )
    );

    return {
        title: 'MIT News - Artificial Intelligence',
        link: listUrl,
        item: items,
    };
};

export const route: Route = {
    path: '/news/topic/artificial-intelligence2',
    name: 'News - Artificial Intelligence',
    url: 'news.mit.edu/topic/artificial-intelligence2',
    maintainers: ['cantaible'],
    example: '/mit/news/topic/artificial-intelligence2',
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
            source: ['news.mit.edu/topic/artificial-intelligence2'],
            target: '/news/topic/artificial-intelligence2',
        },
    ],
    view: ViewType.Articles,
    handler,
};
