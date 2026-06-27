import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <Hero />
      <Features />

      <section className="border-t border-gray-800 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-2 text-sm text-gray-500">Built for 11 hackathons</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-600">
            <span>H0: Hack Zero Stack</span>
            <span>CodeStorm</span>
            <span>Hack Begin</span>
            <span>Dev Clash</span>
            <span>Hack Munch</span>
            <span>HackNova</span>
            <span>Hack Verse</span>
            <span>Hack-Vserse</span>
            <span>Byte2Beat</span>
            <span>AWS Activate for Web3</span>
            <span>MDBA Youth Blockchain</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
