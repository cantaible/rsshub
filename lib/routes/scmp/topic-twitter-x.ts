import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

import { parseItem } from './utils';

const pageUrl = 'https://www.scmp.com/topics/twitter-x';
const fallbackRssUrl = 'https://www.scmp.com/rss/32391/feed';

const getAttribs = (attribs?: { [key: string]: string }) => {
    if (!attribs) {
        return;
    }

    const obj: { [key: string]: string } = {};
    for (const key in attribs) {
        if (Object.hasOwn(attribs, key)) {
            obj[key] = attribs[key];
        }
    }

    return obj;
};

export const route: Route = {
    path: '/topic/twitter-x',
    categories: ['traditional-media'],
    example: '/scmp/topic/twitter-x',
    radar: [
        {
            source: ['scmp.com/topics/twitter-x'],
            target: '/topic/twitter-x',
        },
    ],
    name: 'Twitter X',
    maintainers: ['TonyRL'],
    handler,
    url: 'scmp.com/topics/twitter-x',
    description: 'SCMP topic page for X (formerly Twitter), with full text.',
};

async function handler(ctx) {
    const { data: pageResponse } = await got(pageUrl);
    const $ = load(pageResponse);

    const rssUrl = $('link[rel="alternate"][type="application/rss+xml"]').attr('href') || fallbackRssUrl;
    const { data: rssResponse } = await got(rssUrl);
    const xml = load(rssResponse, {
        xmlMode: true,
    });

    const list = xml('item')
        .toArray()
        .map((elem) => {
            const item = xml(elem);
            const enclosure = item.find('enclosure').first();
            const mediaContent = item.find(String.raw`media\:content`).toArray()[0];
            const thumbnail = item.find(String.raw`media\:thumbnail`).toArray()[0];

            return {
                title: item.find('title').text(),
                description: item.find('description').text(),
                link: item.find('link').text().split('?utm_source')[0],
                author: item.find('author').text(),
                pubDate: parseDate(item.find('pubDate').text()),
                enclosure_url: enclosure?.attr('url'),
                enclosure_length: enclosure?.attr('length'),
                enclosure_type: enclosure?.attr('type'),
                media: {
                    content: mediaContent ? getAttribs(mediaContent.attribs) : {},
                    thumbnail: thumbnail?.attribs ? getAttribs(thumbnail.attribs) : undefined,
                },
            };
        });

    const items = await Promise.all(list.map((item) => cache.tryGet(item.link, () => parseItem(item))));

    return {
        title: xml('channel > title').text() || $('meta[property="og:title"]').attr('content') || 'X (formerly Twitter) - South China Morning Post',
        link: pageUrl,
        description: xml('channel > description').text() || $('meta[name="description"]').attr('content'),
        item: items,
        language: 'en-hk',
        icon: 'https://assets.i-scmp.com/static/img/icons/scmp-icon-256x256.png',
        logo: 'https://customerservice.scmp.com/img/logo_scmp@2x.png',
        image: xml('channel > image > url').text() || $('meta[property="og:image"]').attr('content'),
    };
}
