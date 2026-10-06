import './globals.css'
import Image from 'next/image'
import { Newsreader, DM_Sans, Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Section2 from '../components/Section2'
import Section3 from '../components/Section3'
import Section4 from '../components/Section4'

const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const display = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-display' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' })

export default function LandingPage() {
  return (
    <main
      className={`${serif.variable} ${sans.variable} ${display.variable} ${body.variable} relative isolate min-h-screen bg-[#342923] font-[family-name:var(--font-sans)] text-[#f3e9dc]`}
    >
      <div className="fixed inset-x-4 bottom-0 top-20 -z-10 overflow-hidden">
        <Image src="/images/hero-la.jpg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40" />
      </div>
      <Navbar />
      <Hero />
      <Section2 />
    <Section3 />
    <Section4 />
    </main>
  )
}