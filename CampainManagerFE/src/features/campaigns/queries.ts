export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  listRoot: (limit: number) => [...campaignKeys.lists(), { limit }] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
  stats: (id: string) => [...campaignKeys.all, 'stats', id] as const,
  dashboard: () => [...campaignKeys.all, 'dashboard'] as const,
};
