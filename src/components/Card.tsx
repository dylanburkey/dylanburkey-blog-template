import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { CollectionEntry } from "astro:content";
import getPostsByTag from "@utils/getPostsByTag";
import getUniqueTags from "@utils/getUniqueTags";
import Tag from "./Tag.astro";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
  index?: number;
}

export default function Card({
  href,
  frontmatter,
  secHeading = true,
  index = 0,
}: Props) {
  const {
    title,
    pubDatetime,
    postImage,
    postImageDesc,
    modDatetime,
    description,
  } = frontmatter;

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-xl font-bold decoration-dashed hover:underline",
  };

  return (
    <li className="my-6">
      <div className="flex gap-4">
        {postImage && (
          <div className="flex-shrink-0 w-48">
            <picture>
              <source srcSet={postImage} type="image/jpeg" />
              <img
                src={postImage}
                alt={postImageDesc || title}
                className="rounded-lg object-cover w-full h-32"
                loading={index <= 2 ? "eager" : "lazy"}
                width="800"
                height="400"
                decoding={index <= 2 ? "sync" : "async"}
              />
            </picture>
          </div>
        )}
        <div className="flex-grow">
          <a
            href={href}
            className="inline-block text-xl font-medium text-skin-accent decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0"
            rel="noopener"
            title={title}
          >
            {secHeading ? (
              <h2 {...headerProps}>{title}</h2>
            ) : (
              <h3 {...headerProps}>{title}</h3>
            )}
          </a>
          <Datetime
            pubDatetime={pubDatetime}
            modDatetime={modDatetime}
            className="pt-3"
          />
          <p className="text-lg mt-3">{description}</p>
        </div>
      </div>
    </li>
  );
}
