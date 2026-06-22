import { useParams } from 'react-router-dom'
import { FeaturePlaceholder } from '../../components/FeaturePlaceholder/FeaturePlaceholder'

export function StudySessionScreen() {
  const { deckId } = useParams()

  return (
    <FeaturePlaceholder
      eyebrow="Study"
      title={deckId ? 'Deck study session' : 'Study all due cards'}
      description="The focused four-button study loop will be built after cards, audio, and scheduling are in place."
    >
      <p>No cards are due yet. Your future reviews will stay on this device.</p>
    </FeaturePlaceholder>
  )
}
