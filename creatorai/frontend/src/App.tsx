import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BrandDashboard from "./pages/BrandDashboard";
import Marketplace from "./pages/Marketplace";
import CreatorProfile from "./pages/CreatorProfile";
import BriefCreate from "./pages/BriefCreate";
import MyBriefs from "./pages/MyBriefs";
import MatchResults from "./pages/MatchResults";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatorPortfolio from "./pages/CreatorPortfolio";
import OpenBriefs from "./pages/OpenBriefs";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Compare from "./pages/Compare";
import Shortlist from "./pages/Shortlist";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/discover" element={<Marketplace />} />
          <Route path="/creators/:id" element={<CreatorProfile />} />
          <Route path="/compare" element={<Compare />} />

          {/* Brand */}
          <Route
            path="/brand"
            element={
              <ProtectedRoute role="brand">
                <BrandDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefs"
            element={
              <ProtectedRoute role="brand">
                <MyBriefs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefs/new"
            element={
              <ProtectedRoute role="brand">
                <BriefCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/briefs/:id/matches"
            element={
              <ProtectedRoute role="brand">
                <MatchResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shortlist"
            element={
              <ProtectedRoute role="brand">
                <Shortlist />
              </ProtectedRoute>
            }
          />

          {/* Creator */}
          <Route
            path="/creator"
            element={
              <ProtectedRoute role="creator">
                <CreatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator/portfolio"
            element={
              <ProtectedRoute role="creator">
                <CreatorPortfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/creator/briefs"
            element={
              <ProtectedRoute role="creator">
                <OpenBriefs />
              </ProtectedRoute>
            }
          />

          {/* Shared */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
