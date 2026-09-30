import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import Home from './components/Home'
import ProgramsPage from './components/ProgramsPage'
import ProgramDetail from './components/ProgramDetail'
import StudentWork from './components/StudentWork'
import DashboardLayout from './components/DashboardLayout'
import DashboardHome from './components/DashboardHome'
import DashboardPrograms from './components/DashboardPrograms'
import DashboardClasses from './components/DashboardClasses'
import DashboardCertificates from './components/DashboardCertificates'
import DashboardSettings from './components/DashboardSettings'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import AuthSheet from './components/AuthSheet'
import ApplySheet from './components/ApplySheet'
import ProgramDetailSheet from './components/ProgramDetailSheet'
import Footer from './components/Footer'
import PageTransition from './components/PageTransition'

function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isDashboard = location.pathname.startsWith('/dashboard')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-black antialiased">
      <div className="fixed inset-0 -z-10 pointer-events-none bg-grid" />

      {!isDashboard && <Header />}

      <main className={isDashboard ? '' : `${isHome ? 'pt-35' : 'pt-0 md:pt-20'} pb-0`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <PageTransition>
                    <Home />
                  </PageTransition>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/programs"
              element={
                <PublicOnlyRoute>
                  <PageTransition>
                    <ProgramsPage />
                  </PageTransition>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/programs/:id"
              element={
                <PublicOnlyRoute>
                  <PageTransition>
                    <ProgramDetail />
                  </PageTransition>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/student-work"
              element={
                <PublicOnlyRoute>
                  <PageTransition>
                    <StudentWork />
                  </PageTransition>
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="programs" element={<DashboardPrograms />} />
              <Route path="classes" element={<DashboardClasses />} />
              <Route path="certificates" element={<DashboardCertificates />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </main>

      {!isDashboard && <Footer />}

      <AuthSheet />
      <ApplySheet />
      <ProgramDetailSheet />
    </div>
  )
}

export default App
