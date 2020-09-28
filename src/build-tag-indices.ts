import { mkdirSync, readFileSync, writeFileSync } from "fs";

import { getPostAndTagData } from "./post-data";
import { render } from "./render";

export function buildTagIndices() {
  const [, tagData] = getPostAndTagData();

  const tagIndexTemplate = readFileSync("templates/tag-index.html", "utf8");
  const renderedTagIndex = render(tagIndexTemplate, {
    tags: tagData.filter((tag) => tag.postCount > 0),
  });
  writeFileSync(`docs/blog/tags/index.html`, renderedTagIndex);

  const tagPostListTemplate = readFileSync(
    "templates/tag-post-list.html",
    "utf8"
  );

  for (const tag of tagData) {
    try {
      mkdirSync(`docs/blog/tags/${tag.tag}`);
    } catch (e) {
      // Ignore: folder already exists
    }

    const renderedTagPostList = render(tagPostListTemplate, tag);
    writeFileSync(`docs/blog/tags/${tag.tag}/index.html`, renderedTagPostList);
  }
}
