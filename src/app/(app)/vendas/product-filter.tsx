"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProductFilter({ products, value }: { products: { id: string; name: string }[]; value?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <select
      aria-label="Produto"
      value={value ?? ""}
      onChange={(e) => {
        const q = new URLSearchParams(params);
        if (e.target.value) q.set("produto", e.target.value);
        else q.delete("produto");
        router.push(`/vendas?${q}`);
      }}
      className="max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
    >
      <option value="">Todos os produtos</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
