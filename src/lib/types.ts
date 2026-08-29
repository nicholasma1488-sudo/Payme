export type Role = "user" | "admin";

export type User = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: Role;
  balancePayme: number;
  displayCurrency: string;
  createdAt: number;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: Role;
};

export type Transaction = {
  id: string;
  fromUserId: string | null;
  toUserId: string | null;
  amountPayme: number;
  type: "pay" | "exchange_in" | "exchange_out" | "auction" | "adjust";
  note: string | null;
  fiatAmount: number | null;
  fiatCurrency: string | null;
  createdAt: number;
  fromUsername?: string | null;
  toUsername?: string | null;
};

export type Listing = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  pricePayme: number;
  imagePaths: string[];
  status: "active" | "sold";
  buyerId: string | null;
  createdAt: number;
  sellerUsername?: string;
  buyerUsername?: string | null;
};

export type Conversation = {
  id: string;
  type: "dm" | "support";
  createdAt: number;
  title?: string;
  otherUsername?: string | null;
  lastMessage?: string | null;
  lastAt?: number | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: number;
  senderUsername?: string;
};

export type RatesSnapshot = {
  base: "USD";
  updatedAt: number;
  usd: Record<string, number>;
  cnyPerPayme: number;
};
