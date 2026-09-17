-- Returns / Refunds tables
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  method TEXT NOT NULL,
  refund_amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  transaction_item_id UUID NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  condition TEXT NOT NULL DEFAULT 'resellable'
);

CREATE INDEX IF NOT EXISTS idx_returns_shop ON returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_returns_transaction ON returns(transaction_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
