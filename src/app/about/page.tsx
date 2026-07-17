import { AboutClient } from "@/components/about-client";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  const content = getSiteContent();
  const address = process.env.NEXT_PUBLIC_ADDRESS || "";
  return <AboutClient content={content} address={address} />;
}
