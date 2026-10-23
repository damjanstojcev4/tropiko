import type { Product } from "@/types/product";

// Zero is the database default for products without a chosen display order.
function orderPriority(order: number | undefined): number {
  return order !== undefined && Number.isFinite(order) && order > 0 ? order : Infinity;
}

export function compareProductOrder(a: Product, b: Product): number {
  const aOrder = orderPriority(a.displayOrder);
  const bOrder = orderPriority(b.displayOrder);
  if (aOrder !== bOrder) return aOrder < bOrder ? -1 : 1;
  return a.name.localeCompare(b.name, "mk") || a.id.localeCompare(b.id);
}
