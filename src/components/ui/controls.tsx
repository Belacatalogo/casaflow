import * as Dialog from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra",
  {
    variants: {
      variant: {
        primary: "bg-terra-fill text-on-terra hover:bg-terra-deep",
        secondary: "bg-sunken text-ink hover:bg-line",
        ghost: "text-ink hover:bg-sunken",
        soft: "bg-terra-soft text-terra-deep hover:bg-gold-soft",
      },
      size: {
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type = "button", ...props }: ButtonProps) {
  const classes = cn(buttonStyles({ variant, size }), className);
  if (asChild) return <Slot className={classes} {...props} />;
  return <button className={classes} type={type} {...props} />;
}

export const fieldClass =
  "h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-terra";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-terra-deep">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hero/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface p-5 shadow-card sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[32rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-2xl text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-pretty text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken" aria-label="Fechar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="mt-4 overflow-y-auto pr-1">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5", className)}>{children}</section>;
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="max-w-md text-pretty text-muted">{detail}</p>
      {action}
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="h-8 w-48 rounded-full bg-line" />
      <div className="h-44 rounded-3xl bg-line" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl bg-line" />
        <div className="h-20 rounded-2xl bg-line" />
        <div className="h-20 rounded-2xl bg-line" />
      </div>
      <div className="h-56 rounded-3xl bg-line" />
    </div>
  );
}
