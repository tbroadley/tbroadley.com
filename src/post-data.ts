import { readFileSync } from "fs";
import * as YAML from "yaml";
import { orderBy, uniq, difference } from "lodash";
import * as globby from "globby";
import * as markdown from "remark-parse";
import * as remark2rehype from "remark-rehype";
import * as raw from "rehype-raw";
import * as html from "rehype-stringify";
import * as unified from "unified";

type Post = {
  path: string;
  title: string;
  titleHtml?: string;
  description: string;
  descriptionHtml?: string;
  tags: string[];
  body?: string;
  bodyMd?: string;
  createdAt: string;
  lastModified: string;
  isDraft?: boolean;
};

type PostPageData = Post & {
  tagsString: string;
  blogchains: {
    name: string;
    nameHtml?: string;
    previousPost?: Post;
    nextPost?: Post;
  }[];
};

type Tag = {
  name: string;
  nameHtml?: string;
};

type TagPostListData = Tag & {
  tag: string;
  postsAndDrafts: Post[];
  posts: Post[];
  postCount: number;
  postCountString: string;
};

const htmlFromMd = unified()
  .use(markdown)
  .use(remark2rehype, { allowDangerousHtml: true })
  .use(raw)
  .use(html);

function checkForUndeclaredTags(tags: string[], postData: Post[]) {
  const tagsInPosts = uniq(postData.flatMap((post) => post.tags));
  const tagsWithoutNames = difference(tagsInPosts, tags);

  if (tagsWithoutNames.length > 0) {
    throw new Error(
      `The following tags are used in posts but aren't declared in blog/tags.yml: ${tagsWithoutNames.join(
        ", "
      )}`
    );
  }
}

function getTagPostListData(tag: string, tagData: Tag, postData: Post[]) {
  const postsAndDrafts = orderBy(
    postData.filter(({ tags }) => tags.includes(tag)),
    [({ createdAt }) => createdAt],
    ["desc"]
  );

  const posts = postsAndDrafts.filter(({ isDraft }) => !isDraft);

  return {
    tag,
    name: tagData.name,
    nameHtml: tagData.nameHtml,
    postsAndDrafts,
    posts,
    postCount: posts.length,
    postCountString: `${posts.length} post${posts.length === 1 ? "" : "s"}`,
  };
}

function getTagDataFromPostData(postData: Post[]): TagPostListData[] {
  const dataYaml = readFileSync("blog/tags.yml", "utf8");
  const data = YAML.parse(dataYaml) as { [tag: string]: Tag };
  const tags = Object.keys(data);

  checkForUndeclaredTags(tags, postData);

  const unorderedTags = tags.map((tag) =>
    getTagPostListData(tag, data[tag], postData)
  );
  return orderBy(unorderedTags, ({ tag }) => tag);
}

function getPostPageData(post: string) {
  const path = post.replace(/^blog\/posts\//, "").replace(/\/index\.yml$/, "");
  const dataYaml = readFileSync(post, "utf8");
  const data = YAML.parse(dataYaml) as Post;

  const tags = data.tags ?? [];
  const tagsString = tags
    .map((tag) => `<a href="../tags/${tag}">${tag}</a>`)
    .join(", ");

  const body = data.bodyMd
    ? (htmlFromMd.processSync(data.bodyMd).contents as string)
    : data.body;

  return { ...data, tags, tagsString, path, body };
}

function getBlogchain(tag: TagPostListData, post: Post) {
  const postsToUse = post.isDraft ? tag.postsAndDrafts : tag.posts;
  const postIndex = postsToUse.indexOf(post);

  // Remember that posts are in reverse chronological order
  const previousPost =
    postIndex === postsToUse.length - 1 ? undefined : postsToUse[postIndex + 1];
  const nextPost = postIndex === 0 ? undefined : postsToUse[postIndex - 1];

  return {
    tag: tag.tag,
    name: tag.name,
    nameHtml: tag.nameHtml,
    previousPost,
    nextPost,
  };
}

export function getPostAndTagData(): [PostPageData[], TagPostListData[]] {
  const postsWithoutBlogchains = globby
    .sync("blog/posts/*/*.yml")
    .map(getPostPageData);

  const tags = getTagDataFromPostData(postsWithoutBlogchains);

  const posts = postsWithoutBlogchains.map((post) => {
    const tagsForPost = post.tags.map((tag) =>
      tags.find((it) => it.tag === tag)
    );

    const unorderedBlogchains = tagsForPost.map((tag) =>
      getBlogchain(tag, post)
    );
    const blogchains = orderBy(unorderedBlogchains, ({ tag }) => tag);

    return { ...post, blogchains };
  });

  const orderedPosts = orderBy(posts, [({ createdAt }) => createdAt], ["desc"]);
  return [orderedPosts, tags];
}
