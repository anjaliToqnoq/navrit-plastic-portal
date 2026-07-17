import { listPublishedArticles, serializeArticles } from "@/lib/articles";
import { ArticlesListClient } from "@/components/articles-list-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Articles",
};

export default function ArticlesPage() {
  const articles = serializeArticles(listPublishedArticles());
  return <ArticlesListClient articles={articles} />;
}
