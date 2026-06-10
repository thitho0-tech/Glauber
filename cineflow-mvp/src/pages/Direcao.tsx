import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clapperboard, FileText, Layout } from "lucide-react";

export default function Direcao() {
  const { id } = useParams<{ id: string }>();

  const atalhos = [
    {
      to: `/projetos/${id}/ordens-do-dia`,
      icon: FileText,
      label: "Ordens do Dia",
      desc: "Crie e publique as ODs diárias para a equipe.",
    },
    {
      to: `/projetos/${id}/roteiro`,
      icon: Layout,
      label: "Roteiro & Decupagem",
      desc: "Visualize e edite o roteiro e a decupagem técnica.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clapperboard className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Direção</h1>
          <p className="text-sm text-muted-foreground">Ferramentas da equipe de direção.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {atalhos.map((a) => (
          <Card key={a.to} className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <a.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{a.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{a.desc}</p>
              <Button asChild size="sm">
                <Link to={a.to}>Acessar</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Clapperboard className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base text-muted-foreground">Stripboard / Continuidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Em desenvolvimento — Sprint 4C.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
