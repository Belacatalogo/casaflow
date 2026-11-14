import {
  Apple,
  Beef,
  Croissant,
  Droplets,
  Milk,
  ShoppingBasket,
  SprayCan,
  Wheat,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  apple: Apple,
  wheat: Wheat,
  beef: Beef,
  milk: Milk,
  spray: SprayCan,
  droplets: Droplets,
  croissant: Croissant,
  basket: ShoppingBasket,
};

export const ICON_OPTIONS = [
  { id: "apple", label: "Hortifruti" },
  { id: "wheat", label: "Mercearia" },
  { id: "beef", label: "Proteína" },
  { id: "milk", label: "Laticínio" },
  { id: "spray", label: "Limpeza" },
  { id: "droplets", label: "Higiene" },
  { id: "croissant", label: "Padaria" },
  { id: "basket", label: "Geral" },
] as const;

export function CategoryGlyph({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ShoppingBasket;
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
