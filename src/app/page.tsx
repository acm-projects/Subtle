import './globals.css'
import Backdrop from '../components/Backdrop'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Section2 from '../components/Section2'
import Section4 from '../components/Section4'

// one continuous sky: dusk blue under the hero, easing into warm cream at the bottom
const SKY =
  'linear-gradient(180deg, #B9CADB 0px, #BFCEDE 880px, #D3DEE9 1250px, #E5EBF1 1850px, #EFEDEA 2500px, #F6EFE6 3050px, #FAF2E8 100%)'

export default function LandingPage() {
  return (
    <main
      className={`relative isolate min-h-screen overflow-x-clip font-[family-name:var(--font-body)] text-[#1E2B44]`}
      style={{ background: SKY }}
    >
      <Backdrop />
      <Navbar />
      <Hero />
      <Section2 />
      <Section4 />
    </main>
  )
}
