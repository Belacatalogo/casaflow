import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar · CasaFlow" }] }),
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-ink">
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">CasaFlow</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Entrar na casa</h1>
        <p className="mt-2 text-pretty text-muted">A mesma conta abre no celular e no tablet.</p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="h-12 rounded-full bg-hero text-sm font-medium text-on-hero"
              >
                Continuar com {provider.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">O acesso ainda não está ligado.</p>
          )}
        </div>
      </div>
    </main>
  );
}
