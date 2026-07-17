import { notFound } from "next/navigation";
import { getArticleBySlug, serializeArticles } from "@/lib/articles";
import { ArticleDetailClient } from "@/components/article-detail-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article" };
  return { title: article.title_en };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const [serialized] = serializeArticles([article]);
  return <ArticleDetailClient article={serialized} />;
}
