import { Navigate, Route, Routes } from "react-router-dom";
import { Layout, RequireAdmin, RequireAuth } from "./components/Layout";
import { AuthForm } from "./components/AuthForm";
import { LibraryPage } from "./pages/LibraryPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AccountPage } from "./pages/AccountPage";
import { SongDetailPage } from "./pages/SongDetailPage";
import { UploadPage } from "./pages/UploadPage";
import { MinePage } from "./pages/MinePage";
import { AdminPage } from "./pages/AdminPage";
import { isSupabaseConfigured } from "./lib/supabase";

function SetupBanner() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      尚未配置 Supabase。请复制 <code>.env.example</code> 为 <code>.env</code>，填入项目 URL 与 anon key，并在 SQL Editor 执行{" "}
      <code>supabase/schema.sql</code>。
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <SetupBanner />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/register" element={<AuthForm mode="register" />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/upload"
          element={
            <RequireAuth>
              <UploadPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mine"
          element={
            <RequireAuth>
              <MinePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/songs/:id"
          element={
            <RequireAuth>
              <SongDetailPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
