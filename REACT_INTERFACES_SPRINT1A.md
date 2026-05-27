# React Interfaces — Sprint 1A

**TypeScript types para todos os componentes**

---

## 📦 Types & Interfaces

### 1. ProjectKPIs (dados do Supabase)

```typescript
type ProjectKPIs = {
  id: string;
  projeto_id: string;
  roteiro_filmado_pct: number;        // 0-100
  orcamento_comprometido_pct: number; // 0-100
  prazos_criticos: string[];          // ISO dates
  proximos_eventos: ProximoEvento[];
  updated_at: string;
  updated_by: string;
};

type ProximoEvento = {
  tipo: 'edital' | 'pagamento' | 'evento_criativo';
  data: string;                        // ISO date
  responsavel: string;                 // email
  titulo: string;
};
```

### 2. User & Auth

```typescript
type UserRole = 'dp' | 'produtor' | 'diretor' | 'ad' | 'colaborador';

type AuthUser = {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  projeto_ids: string[];              // Projetos que participa
};
```

### 3. Project (contexto)

```typescript
type Project = {
  id: string;
  nome: string;
  descricao?: string;
  orcamento_total: number;
  data_inicio: string;
  data_termino: string;
  criado_em: string;
};
```

---

## 🪝 Custom Hooks

### `useProjectKPIs(projectId: string)`

```typescript
export function useProjectKPIs(projectId: string) {
  const [kpis, setKPIs] = useState<ProjectKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Conectar Supabase Realtime
    const subscription = supabase
      .from('projeto_kpis')
      .on('*', (payload) => {
        if (payload.new.projeto_id === projectId) {
          setKPIs(payload.new);
        }
      })
      .subscribe();

    // Fallback: polling a cada 5s se Realtime cair
    const fallbackInterval = setInterval(() => {
      supabase
        .from('projeto_kpis')
        .select('*')
        .eq('projeto_id', projectId)
        .single()
        .then(({ data }) => setKPIs(data))
        .catch(err => setError(err));
    }, 5000);

    setLoading(false);

    return () => {
      subscription.unsubscribe();
      clearInterval(fallbackInterval);
    };
  }, [projectId]);

  return { kpis, loading, error };
}
```

### `useAuth()`

```typescript
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Buscar dados do user (role, projetos, etc)
        setUser({
          id: user.id,
          email: user.email,
          nome: user.user_metadata?.nome || user.email,
          role: user.user_metadata?.role || 'colaborador',
          projeto_ids: user.user_metadata?.projeto_ids || []
        });
      }
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
```

---

## 🧩 Componentes Principais

### `<CommandCenter />`

```typescript
type CommandCenterProps = {
  projectId: string;
  userRole: UserRole;
};

export function CommandCenter({ projectId, userRole }: CommandCenterProps) {
  const { kpis, loading, error } = useProjectKPIs(projectId);

  if (loading) return <CommandCenterSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!kpis) return <EmptyState />;

  // Renderizar view baseado no role
  switch (userRole) {
    case 'dp':
    case 'produtor':
      return <DPView kpis={kpis} />;
    case 'diretor':
      return <DirectorView kpis={kpis} />;
    case 'ad':
      return <ADView kpis={kpis} />;
    case 'colaborador':
      return <CollaboratorView kpis={kpis} />;
    default:
      return <ErrorCard error={new Error('Unknown role')} />;
  }
}
```

### `<DPView />` (DP/Produtor)

```typescript
type DPViewProps = {
  kpis: ProjectKPIs;
};

export function DPView({ kpis }: DPViewProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Card 1: % Roteiro Filmado */}
      <KPICard
        label="Roteiro Filmado"
        value={kpis.roteiro_filmado_pct}
        unit="%"
        status={getStatus(kpis.roteiro_filmado_pct)} // 'ok' | 'warning' | 'danger'
      />

      {/* Card 2: % Orçamento */}
      <KPICard
        label="Orçamento Comprometido"
        value={kpis.orcamento_comprometido_pct}
        unit="%"
        status={getStatus(kpis.orcamento_comprometido_pct)}
      />

      {/* Card 3: Prazos Críticos */}
      <AlertsCard prazos={kpis.prazos_criticos} />

      {/* Card 4: Próximos Eventos */}
      <EventsCard eventos={kpis.proximos_eventos} />
    </div>
  );
}
```

### `<DirectorView />`

```typescript
type DirectorViewProps = {
  kpis: ProjectKPIs;
};

export function DirectorView({ kpis }: DirectorViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Card 1: Próximos Eventos Criativos */}
      <CreativeEventsCard eventos={kpis.proximos_eventos} />

      {/* Card 2: Tarefas Pendentes */}
      <TasksCard />

      {/* Card 3: Decupagem Status */}
      <DecupagingStatusCard />

      {/* Card 4: Lookbook/Referências */}
      <LookbookCard />
    </div>
  );
}
```

### `<ADView />`

```typescript
type ADViewProps = {
  kpis: ProjectKPIs;
};

export function ADView({ kpis }: ADViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Card 1: Stripboard Próximos 3 Dias */}
      <StripboardCard periodo="3dias" />

      {/* Card 2: OD Status */}
      <ODStatusCard />

      {/* Card 3: Dependências Equipe */}
      <DependenciesCard />

      {/* Card 4: Checklist Produção */}
      <ChecklistCard />
    </div>
  );
}
```

### `<CollaboratorView />`

```typescript
type CollaboratorViewProps = {
  kpis: ProjectKPIs;
};

export function CollaboratorView({ kpis }: CollaboratorViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Card 1: Minhas Tarefas */}
      <MyTasksCard />

      {/* Card 2: Prazos */}
      <DeadlinesCard prazos={kpis.prazos_criticos} />

      {/* Card 3: Notificações */}
      <NotificationsCard />

      {/* Card 4: Perfil/Info */}
      <ProfileCard />
    </div>
  );
}
```

---

## 📊 Componentes Auxiliares

### `<KPICard />`

```typescript
type KPICardProps = {
  label: string;
  value: number;
  unit: string;
  status: 'ok' | 'warning' | 'danger';
  trend?: 'up' | 'down' | 'stable';
};

export function KPICard({ label, value, unit, status, trend }: KPICardProps) {
  const colorMap = {
    ok: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-200">
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-3xl font-bold ${colorMap[status]}`}>
        {value}{unit}
      </div>
      {trend && <div className="text-xs mt-2">Trend: {trend}</div>}
    </div>
  );
}
```

### `<AlertsCard />`

```typescript
type AlertsCardProps = {
  prazos: string[];
};

export function AlertsCard({ prazos }: AlertsCardProps) {
  const hoje = new Date();
  const alertas = prazos
    .map(p => new Date(p))
    .filter(d => d > hoje)
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 5);

  return (
    <div className="bg-white p-4 rounded border border-gray-200">
      <h3 className="font-bold mb-3">⚠️ Prazos Críticos</h3>
      <div className="space-y-2">
        {alertas.map(data => (
          <div key={data.toISOString()} className="text-sm flex justify-between">
            <span>{data.toLocaleDateString('pt-BR')}</span>
            <span className="text-red-600 font-bold">
              {Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))} dias
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `<EventsCard />`

```typescript
type EventsCardProps = {
  eventos: ProximoEvento[];
};

export function EventsCard({ eventos }: EventsCardProps) {
  const proximos = eventos
    .filter(e => new Date(e.data) > new Date())
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white p-4 rounded border border-gray-200">
      <h3 className="font-bold mb-3">📅 Próximos Eventos</h3>
      <div className="space-y-2">
        {proximos.map((evt, i) => (
          <div key={i} className="text-sm border-l-2 border-blue-400 pl-3">
            <div className="font-bold">{evt.titulo}</div>
            <div className="text-xs text-gray-600">{evt.data} • {evt.responsavel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist Implementação

- [ ] Tipos em `types/index.ts`
- [ ] Hook `useProjectKPIs` em `hooks/useProjectKPIs.ts`
- [ ] Hook `useAuth` em `hooks/useAuth.ts`
- [ ] Componente `CommandCenter` em `components/CommandCenter.tsx`
- [ ] 4 Views (DP, Director, AD, Collaborator) em `components/views/`
- [ ] Componentes auxiliares (KPICard, AlertsCard, EventsCard, etc) em `components/cards/`
- [ ] Testes para cada componente

---

**Próximo:** TAREFA 1.5 — Consolidar **BRIEF_SPRINT1A.md** (arquivo único com TUDO)

Pronto? ✅
