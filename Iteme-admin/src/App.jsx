import { Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import RoleRoute from './components/RoleRoute'
import AdminLayout from './components/AdminLayout'
import AdminHome from './components/AdminHome'
import Applications from './components/Applications'
import Attendance from './components/Attendance'
import Schedule from './components/Schedule'
import Students from './components/Students'
import Finance from './components/Finance'
import Team from './components/Team'
import Programs from './components/Programs'
import Settings from './components/Settings'

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route
          path="applications"
          element={
            <RoleRoute roles={['teacher', 'admin']}>
              <Applications />
            </RoleRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <RoleRoute roles={['teacher', 'admin']}>
              <Attendance />
            </RoleRoute>
          }
        />
        <Route
          path="schedule"
          element={
            <RoleRoute roles={['teacher', 'admin']}>
              <Schedule />
            </RoleRoute>
          }
        />
        <Route path="students" element={<Students />} />
        <Route
          path="finance"
          element={
            <RoleRoute roles={['admin', 'accountant']}>
              <Finance />
            </RoleRoute>
          }
        />
        <Route
          path="team"
          element={
            <RoleRoute roles={['admin']}>
              <Team />
            </RoleRoute>
          }
        />
        <Route
          path="programs"
          element={
            <RoleRoute roles={['admin']}>
              <Programs />
            </RoleRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
