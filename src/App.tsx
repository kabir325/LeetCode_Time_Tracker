import { Navigate, Route, Routes } from 'react-router-dom'
import { OverlayPage } from './pages/OverlayPage'
import { PickerPage } from './pages/PickerPage'
import { SettingsPage } from './pages/SettingsPage'
import { SimpleDialPage } from './pages/SimpleDialPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/simple" replace />} />
      <Route path="/simple" element={<SimpleDialPage />} />
      <Route path="/overlay" element={<OverlayPage />} />
      <Route path="/picker" element={<PickerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/simple" replace />} />
    </Routes>
  )
}
