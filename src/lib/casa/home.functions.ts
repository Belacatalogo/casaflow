import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { sanitizeSnapshot } from "@/lib/casa/sanitize";
import { applyPantryChange } from "@/lib/casa/stock";
import type { Snapshot } from "@/lib/casa/types";
import { currentMonthKey } from "@/lib/casa/format";

export type HomeState = {
  role: "owner" | "kitchen";
  code: string;
  snapshot: Snapshot;
  updatedAt: string;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

function readSnapshot(value: unknown): Snapshot {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const snapshot = sanitizeSnapshot(parsed);
  if (!snapshot) throw new Error("Não consegui ler os dados da casa.");
  return snapshot;
}

async function membership(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ home_id: string; role: "owner" | "kitchen"; code: string; snapshot: unknown; updated_at: string }>`
    select m.home_id, m.role, h.code, h.snapshot, h.updated_at
    from casa_member m
    join casa_home h on h.id = m.home_id
    where m.user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export const loadHome = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HomeState | null> => {
    const row = await membership(context.userId);
    if (!row) return null;
    return { role: row.role, code: row.code, snapshot: readSnapshot(row.snapshot), updatedAt: new Date(row.updated_at).toISOString() };
  });

export const createHome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Snapshot) => {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot) throw new Error("Dados inválidos.");
    return snapshot;
  })
  .handler(async ({ context, data }): Promise<HomeState> => {
    const existing = await membership(context.userId);
    if (existing) return { role: existing.role, code: existing.code, snapshot: readSnapshot(existing.snapshot), updatedAt: new Date(existing.updated_at).toISOString() };
    const sql = await getSql();
    const id = crypto.randomUUID();
    let code = makeCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const taken = await sql<{ code: string }>`select code from casa_home where code = ${code}`;
      if (taken.length === 0) break;
      code = makeCode();
    }
    await sql`insert into casa_home (id, owner_id, code, snapshot) values (${id}, ${context.userId}, ${code}, ${JSON.stringify(data)}::jsonb)`;
    await sql`insert into casa_member (user_id, home_id, role) values (${context.userId}, ${id}, ${"owner"})`;
    return { role: "owner", code, snapshot: data, updatedAt: new Date().toISOString() };
  });

export const joinHome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: String(input?.code ?? "").trim().toUpperCase() }))
  .handler(async ({ context, data }): Promise<HomeState> => {
    const existing = await membership(context.userId);
    if (existing) return { role: existing.role, code: existing.code, snapshot: readSnapshot(existing.snapshot), updatedAt: new Date(existing.updated_at).toISOString() };
    const sql = await getSql();
    const homes = await sql<{ id: string; code: string; snapshot: unknown; updated_at: string }>`
      select id, code, snapshot, updated_at from casa_home where upper(code) = ${data.code}
    `;
    const home = homes[0];
    if (!home) throw new Error("Não achei uma casa com esse código.");
    await sql`insert into casa_member (user_id, home_id, role) values (${context.userId}, ${home.id}, ${"kitchen"})`;
    return { role: "kitchen", code: home.code, snapshot: readSnapshot(home.snapshot), updatedAt: new Date(home.updated_at).toISOString() };
  });

export const saveHome = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Snapshot) => {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot) throw new Error("Dados inválidos.");
    return snapshot;
  })
  .handler(async ({ context, data }): Promise<{ updatedAt: string }> => {
    const row = await membership(context.userId);
    if (!row) throw new Error("Crie a casa antes de salvar.");
    if (row.role !== "owner") throw new Error("Só a conta principal altera a casa inteira.");
    const sql = await getSql();
    const updated = await sql<{ updated_at: string }>`
      update casa_home set snapshot = ${JSON.stringify(data)}::jsonb, updated_at = now()
      where id = ${row.home_id}
      returning updated_at
    `;
    return { updatedAt: new Date(updated[0]?.updated_at ?? Date.now()).toISOString() };
  });

export const adjustPantry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { productId: string; action: "down" | "out" }) => {
    const action: "down" | "out" = input?.action === "out" ? "out" : "down";
    const productId = String(input?.productId ?? "");
    if (!productId) throw new Error("Produto inválido.");
    return { productId, action };
  })
  .handler(async ({ context, data }): Promise<HomeState> => {
    const row = await membership(context.userId);
    if (!row) throw new Error("Entre numa casa primeiro.");
    const snapshot = applyPantryChange(readSnapshot(row.snapshot), data.productId, data.action, 0, currentMonthKey(), new Date());
    const sql = await getSql();
    const updated = await sql<{ updated_at: string }>`
      update casa_home set snapshot = ${JSON.stringify(snapshot)}::jsonb, updated_at = now()
      where id = ${row.home_id}
      returning updated_at
    `;
    return { role: row.role, code: row.code, snapshot, updatedAt: new Date(updated[0]?.updated_at ?? Date.now()).toISOString() };
  });
