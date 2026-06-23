import { createBrowserRouter } from 'react-router-dom'
import { CardBrowserScreen } from '../features/cardBrowser/CardBrowserScreen'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { DataManagementScreen } from '../features/dataManagement/DataManagementScreen'
import { DeckDetailScreen } from '../features/deckDetail/DeckDetailScreen'
import { LessonDetailScreen } from '../features/lessonDetail/LessonDetailScreen'
import { OcrReviewScreen } from '../features/ocrReview/OcrReviewScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { StudySessionScreen } from '../features/studySession/StudySessionScreen'
import { AppShell } from './AppShell'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardScreen /> },
      { path: '/decks/:deckId', element: <DeckDetailScreen /> },
      {
        path: '/decks/:deckId/lessons/:lessonId',
        element: <LessonDetailScreen />,
      },
      {
        path: '/decks/:deckId/lessons/:lessonId/images/:sourceImageId/ocr',
        element: <OcrReviewScreen />,
      },
      { path: '/decks/:deckId/cards', element: <CardBrowserScreen /> },
      { path: '/study', element: <StudySessionScreen /> },
      { path: '/study/deck/:deckId', element: <StudySessionScreen /> },
      { path: '/data', element: <DataManagementScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
])
