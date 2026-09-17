import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  countryCode: text("country_code").notNull(),
  currencyCode: text("currency_code").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  currencyLocale: text("currency_locale").notNull(),
  timezone: text("timezone").notNull(),
  dateFormat: text("date_format").notNull(),
  timeFormat: text("time_format").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  taxInclusive: boolean("tax_inclusive").notNull().default(false),
  taxName: text("tax_name").notNull().default("Tax"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  defaultDiscountType: text("default_discount_type").notNull().default("none"),
  defaultDiscountValue: numeric("default_discount_value", { precision: 12, scale: 2 }).notNull().default("0"),
  theme: text("theme").notNull().default("system"),
  primaryColor: text("primary_color").notNull().default("#000000"),
  sidebarBg: text("sidebar_bg").notNull().default("#ffffff"),
  paletteId: text("palette_id").notNull().default("graphite-mint"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  onboardingStep: text("onboarding_step").notNull().default("shop"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shopMembers = pgTable("shop_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  permissions: jsonb("permissions"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("tag"),
  color: text("color").notNull().default("#888888"),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id"),
  name: text("name").notNull(),
  sku: text("sku"),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  qty: integer("qty").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  unit: text("unit").notNull().default("unit"),
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  trackStock: boolean("track_stock").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#888888"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  paymentTerms: text("payment_terms").notNull(),
  currencyCode: text("currency_code").notNull(),
  leadTimeDays: integer("lead_time_days"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -- NEW TRANSACTIONS & SALES TABLES --

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  cashierId: uuid("cashier_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "set null" }), // if cashier deleted, keep log
  customerId: uuid("customer_id").references(() => profiles.id, {
    onDelete: "set null",
  }), // walk-in = null
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  discountType: text("discount_type"), // 'amount' | 'percent' | null
  discountValue: numeric("discount_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  roundOff: numeric("round_off", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  paymentMethod: text("payment_method").notNull().default("cash"), // cash, credit, transfer
  paymentSplits: jsonb("payment_splits"), // [{method: 'cash'|'credit'|'transfer', amount: number}]
  creditStatus: text("credit_status"), // 'pending' | 'partial' | 'paid' | null
  creditAmountPaid: numeric("credit_amount_paid", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("completed"), // completed, refunded
  receiptId: text("receipt_id").notNull(), // User-friendly receipt string e.g. RCPT-1004
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }), // if product deleted, keep record
  productName: text("product_name").notNull(), // historic record
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  outstandingBalance: numeric("outstanding_balance", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  visitCount: integer("visit_count").notNull().default(0),
  lastVisit: timestamp("last_visit", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -- RETURNS / REFUNDS --

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(),
  method: text("method").notNull(),
  refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("completed"),
  processedBy: uuid("processed_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const returnItems = pgTable("return_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  returnId: uuid("return_id")
    .notNull()
    .references(() => returns.id, { onDelete: "cascade" }),
  transactionItemId: uuid("transaction_item_id")
    .notNull()
    .references(() => transactionItems.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  condition: text("condition").notNull().default("resellable"),
});

// -- PURCHASE ORDERS / RESTOCKING --

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  orderNumber: text("order_number").notNull(),
  status: text("status").notNull().default("draft"), // draft, ordered, received, cancelled
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// -- STOCK ADJUSTMENTS --

export const stockAdjustments = pgTable("stock_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id")
    .notNull()
    .references(() => shops.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  previousQty: integer("previous_qty").notNull(),
  adjustmentQty: integer("adjustment_qty").notNull(), // positive = add, negative = subtract
  newQty: integer("new_qty").notNull(),
  reason: text("reason").notNull(), // 'manual', 'damaged', 'expired', 'count_correction', 'returned'
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
