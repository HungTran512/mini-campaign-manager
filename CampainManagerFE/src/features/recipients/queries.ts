export const recipientKeys = {
  all: ['recipients'] as const,
  lists: () => [...recipientKeys.all, 'list'] as const,
  listRoot: (limit: number) => [...recipientKeys.lists(), { limit }] as const,
};
