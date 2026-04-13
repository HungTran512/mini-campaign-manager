import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  deleteCampaign,
  fetchCampaignDetail,
  fetchCampaignStats,
  patchCampaign,
  scheduleCampaign,
  sendCampaign,
} from '@/features/campaigns/campaignApi';
import { campaignKeys } from '@/features/campaigns/queries';
import type { CampaignDetail } from '@/features/campaigns/types';
import { RecipientTable } from '@/features/campaigns/components/RecipientTable';
import { StatsPanel } from '@/features/campaigns/components/StatsPanel';
import { StatusBadge } from '@/features/campaigns/components/StatusBadge';
import { usePageH1Focus } from '@/hooks/usePageH1Focus';
import { ApiError } from '@/lib/apiClient';

const scheduleFormSchema = z
  .object({
    local: z.string().min(1, 'Pick a date and time'),
  })
  .superRefine((v, ctx) => {
    const ms = new Date(v.local).getTime();
    if (Number.isNaN(ms)) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date', path: ['local'] });
      return;
    }
    if (ms <= Date.now()) {
      ctx.addIssue({ code: 'custom', message: 'Must be in the future', path: ['local'] });
    }
  });

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

const patchSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  subject: z.string().min(1).max(500).trim(),
  body: z.string().min(1).max(100_000),
});

type PatchForm = z.infer<typeof patchSchema>;

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const detailQ = useQuery({
    queryKey: campaignKeys.detail(id ?? '__none__'),
    queryFn: ({ signal }) => fetchCampaignDetail(id!, signal),
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const is404 =
    detailQ.isError && detailQ.error instanceof ApiError && detailQ.error.status === 404;

  const statsQ = useQuery({
    queryKey: campaignKeys.stats(id ?? '__none__'),
    queryFn: ({ signal }) => fetchCampaignStats(id!, signal),
    enabled: !!id && detailQ.isSuccess && !is404,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const campaign = detailQ.data;
  const h1Ref = usePageH1Focus([campaign?.id, campaign?.name]);

  const patchForm = useForm<PatchForm>({
    resolver: zodResolver(patchSchema),
    defaultValues: { name: '', subject: '', body: '' },
  });

  useEffect(() => {
    if (campaign) {
      patchForm.reset({
        name: campaign.name,
        subject: campaign.subject,
        body: campaign.body,
      });
    }
  }, [campaign?.id, campaign?.updated_at, campaign?.name, campaign?.subject, campaign?.body, patchForm]);

  useEffect(() => {
    if (scheduleOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [scheduleOpen]);

  const scheduleForm = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: { local: '' },
  });

  const patchMut = useMutation({
    mutationFn: (body: PatchForm) => patchCampaign(id!, body),
    onSuccess: async () => {
      toast.success('Draft saved');
      await queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id!) });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.lists(), exact: false });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : 'Save failed', {
        action: { label: 'Try again', onClick: () => patchMut.mutate(patchForm.getValues()) },
      });
    },
  });

  const scheduleMut = useMutation({
    mutationFn: (local: string) =>
      scheduleCampaign(id!, new Date(local).toISOString()),
    onMutate: async (local) => {
      await queryClient.cancelQueries({ queryKey: campaignKeys.detail(id!) });
      const prev = queryClient.getQueryData<CampaignDetail>(campaignKeys.detail(id!));
      if (prev) {
        queryClient.setQueryData<CampaignDetail>(campaignKeys.detail(id!), {
          ...prev,
          status: 'scheduled',
          scheduled_at: new Date(local).toISOString(),
        });
      }
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(campaignKeys.detail(id!), ctx.prev);
      }
      toast.error(e instanceof ApiError ? e.message : 'Schedule failed', {
        action: {
          label: 'Try again',
          onClick: () => scheduleMut.mutate(scheduleForm.getValues('local')),
        },
      });
    },
    onSuccess: async () => {
      toast.success('Scheduled');
      setScheduleOpen(false);
      scheduleForm.reset();
      await queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id!) });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.stats(id!) });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.lists(), exact: false });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.dashboard() });
    },
  });

  const sendMut = useMutation({
    mutationFn: () => sendCampaign(id!),
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : 'Send failed', {
        action: { label: 'Try again', onClick: () => sendMut.mutate() },
      });
    },
    onSuccess: async () => {
      toast.success('Campaign sent');
      await queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id!) });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.stats(id!) });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.lists(), exact: false });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.dashboard() });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCampaign(id!),
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : 'Delete failed', {
        action: { label: 'Try again', onClick: () => deleteMut.mutate() },
      });
    },
    onSuccess: async () => {
      toast.success('Campaign deleted');
      await queryClient.invalidateQueries({ queryKey: campaignKeys.lists(), exact: false });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.dashboard() });
      navigate('/campaigns', { replace: true });
    },
  });

  if (!id) {
    return null;
  }

  if (detailQ.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-ink-800" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-ink-800/80" />
      </div>
    );
  }

  if (is404) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-white">Campaign not found</h1>
        <p className="mt-2 text-sm text-mist">
          This campaign does not exist or is no longer available.
        </p>
        <Link to="/campaigns" className="mt-6 inline-block text-accent hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (detailQ.isError || !campaign) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-red-200" role="alert">
        {detailQ.error instanceof ApiError ? detailQ.error.message : 'Failed to load campaign'}
        <div className="mt-4">
          <button
            type="button"
            className="rounded border border-red-800 px-3 py-1 text-sm"
            onClick={() => void detailQ.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const canEdit = campaign.status === 'draft';
  const canSchedule = campaign.status === 'draft' || campaign.status === 'scheduled';
  const canSend = campaign.status === 'draft' || campaign.status === 'scheduled';
  const canDelete = campaign.status === 'draft';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs uppercase tracking-wide text-mist">
        <Link to="/dashboard" className="hover:text-accent">
          Dashboard
        </Link>
        {' · '}
        <Link to="/campaigns" className="hover:text-accent">
          Campaigns
        </Link>{' '}
        / detail
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-display text-3xl text-white outline-none"
        >
          {campaign.name}
        </h1>
        <StatusBadge status={campaign.status} />
      </div>
      <p className="mt-2 text-sm text-mist">Subject: {campaign.subject}</p>
      <p className="mt-1 text-xs text-mist/80">
        Updated {new Date(campaign.updated_at).toLocaleString()}
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {canSend && (
          <button
            type="button"
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={sendMut.isPending}
            onClick={() => sendMut.mutate()}
            aria-busy={sendMut.isPending}
          >
            {sendMut.isPending ? 'Sending…' : 'Send now'}
          </button>
        )}
        {canSchedule && (
          <button
            type="button"
            className="rounded-lg border border-sky-700 px-4 py-2 text-sm text-sky-100 hover:bg-sky-950/50"
            onClick={() => setScheduleOpen(true)}
          >
            Schedule…
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="rounded-lg border border-red-900/60 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40 disabled:opacity-50"
            disabled={deleteMut.isPending}
            onClick={() => {
              if (window.confirm('Delete this draft? This cannot be undone from the UI.')) {
                deleteMut.mutate();
              }
            }}
            aria-busy={deleteMut.isPending}
          >
            Delete
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 text-mist backdrop:bg-black/70"
        onClose={() => setScheduleOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={scheduleForm.handleSubmit((v) => scheduleMut.mutate(v.local))}
        >
          <h2 className="text-lg font-semibold text-white">Schedule send</h2>
          <div>
            <label htmlFor="sched-local" className="block text-sm">
              Local date & time
            </label>
            <input
              id="sched-local"
              type="datetime-local"
              className="mt-1 w-full rounded border border-ink-600 bg-ink-950 px-2 py-2 text-white"
              {...scheduleForm.register('local')}
            />
            {scheduleForm.formState.errors.local && (
              <p className="mt-1 text-sm text-red-400">{scheduleForm.formState.errors.local.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded border border-ink-600 px-3 py-1.5 text-sm"
              onClick={() => setScheduleOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scheduleMut.isPending}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-ink-950 disabled:opacity-50"
            >
              {scheduleMut.isPending ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </form>
      </dialog>

      {detailQ.isSuccess && !is404 && (
        <section className="mt-8" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="mb-3 text-lg font-medium text-white">
            Statistics
          </h2>
          {statsQ.isLoading && (
            <div
              className="h-36 animate-pulse rounded-xl border border-ink-800 bg-ink-800/60"
              aria-busy="true"
              aria-label="Loading statistics"
            />
          )}
          {statsQ.isError && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-200" role="alert">
              {statsQ.error instanceof ApiError ? statsQ.error.message : 'Failed to load statistics'}
              <button
                type="button"
                className="ml-3 underline"
                onClick={() => void statsQ.refetch()}
              >
                Retry
              </button>
            </div>
          )}
          {statsQ.data && <StatsPanel stats={statsQ.data} />}
        </section>
      )}

      {canEdit && (
        <section className="mt-10 rounded-xl border border-ink-800 bg-ink-900/40 p-6">
          <h2 className="text-lg font-medium text-white">Edit draft</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={patchForm.handleSubmit((v) => patchMut.mutate(v))}
          >
            <div>
              <label htmlFor="p-name" className="block text-sm text-mist">
                Name
              </label>
              <input id="p-name" className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-2 py-2 text-white" {...patchForm.register('name')} />
              {patchForm.formState.errors.name && (
                <p className="mt-1 text-sm text-red-400">{patchForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="p-subject" className="block text-sm text-mist">
                Subject
              </label>
              <input id="p-subject" className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-2 py-2 text-white" {...patchForm.register('subject')} />
            </div>
            <div>
              <label htmlFor="p-body" className="block text-sm text-mist">
                Body
              </label>
              <textarea id="p-body" rows={6} className="mt-1 w-full rounded border border-ink-700 bg-ink-950 px-2 py-2 font-mono text-sm text-white" {...patchForm.register('body')} />
            </div>
            <button
              type="submit"
              disabled={patchMut.isPending}
              className="rounded-lg bg-ink-700 px-4 py-2 text-sm text-white hover:bg-ink-600 disabled:opacity-50"
            >
              {patchMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">Email body</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-ink-800 bg-ink-950/80 p-4 font-mono text-sm text-mist">
          {campaign.body}
        </pre>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-white">Recipients ({campaign.recipients.length})</h2>
        <div className="mt-4">
          <RecipientTable recipients={campaign.recipients} />
        </div>
      </section>
    </div>
  );
}
