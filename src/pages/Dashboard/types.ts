// ─── USER TYPES ───────────────────────────────────────────────────────────────
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

// ─── PROFILE MODAL TYPES ──────────────────────────────────────────────────────
export interface ProfileForm {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}

export interface PasswordForm {
  current: string;
  newPw: string;
  confirm: string;
}

export interface ShowPasswordState {
  current: boolean;
  newPw: boolean;
  confirm: boolean;
}

// ─── SIDEBAR TYPES ────────────────────────────────────────────────────────────
export type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  path?: string;
  permission?: string;
};

export type SidebarSection = {
  group: string;
  items: SidebarItem[];
};

// ─── STAT CARDS TYPES ─────────────────────────────────────────────────────────
export interface StatCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: React.ElementType;
  sparkData: number[];
  color: string;
}

// ─── USERS TAB TYPES ──────────────────────────────────────────────────────────
export interface RoleOption {
  _id: string;
  name: string;
  isSystem?: boolean;
}

export interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  customRole?: { _id: string; name: string };
  phone?: string;
  address?: string;
  avatar?: string;
  createdAt?: string;
}

export interface UserFormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  customRoleId: string;
}

// ─── ROLES TAB TYPES ──────────────────────────────────────────────────────────
export interface SysPerm {
  _id: string;
  key: string;
  label: string;
  group: string;
}

export interface CustomRole {
  _id: string;
  name: string;
  isSystem?: boolean;
  permissions: SysPerm[];
  createdAt?: string;
}

export interface RoleForm {
  name: string;
  permissionIds: string[];
}

// ─── TAB METADATA TYPES ───────────────────────────────────────────────────────
export interface TabMeta {
  title: string;
  description: string;
  keywords: string;
  path: string;
}

// ─── COLLECTIONS TAB TYPES ────────────────────────────────────────────────────
export interface ThumbnailTransform {
  x: number; // pan offset as fraction of container width (-1 to 1)
  y: number; // pan offset as fraction of container height (-1 to 1)
  scale: number; // extra zoom factor (1 to 4)
  aspect: number; // natural image width/height ratio
}

export interface CollectionRow {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  thumbnailTransform?: ThumbnailTransform;
  isActive: boolean;
  isFeatured: boolean;
  productsCount?: number;
  createdAt?: string;
}

export interface CollectionFormState {
  name: string;
  description: string;
  thumbnail: string;
  isActive: boolean;
  isFeatured: boolean;
  thumbnailTransform?: ThumbnailTransform;
}

// ─── LEGO FRAME TAB TYPES ────────────────────────────────────────────────────
export type LegoFrameSize = "20x20" | "18x18" | "15x15";

export interface ProductCategory {
  id: string;
  name: string;
  updatedAt: string;
}

export type LegoFrameCategory = ProductCategory;

export interface LegoFrameVariant {
  id: string;
  collectionId: string;
  collectionName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  size: LegoFrameSize;
  legoQuantity: number;
  allowVariableLegoCount: boolean;
  legoCountMin: number;
  legoCountMax: number;
  additionalLegoPrice: number;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  updatedAt: string;
}

export interface LegoFrameVariantForm {
  collectionId: string;
  categoryId: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  size: LegoFrameSize;
  legoQuantity: string;
  allowVariableLegoCount: boolean;
  legoCountMin: string;
  legoCountMax: string;
  additionalLegoPrice: string;
  price: string;
  stockQuantity: string;
  lowStockThreshold: string;
  isActive: boolean;
}

// ─── INVENTORY TAB TYPES ───────────────────────────────────────────────────
export type InventoryStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItemRow {
  id: string;
  source: "lego" | "bear";
  groupId: string;
  groupName: string;
  optionName: string;
  optionVisualType: "image" | "color";
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: InventoryStockStatus;
  isActive: boolean;
  updatedAt: string;
}

export interface LegoCustomizationOption {
  id: string;
  groupId: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  allowImageUpload: boolean;
  image: string;
  colorCode: string;
  isActive: boolean;
  updatedAt: string;
}

export interface LegoCustomizationGroup {
  id: string;
  name: string;
  helper: string;
  isActive: boolean;
  optionCount: number;
  updatedAt: string;
  options: LegoCustomizationOption[];
}

export interface LegoCustomizationGroupForm {
  name: string;
  helper: string;
}

export interface LegoCustomizationOptionForm {
  groupId: string;
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  lowStockThreshold: string;
  allowImageUpload: boolean;
  image: string;
  colorCode: string;
}

// ─── CHART TYPES ──────────────────────────────────────────────────────────────
export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface GoalItem {
  label: string;
  current: number;
  target: number;
  pct: number;
  color: string;
}

// ─── FEEDBACKS TAB TYPES ────────────────────────────────────────────────────
export type FeedbackStatus = "new" | "processing" | "resolved";

export interface FeedbackRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  image: string;
  status: FeedbackStatus;
  isPublic: boolean;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackFormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  image: string;
  status: FeedbackStatus;
  isPublic: boolean;
  adminNote: string;
}

// ─── BACKGROUND THEMES TAB TYPES ──────────────────────────────────────────────
export interface BackgroundTheme {
  id: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
}

export type BackgroundThemeFormState = Omit<
  BackgroundTheme,
  "id" | "updatedAt"
>;

// ─── BACKGROUNDS TAB TYPES ────────────────────────────────────────────────────
export type BackgroundFieldType =
  | "short_text"
  | "long_text"
  | "select"
  | "image_upload"
  | "number"
  | "date";

export interface BackgroundFieldOption {
  label: string;
  value: string;
}

export interface BackgroundField {
  label: string;
  fieldType: BackgroundFieldType;
  placeholder: string;
  required: boolean;
  options: BackgroundFieldOption[];
  sortOrder: number;
  selectType?: "dropdown" | "radio" | "checkbox";
}

export interface Background {
  id: string;
  name: string;
  description: string;
  themeId: string;
  themeName: string;
  image: string;
  fields: BackgroundField[];
  fieldCount: number;
  applicableProductType?: "lego" | "bear";
  applicableProductIds: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface BackgroundFieldForm {
  label: string;
  fieldType: BackgroundFieldType;
  placeholder: string;
  required: boolean;
  options: BackgroundFieldOption[];
  selectType?: "dropdown" | "radio" | "checkbox";
}

export interface BackgroundFormState {
  name: string;
  description: string;
  themeId: string;
  image: string;
  applicableProductType: "lego" | "bear";
  applicableProductIds: string[];
  fields: BackgroundFieldForm[];
  isActive: boolean;
}

// ─── CUSTOMER ORDER FIELDS TAB TYPES ────────────────────────────────────────
export type CustomerOrderFieldType = BackgroundFieldType;
export type CustomerOrderFieldSelectType = "dropdown" | "radio" | "checkbox";

export interface CustomerOrderFieldOption {
  label: string;
  value: string;
}

export interface CustomerOrderField {
  label: string;
  fieldType: CustomerOrderFieldType;
  placeholder: string;
  required: boolean;
  options: CustomerOrderFieldOption[];
  sortOrder: number;
  selectType?: CustomerOrderFieldSelectType;
}

export interface CustomerOrderFieldForm {
  label: string;
  fieldType: CustomerOrderFieldType;
  placeholder: string;
  required: boolean;
  options: CustomerOrderFieldOption[];
  selectType?: CustomerOrderFieldSelectType;
}

export interface CustomerOrderFieldsConfig {
  id: string;
  key: string;
  title: string;
  description: string;
  fields: CustomerOrderField[];
  isActive: boolean;
  updatedAt: string;
}

export interface CustomerOrderFieldsFormState {
  title: string;
  description: string;
  fields: CustomerOrderFieldForm[];
  isActive: boolean;
}
// ─── PROMOTIONS TAB TYPES ─────────────────────────────────────────────────────
export interface PromotionGift {
  groupId: string;
  optionId: string;
  quantity: number;
  groupName: string;
  optionName: string;
}

export type PromotionGiftQuantityMode = "fixed" | "multiply_by_condition";
export type PromotionGiftSelectionMode = "all" | "choose_one";

export type PromotionRewardType =
  | "gift"
  | "discount_fixed"
  | "discount_percent"
  | "freeship";

export interface PromotionRow {
  id: string;
  name: string;
  description: string;
  conditionType: "lego_quantity" | "set_quantity";
  conditionMinQuantity: number;
  conditionMaxQuantity: number | null;
  applicableProductType: "lego" | "bear";
  applicableProductIds: string[];
  rewardTypes: PromotionRewardType[];
  rewardGiftSelectionMode: PromotionGiftSelectionMode;
  rewardGiftQuantityMode: PromotionGiftQuantityMode;
  rewardGifts: PromotionGift[];
  rewardDiscountValue: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionGiftForm {
  groupId: string;
  optionId: string;
  quantity: string;
}

export interface PromotionFormState {
  name: string;
  description: string;
  conditionType: "lego_quantity" | "set_quantity";
  conditionMinQuantity: string;
  conditionMaxQuantity: string;
  applicableProductType: "lego" | "bear";
  applicableProductIds: string[];
  rewardTypes: PromotionRewardType[];
  rewardGiftSelectionMode: PromotionGiftSelectionMode;
  rewardGiftQuantityMode: PromotionGiftQuantityMode;
  rewardGifts: PromotionGiftForm[];
  rewardDiscountValue: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ─── ADDON OPTIONS TAB TYPES ─────────────────────────────────────────────────
export type AddonOptionType = "basic" | "customizable";
export type AddonOptionFieldType = "image" | "link" | "text";

export interface AddonOptionField {
  label: string;
  fieldType: AddonOptionFieldType;
  placeholder: string;
  required: boolean;
  sortOrder: number;
}

export interface AddonOptionRow {
  id: string;
  name: string;
  description: string;
  optionType: AddonOptionType;
  price: number;
  applicableProductIds: string[];
  applicableProductType?: "lego" | "bear";
  fields: AddonOptionField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddonOptionFieldForm {
  label: string;
  fieldType: AddonOptionFieldType;
  placeholder: string;
  required: boolean;
}

export interface AddonOptionFormState {
  name: string;
  description: string;
  optionType: AddonOptionType;
  price: string;
  applicableProductIds: string[];
  applicableProductType: "lego" | "bear";
  fields: AddonOptionFieldForm[];
  isActive: boolean;
}

// ─── ORDERS TAB TYPES ───────────────────────────────────────────────────────
export type OrderStatus =
  | "received"
  | "consulting"
  | "waiting_demo"
  | "waiting_demo_confirm"
  | "waiting_payment"
  | "paid"
  | "designing"
  | "waiting_design_approval"
  | "producing"
  | "shipped"
  | "delivering"
  | "completed"
  | "complaint"
  | "handling_complaint"
  | "complaint_closed"
  | "closed"
  | "cancelled";

export type OrderProductType = "lego" | "bear";

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "received",
  "consulting",
  "waiting_demo",
  "waiting_demo_confirm",
  "waiting_payment",
  "paid",
  "designing",
  "waiting_design_approval",
  "producing",
  "shipped",
  "delivering",
  "completed",
  "complaint",
  "handling_complaint",
  "complaint_closed",
  "closed",
  "cancelled",
];

export const BEAR_EXCLUDED_STATUSES: OrderStatus[] = [
  "waiting_demo",
  "waiting_demo_confirm",
  "designing",
  "waiting_design_approval",
];

export type OrderShippingPayer = "customer" | "shop";

export interface OrderPricingSummary {
  subtotal: number;
  productDiscountTotal: number;
  orderDiscountTotal: number;
  shippingName: string;
  shippingFee: number;
  finalTotal: number;
}

export interface OrderCustomerInfoEntry {
  key: string;
  label: string;
  fieldType: CustomerOrderFieldType;
  placeholder: string;
  required: boolean;
  selectType?: CustomerOrderFieldSelectType;
  options: CustomerOrderFieldOption[];
  sortOrder: number;
  value: string | string[];
}

export interface OrderItemRow {
  cartItemId: string;
  collectionSlug: string;
  collectionName: string;
  productId: string;
  productName: string;
  productImage: string;
  categoryName: string;
  productSize: string;
  variantSymbol: string;
  backgroundName: string;
  totalLegoCount: number;
  selectedAdditionalLegoCount: number;
  customizationSubtotal: number;
  additionalOptionsPrice: number;
  subtotal: number;
  additionalOptionNames: string[];
  additionalOptionCount: number;
  payload: Record<string, unknown>;
}

export interface OrderAppliedGift {
  optionId: string;
  quantity: number;
}

export interface OrderProgressImages {
  demoImage: string;
  backgroundImage: string;
  completedProductImage: string;
}

export interface OrderRow {
  id: string;
  orderCode: string;
  dateKey: string;
  variantSymbol: string;
  status: OrderStatus;
  productType: OrderProductType;
  assignedTo: string;
  shippingPayer: OrderShippingPayer;
  itemsCount: number;
  pricingSummary: OrderPricingSummary;
  items: OrderItemRow[];
  customerInfoEntries: OrderCustomerInfoEntry[];
  appliedGifts: OrderAppliedGift[];
  progressImages: OrderProgressImages;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ─── BEAR VARIANT TAB TYPES ──────────────────────────────────────────────────
export interface BearVariant {
  id: string;
  collectionId: string;
  collectionName?: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  bearQuantity: number;
  allowVariableBearCount: boolean;
  bearCountMin: number;
  bearCountMax: number;
  additionalBearPrice: number;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  hasBackground: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface BearVariantForm {
  collectionId: string;
  categoryId: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  bearQuantity: string;
  allowVariableBearCount: boolean;
  bearCountMin: string;
  bearCountMax: string;
  additionalBearPrice: string;
  price: string;
  stockQuantity: string;
  lowStockThreshold: string;
  hasBackground: boolean;
  isActive: boolean;
}

// ─── BEAR CUSTOMIZATIONS TAB TYPES ───────────────────────────────────────────
export interface BearCustomizationOption {
  id: string;
  groupId: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  allowImageUpload: boolean;
  image: string;
  colorCode: string;
  isActive: boolean;
  updatedAt: string;
}

export interface BearCustomizationGroup {
  id: string;
  name: string;
  helper: string;
  isActive: boolean;
  optionCount: number;
  updatedAt: string;
  options: BearCustomizationOption[];
}

export interface BearCustomizationGroupForm {
  name: string;
  helper: string;
}

export interface BearCustomizationOptionForm {
  groupId: string;
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  lowStockThreshold: string;
  allowImageUpload: boolean;
  image: string;
  colorCode: string;
}
