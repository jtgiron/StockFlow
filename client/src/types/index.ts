export type UserRole = "admin" | "employee";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  barcode: string | null;
  barcodes?: string[] | null;
  name: string;
  description: string | null;
  category_id: number | null;
  cost_price: number;
  sell_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  image_url: string | null;
  sell_by_weight: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export type MovementType = "entry" | "exit" | "adjustment";

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  reason: string | null;
  user_id: string;
  created_at: string;
  product?: Product;
  profile?: Profile;
}

export interface CashRegister {
  id: number;
  user_id: string;
  closed_by_user_id?: string | null;
  opened_at: string;
  closed_at: string | null;
  openingcash_amount: number;
  closingcash_amount: number | null;
  closingqr_amount: number | null;
  expectedcash_amount: number | null;
  expectedqr_amount: number | null;
  difference: number | null;
  status: "open" | "closed";
  notes: string | null;
  profile?: Profile;
  opened_by_user?: Pick<Profile, "id" | "full_name" | "role">;
  closed_by_user?: Pick<Profile, "id" | "full_name" | "role"> | null;
}

export type SaleStatus = "completed" | "cancelled" | "pending";

export interface Sale {
  id: number;
  cash_register_id: number;
  user_id: string;
  total_amount: number;
  status: SaleStatus;
  created_at: string;
  sale_items?: SaleItem[];
  sale_payments?: SalePayment[];
  profile?: Profile;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export type PaymentMethod = "cash" | "card" | "qr" | "mercadopago" | "credit";

export interface SalePayment {
  id: number;
  sale_id: number;
  payment_method: PaymentMethod;
  amount: number;
  mp_payment_id: string | null;
  created_at: string;
}

export interface CreditAccount {
  id: number;
  customer_name: string;
  phone: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreditTransactionType = "charge" | "payment";

export interface CreditTransaction {
  id: number;
  credit_account_id: number;
  sale_id: number | null;
  amount: number;
  type: CreditTransactionType;
  notes: string | null;
  user_id: string;
  created_at: string;
  credit_account?: CreditAccount;
  profile?: Profile;
}

export type PriceListStatus = "draft" | "applied";

export interface PriceList {
  id: number;
  name: string;
  applied_at: string | null;
  applied_by: string | null;
  status: PriceListStatus;
  created_at: string;
  items?: PriceListItem[];
}

export interface PriceListItem {
  id: number;
  price_list_id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export type MpOrderStatus = "pending" | "completed" | "cancelled" | "expired";

export interface MpOrderResponse {
  order_id: string;
  external_reference: string;
  status: string;
  qr_data: string | null;
}

export interface MpOrderStatusResponse {
  status: MpOrderStatus;
  mp_order_id: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface MpMerchant {
  id: number;
  mp_user_id: number;
  merchant_name: string | null;
  mp_external_pos_id: string | null;
  qr_image_url: string | null;
  is_active: boolean;
  token_valid: boolean;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}
