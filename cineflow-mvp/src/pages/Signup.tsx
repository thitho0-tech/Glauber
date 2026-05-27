import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clapperboard, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Signup() {
  const nav = useNavigate();
  const [nome, setNome] = useState("");
  const [produtora, setProdutora] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (senha.length < 8) {
      setLoading(false);
      toast.error("Senha precisa ter pelo menos 8 caracteres");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, org_nome: produtora } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    nav("/login", { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Clapperboard className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl">Criar conta no Glauber</CardTitle>
          <CardDescription>Sua produtora em 30 segundos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={cadastrar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="produtora">Nome da produtora</Label>
              <Input id="produtora" value={produtora} onChange={(e) => setProdutora(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha (mínimo 8 caracteres)</Label>
              <Input id="senha" type="password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
