import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ResetPassword from "@/pages/ResetPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Schedule from "@/pages/Schedule";
import PlanejamentoDetalhe from "@/pages/PlanejamentoDetalhe";
import Communication from "@/pages/Communication";
import InviteAccept from "@/pages/InviteAccept";
import CallSheets from "@/pages/CallSheets";
import CallSheetEditor from "@/pages/CallSheetEditor";
import Team from "@/pages/Team";
import Locations from "@/pages/Locations";
import Finance from "@/pages/Finance";
import Accountability from "@/pages/Accountability";
import Settings from "@/pages/Settings";
import PublicCallSheet from "@/pages/PublicCallSheet";
import Contract from "@/pages/Contract";
import FigurinoArte from "@/pages/FigurinoArte";
import Cast from "@/pages/Cast";
import Roteiro from "@/pages/Roteiro";
import Onboarding from "@/pages/Onboarding";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/od/:token" element={<PublicCallSheet />} />
          <Route path="/convite" element={<InviteAccept />} />

          <Route
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/projetos" element={<Projects />} />
            <Route path="/projetos/:id" element={<ProjectDetail />} />
            <Route path="/projetos/:id/cronograma" element={<Schedule />} />
            <Route path="/projetos/:id/cronograma/:diaId" element={<PlanejamentoDetalhe />} />
            <Route path="/projetos/:id/ordens-do-dia" element={<CallSheets />} />
            <Route path="/projetos/:id/ordens-do-dia/od/:odId" element={<CallSheetEditor />} />
            <Route path="/projetos/:id/ordens-do-dia/:diaId" element={<CallSheetEditor />} />
            <Route path="/projetos/:id/equipe" element={<Team />} />
            <Route path="/projetos/:id/locacoes" element={<Locations />} />
            <Route path="/projetos/:id/financeiro" element={<Finance />} />
            <Route path="/projetos/:id/prestacao" element={<Accountability />} />
            <Route path="/projetos/:id/comunicacao" element={<Communication />} />
            <Route path="/projetos/:id/contrato" element={<Contract />} />
            <Route path="/projetos/:id/figurino-arte" element={<FigurinoArte />} />
            <Route path="/projetos/:id/elenco" element={<Cast />} />
            <Route path="/projetos/:id/roteiro" element={<Roteiro />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
