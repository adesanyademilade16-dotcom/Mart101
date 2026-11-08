export interface StockAvailability {
  quantity_reserved: number;
  quantity_available: number | null;
}

export async function fetchStockAvailability(productIds: string[]): Promise<Record<string, StockAvailability>> {
  const uniqueIds = [...new Set(productIds)].filter(Boolean);
  const result: Record<string, StockAvailability> = {};
  uniqueIds.forEach((id) => { result[id] = { quantity_reserved: 0, quantity_available: -1 }; });

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100);
    const response = await fetch("/api/products/stock-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: batch }),
    });
    if (!response.ok) continue;
    let payload: any;
    try { payload = await response.json(); } catch { continue; }
    (payload.stock || []).forEach((item: any) => {
      result[item.product_id] = {
        quantity_reserved: Number(item.quantity_reserved || 0),
        quantity_available: item.quantity_available == null ? null : Number(item.quantity_available),
      };
    });
  }

  return result;
}
