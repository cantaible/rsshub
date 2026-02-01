import { load } from 'cheerio';
import type { Context } from 'hono';

import { config } from '@/config';
import type { Data, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://www.semrush.com';
const listPath = '/news/releases/product-news/';
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

    const list = $('.semrush-story-box')
        .slice(0, limit)
        .toArray()
        .map((element) => {
            const $element = $(element);
            const href = $element.find('a.semrush-story-box__link').attr('href');
            const link = href ? new URL(href, baseUrl).href : undefined;

            const title = $element.find('.semrush-story-box__title').text().trim();
            const lead = $element.find('.semrush-story-box__lead').text().trim();
            const dateText = $element.find('.semrush-story-box__date').text().trim();
            const imageUrl = $element.find('img.semrush-story-box__photo').attr('src');

            const descriptionParts = [];
            if (imageUrl) {
                descriptionParts.push(`<img src="${imageUrl}">`);
            }
            if (lead) {
                descriptionParts.push(lead);
            }

            return {
                title,
                link,
                description: descriptionParts.join('\n'),
                pubDate: dateText ? parseDate(dateText) : undefined,
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
                      const content = $$('.semrush-story__content').first();
                      content.find('.semrush-breadcrumb, h1, .semrush-story__date').remove();
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
        title: 'Semrush Product News',
        link: listUrl,
        item: items,
    };
};

export const route: Route = {
    path: '/news/releases/product-news',
    name: 'Product News',
    url: 'semrush.com',
    maintainers: ['cantaible'],
    example: '/semrush/news/releases/product-news',
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
            source: ['www.semrush.com/news/releases/product-news', 'semrush.com/news/releases/product-news'],
            target: '/news/releases/product-news',
        },
    ],
    view: ViewType.Articles,
    handler,
};
