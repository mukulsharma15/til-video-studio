import Link from "next/link";

export default function Home() {
  return <main className="flex min-h-screen items-center justify-center bg-[#0d0b09] px-6 text-white"><div className="max-w-3xl text-center"><p className="text-sm font-black tracking-[0.42em] text-[#ff4b3e]">THE INDIC LEAGUE</p><h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">Video Studio</h1><p className="mx-auto mt-5 max-w-xl text-lg text-white/55">Generate branded 9:16 MP4 reels with your video, logo, headline, category, footer, and website.</p><Link href="/studio" className="mt-8 inline-flex rounded-2xl bg-[#ff4b3e] px-7 py-4 font-black text-white shadow-lg shadow-[#ff4b3e]/20 hover:bg-[#ff6257]">Open Studio</Link></div></main>;
}
