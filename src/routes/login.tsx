import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, fieldClass } from "@/components/ui/controls";
import { authClient, authEnabled } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · CasaFlow" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"criar" | "entrar">("criar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const mail = email.trim();
    if (!mail.includes("@")) {
      setError("Esse e-mail não parece válido.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (mode === "criar" && name.trim().length < 2) {
      setError("Diga como quer ser chamado.");
      return;
    }
    setPending(true);
    const result =
      mode === "criar"
        ? await authClient.signUp.email({ name: name.trim(), email: mail, password, callbackURL: "/" })
        : await authClient.signIn.email({ email: mail, password, callbackURL: "/" });
    setPending(false);
    if (result.error) {
      setError(explain(result.error.code, mode));
      return;
    }
    void navigate({ to: "/" });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">CasaFlow</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">{mode === "criar" ? "Criar a conta" : "Entrar na casa"}</h1>
        <p className="mt-2 text-pretty text-muted">A mesma conta abre no celular e no tablet.</p>
        {authEnabled ? (
          <form className="mt-6 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
            {mode === "criar" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Seu nome</span>
                <input className={fieldClass} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">E-mail</span>
              <input className={fieldClass} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Senha</span>
              <input className={fieldClass} type="password" autoComplete={mode === "criar" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {mode === "criar" ? <p className="text-sm text-muted">Pelo menos 8 caracteres.</p> : null}
            {error ? <p className="text-sm text-pretty text-terra-deep" role="alert">{error}</p> : null}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Aguarde…" : mode === "criar" ? "Criar conta" : "Entrar"}
            </Button>
            <button
              type="button"
              className="h-11 text-sm font-medium text-muted"
              onClick={() => {
                setMode(mode === "criar" ? "entrar" : "criar");
                setError("");
              }}
            >
              {mode === "criar" ? "Já tenho conta" : "Criar uma conta"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted">O acesso ainda não está ligado.</p>
        )}
      </div>
    </main>
  );
}

function explain(code: string | undefined, mode: "criar" | "entrar") {
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return "Já existe uma conta com esse e-mail. Entre com a senha.";
  }
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "E-mail ou senha não conferem.";
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") return "A senha precisa ter pelo menos 8 caracteres.";
  if (code === "INVALID_EMAIL") return "Esse e-mail não parece válido.";
  return mode === "criar" ? "Não consegui criar a conta. Tente de novo." : "Não consegui entrar. Confira o e-mail e a senha.";
}
