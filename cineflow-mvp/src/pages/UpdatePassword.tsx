import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clapperboard, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function UpdatePassword() {
  const nav = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);

  async function atualizar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("Senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (senha !== confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    nav("/login");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Clapperboard className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl">Nova senha</CardTitle>
          <CardDescription>Escolha uma senha com pelo menos 8 caracteres</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={atualizar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" type="password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar senha</Label>
              <Input id="confirmar" type="password" minLength={8} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Atualizar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
