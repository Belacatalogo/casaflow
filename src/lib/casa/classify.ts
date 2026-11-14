export type ProductGuess = {
  icon: string;
  unit: string;
  coverageDays: number;
  recurring: boolean;
};

type Rule = ProductGuess & { words: string[] };

const RULES: Rule[] = [
  { icon: "spray", unit: "un", coverageDays: 30, recurring: true, words: ["sabao em po", "sabao liquido", "agua sanitaria", "detergente", "desinfetante", "amaciante", "multiuso", "esponja", "alcool", "inseticida", "saco de lixo", "papel toalha", "desengordurante", "limpador", "sabao", "omo", "ariel", "ype"] },
  { icon: "droplets", unit: "un", coverageDays: 30, recurring: true, words: ["papel higienico", "pasta de dente", "creme dental", "fio dental", "sabonete", "shampoo", "condicionador", "desodorante", "absorvente", "enxaguante", "cotonete", "algodao", "fralda", "lenco umedecido", "colgate"] },
  { icon: "milk", unit: "un", coverageDays: 7, recurring: true, words: ["creme de leite", "leite", "queijo", "manteiga", "iogurte", "requeijao", "ricota", "mussarela", "mucarela", "coalhada", "nata", "bebida lactea"] },
  { icon: "wheat", unit: "un", coverageDays: 30, recurring: true, words: ["leite condensado", "leite em po", "grao de bico", "oleo de soja", "oleo", "azeite", "arroz", "feijao", "acucar", "cafe", "macarrao", "molho", "biscoito", "bolacha", "farinha", "vinagre", "extrato", "ervilha", "milho", "sardinha", "atum", "achocolatado", "fuba", "polvilho", "fermento", "tempero", "caldo", "ketchup", "catchup", "maionese", "mostarda", "azeitona", "pipoca", "amendoim", "granola", "aveia", "lentilha", "sal", "agua"] },
  { icon: "wheat", unit: "un", coverageDays: 15, recurring: false, words: ["refrigerante", "cerveja", "vinho", "suco", "energetico"] },
  { icon: "beef", unit: "kg", coverageDays: 7, recurring: true, words: ["carne moida", "frango", "carne", "patinho", "alcatra", "picanha", "linguica", "peixe", "salmao", "tilapia", "camarao", "bacon", "presunto", "salsicha", "hamburguer", "file", "coxa", "sobrecoxa", "acem", "costela", "pernil"] },
  { icon: "beef", unit: "un", coverageDays: 15, recurring: true, words: ["ovos", "ovo"] },
  { icon: "apple", unit: "kg", coverageDays: 7, recurring: true, words: ["milho verde", "cheiro verde", "banana", "maca", "tomate", "cebola", "alho", "batata", "alface", "limao", "laranja", "abacate", "cenoura", "beterraba", "couve", "brocolis", "repolho", "pepino", "pimentao", "abobrinha", "abobora", "mandioca", "aipim", "inhame", "chuchu", "vagem", "morango", "uva", "mamao", "melancia", "melao", "manga", "abacaxi", "kiwi", "pera", "pessego", "goiaba", "maracuja", "rucula", "agriao", "espinafre"] },
  { icon: "croissant", unit: "un", coverageDays: 4, recurring: true, words: ["pao de forma", "pao frances", "bisnaguinha", "pao", "bolo", "rosca", "sonho", "torrada"] },
];

const INDEX = RULES.flatMap((rule) => rule.words.map((word) => ({ word, icon: rule.icon, unit: rule.unit, coverageDays: rule.coverageDays, recurring: rule.recurring }))).sort(
  (a, b) => b.word.length - a.word.length,
);

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function guessProduct(name: string): ProductGuess | null {
  const text = normalizeName(name);
  if (text.length < 2) return null;
  for (const rule of INDEX) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(rule.word)}(\\s|$)`);
    if (pattern.test(text)) {
      return { icon: rule.icon, unit: rule.unit, coverageDays: rule.coverageDays, recurring: rule.recurring };
    }
  }
  return null;
}

export function sameProductName(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 4) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(shorter)}(\\s|$)`).test(longer);
}

export function matchedWord(name: string): string | null {
  const text = normalizeName(name);
  if (text.length < 2) return null;
  for (const rule of INDEX) {
    if (new RegExp(`(^|\\s)${escapeRegExp(rule.word)}(\\s|$)`).test(text)) return rule.word;
  }
  return null;
}

export function findProductByName<T extends { name: string }>(products: T[], rawName: string): T | undefined {
  const text = normalizeName(rawName);
  if (!text) return undefined;
  const exact = products.find((product) => normalizeName(product.name) === text);
  if (exact) return exact;
  const named = products.filter((product) => {
    const name = normalizeName(product.name);
    if (name.length < 4) return false;
    return new RegExp(`(^|\\s)${escapeRegExp(name)}(\\s|$)`).test(text);
  });
  const word = matchedWord(rawName);
  if (word) {
    const specific = named.filter((product) => matchedWord(product.name) === word || normalizeName(product.name) === word);
    if (specific.length > 0) return specific.sort((a, b) => normalizeName(b.name).length - normalizeName(a.name).length)[0];
    if (named.length > 0 && named.every((product) => {
      const known = matchedWord(product.name);
      return known != null && known !== word;
    })) return undefined;
  }
  return named.sort((a, b) => normalizeName(b.name).length - normalizeName(a.name).length)[0];
}

export function tidyProductName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length < 2) return clean;
  if (clean !== clean.toUpperCase()) return clean;
  const lower = clean.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

export function categoryForGuess<T extends { id: string; icon: string }>(categories: T[], guess: ProductGuess | null): T | null {
  if (!guess) return null;
  return categories.find((category) => category.icon === guess.icon) ?? null;
}
