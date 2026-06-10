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
import ProjectDashboard from "@/pages/ProjectDashboard";
import Fornecedores from "@/pages/Fornecedores";
import Agenda from "@/pages/Agenda";
import Lixeira from "@/pages/Lixeira";
// 4B — novos departamentos e hub de Produção
import Producao from "@/pages/Producao";
import Direcao from "@/pages/Direcao";
import Fotografia from "@/pages/Fotografia";
import Som from "@/pages/Som";
import PosProducao from "@/pages/PosProducao";
import MapaTransporte from "@/pages/MapaTransporte";
import Administrativo from "@/pages/Administrativo";

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
            <Route path="/projetos/:id" element={<Navigate to="dashboard" replace />} />
            <Route path="/projetos/:id/dashboard" element={<ProjectDashboard />} />

            {/* Agenda unificada (L11) — /cronograma redireciona para /agenda */}
            <Route path="/projetos/:id/agenda" element={<Agenda />} />
            <Route path="/projetos/:id/cronograma" element={<Navigate to="../agenda" replace />} />
            <Route path="/projetos/:id/cronograma/:diaId" element={<PlanejamentoDetalhe />} />

            {/* Ordens do Dia */}
            <Route path="/projetos/:id/ordens-do-dia" element={<CallSheets />} />
            <Route path="/projetos/:id/ordens-do-dia/od/:odId" element={<CallSheetEditor />} />
            <Route path="/projetos/:id/ordens-do-dia/:diaId" element={<CallSheetEditor />} />

            {/* Roteiro & Decupagem (dois pontos de entrada) */}
            <Route path="/projetos/:id/roteiro" element={<Roteiro />} />
            <Route path="/projetos/:id/roteiro-depto" element={<Roteiro />} />

            {/* ── PRODUÇÃO HUB com sub-abas (L10) ── */}
            <Route path="/projetos/:id/producao" element={<Producao />}>
              <Route index element={<Navigate to="equipe" replace />} />
              <Route path="equipe"       element={<Team />} />
              <Route path="locacoes"     element={<Locations />} />
              <Route path="financeiro"   element={<Finance />} />
              <Route path="fornecedores" element={<Fornecedores />} />
              <Route path="contrato"     element={<Contract />} />
              <Route path="prestacao"    element={<Accountability />} />
            </Route>

            {/* Rotas legadas individuais (backward-compat) */}
            <Route path="/projetos/:id/equipe"       element={<Team />} />
            <Route path="/projetos/:id/locacoes"     element={<Locations />} />
            <Route path="/projetos/:id/financeiro"   element={<Finance />} />
            <Route path="/projetos/:id/prestacao"    element={<Accountability />} />
            <Route path="/projetos/:id/comunicacao"  element={<Communication />} />
            <Route path="/projetos/:id/contrato"     element={<Contract />} />
            <Route path="/projetos/:id/fornecedores" element={<Fornecedores />} />

            {/* ── DEPARTAMENTOS (L10) ── */}
            <Route path="/projetos/:id/direcao"       element={<Direcao />} />
            <Route path="/projetos/:id/figurino-arte" element={<FigurinoArte />} />
            <Route path="/projetos/:id/fotografia"    element={<Fotografia />} />
            <Route path="/projetos/:id/som"           element={<Som />} />
            <Route path="/projetos/:id/elenco"        element={<Cast />} />
            <Route path="/projetos/:id/pos-producao"  element={<PosProducao />} />

            {/* ── OUTROS (L10) ── */}
            <Route path="/projetos/:id/mapa-transporte"  element={<MapaTransporte />} />
            <Route path="/projetos/:id/administrativo"   element={<Administrativo />} />

            {/* Globais */}
            <Route path="/onboarding"    element={<Onboarding />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/lixeira"       element={<Lixeira />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
