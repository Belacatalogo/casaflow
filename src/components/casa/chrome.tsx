import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { monthTitle } from "@/lib/casa/format";
import { useMonthShift } from "@/lib/casa/store";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function Reveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function MonthSwitcher({ className, titleClassName }: { className?: string; titleClassName?: string }) {
  const { viewMonth, previous, next } = useMonthShift();
  if (!viewMonth) return null;
  return (
    <div className={cn("flex items-center", className)}>
      <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={previous}>
        <ChevronLeft className="size-5" />
      </Button>
      <p className={cn("text-center font-display text-lg text-ink", titleClassName ?? "min-w-40")}>{monthTitle(viewMonth)}</p>
      <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={next}>
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  lede,
  extra,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm text-muted">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        {lede ? <p className="mt-2 max-w-xl text-pretty text-muted">{lede}</p> : null}
      </div>
      {extra}
    </header>
  );
}

export function TextLink({ to, children }: { to: "/" | "/lista" | "/comprando" | "/catalogo" | "/analises" | "/historico" | "/ajustes"; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm font-medium text-terra-deep underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
