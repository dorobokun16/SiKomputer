import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeProvider } from '@/lib/theme'
import { ToastProvider } from '@/components/ui/overlays'
import { AuthProvider } from '@/lib/auth'
import { DashboardPage } from '@/pages/Dashboard'
import { TasksPage } from '@/pages/Tasks'
import { BacklogPage, RemindersPage } from '@/pages/BacklogReminders'
import { ApiTesterPage, Base64Page } from '@/pages/DevUtilities'
import { ToolboxPage, VaultPage } from '@/pages/ToolsVault'
import { SettingsPage } from '@/pages/Settings'
import { DesignSystemPage, NotFoundPage } from '@/pages/DesignSystem'
import { ImageStudioPage } from '@/pages/ImageStudio'
import { SpreadsheetConverterPage } from '@/pages/SpreadsheetConverter'
import { RpaMonitoringPage } from '@/pages/RpaMonitoring'
import { PdfRepairPage } from '@/pages/PdfRepair'
import { TextStudioPage } from '@/pages/TextStudio'
import { QrStudioPage } from '@/pages/QrStudio'
import { NotesVaultPage } from '@/pages/NotesVault'
import { DateCalculatorPage } from '@/pages/DateCalculator'
import { NotepadWindowPage } from '@/pages/NotepadWindow'

const router = createBrowserRouter([
  { path: '/notepad-window', element: <NotepadWindowPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/dev/base64', element: <Base64Page /> },
      { path: '/dev/text-studio', element: <TextStudioPage /> },
      { path: '/dev/pdf-studio', element: <PdfRepairPage /> },
      { path: '/dev/pdf-repair', element: <PdfRepairPage /> },
      { path: '/dev/qr-studio', element: <QrStudioPage /> },
      { path: '/dev/image-studio', element: <ImageStudioPage /> },
      { path: '/dev/spreadsheet', element: <SpreadsheetConverterPage /> },
      { path: '/dev/api-tester', element: <ApiTesterPage /> },
      { path: '/personal/rpa-monitoring', element: <RpaMonitoringPage /> },
      { path: '/dev/rpa-monitoring', element: <RpaMonitoringPage /> },
      { path: '/productivity/tasks', element: <TasksPage /> },
      { path: '/productivity/backlog', element: <BacklogPage /> },
      { path: '/productivity/reminders', element: <RemindersPage /> },
      { path: '/productivity/notes', element: <NotesVaultPage /> },
      { path: '/productivity/date-calc', element: <DateCalculatorPage /> },
      { path: '/productivity/excel', element: <Navigate to="/" replace /> },
      { path: '/tools/toolbox', element: <ToolboxPage /> },
      { path: '/tools/vault', element: <VaultPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/design-system', element: <DesignSystemPage /> },
      { path: '/login', element: <Navigate to="/" replace /> },
      { path: '/register', element: <Navigate to="/" replace /> },
      { path: '/forgot', element: <Navigate to="/" replace /> },
      { path: '/2fa', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL })

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
