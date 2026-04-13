export type GlobalRecipient = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type RecipientListResponse = {
  items: GlobalRecipient[];
  next_cursor: string | null;
};
