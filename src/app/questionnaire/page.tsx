import '../globals.css'
import Questionnaire from '../../components/quiz/Questionnaire'

// same soft sky as the home page
const SKY =
  'radial-gradient(ellipse 55% 40% at 10% 15%, rgba(169,199,232,0.55) 0%, rgba(169,199,232,0) 100%), radial-gradient(ellipse 50% 45% at 92% 90%, rgba(243,201,160,0.5) 0%, rgba(243,201,160,0) 100%), linear-gradient(180deg, #D3DEE9 0%, #E5EBF1 45%, #F6EFE6 100%)'

export const metadata = { title: 'Questionnaire · Subtle' }

export default function QuestionnairePage() {
  return (
    <main
      className="min-h-screen font-[family-name:var(--font-body)] text-[#1E2B44]"
      style={{ background: SKY }}
    >
      <Questionnaire />
    </main>
  )
}
