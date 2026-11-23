import type { StoreItem, StockTransaction } from '@/types';
import { mockStoreItems, mockStockTransactions } from '@/mocks/data';

let items = [...mockStoreItems];
let txns = [...mockStockTransactions];

export async function getStoreItems(): Promise<StoreItem[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...items];
}

export async function getStockTransactions(): Promise<StockTransaction[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...txns];
}

export async function recordStockTransaction(payload: Omit<StockTransaction, 'id'>): Promise<StockTransaction> {
  await new Promise(r => setTimeout(r, 300));
  const newTxn: StockTransaction = {
    ...payload,
    id: `TXN-${100 + txns.length + 1}`,
  };
  txns.unshift(newTxn);

  // Update item quantity
  const itm = items.find(i => i.item_id === payload.item_id);
  if (itm) {
    if (payload.txn_type === 'In') itm.current_stock += payload.quantity;
    else itm.current_stock = Math.max(0, itm.current_stock - payload.quantity);
    itm.status = itm.current_stock <= itm.reorder_level ? 'low' : 'ok';
  }

  return newTxn;
}
