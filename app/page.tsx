import { FeatureGrid, Footer, Hero } from "@/components/marketing/hero";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
      </main>
      <Footer />
    </div>
  );
}
