import { writeFileSync, readFileSync, readdirSync } from "fs";
import { take } from "lodash";
import * as RSS from "rss";

import { getPostData } from "./post-data";

const WEBSITE_URL = "https://thomasbroadley.com";
const BLOG_URL = `${WEBSITE_URL}/blog`;

const BLOG_PATH = "docs/blog";

const feed = new RSS({
  title: "Thomas Broadley",
  managingEditor: "Thomas Broadley",
  webMaster: "Thomas Broadley",
  copyright: "2020 Thomas Broadley",
  language: "en",
  description: "Blog posts by Thomas Broadley.",
  feed_url: `${BLOG_URL}/rss.xml`,
  site_url: WEBSITE_URL,
  image_url: `${BLOG_URL}/rss.png`,
});

const posts = take(getPostData(), 20);

for (const { path, title, createdAt, body } of posts) {
  feed.item({
    title,
    description: body,
    url: `${BLOG_URL}/${path}/`,
    guid: path,
    date: new Date(`${createdAt} 00:00-0500`),
  });
}

const xml = feed.xml({ indent: true });
writeFileSync(`${BLOG_PATH}/rss.xml`, xml);
