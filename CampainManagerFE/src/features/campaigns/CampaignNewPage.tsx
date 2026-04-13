import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createCampaign } from '@/features/campaigns/campaignApi';
import {
  campaignFormInputSchema,
  toApiPayload,
  type CampaignFormInputValues,
} from '@/features/campaigns/campaignFormSchema';
import { RecipientsRowEditor } from '@/features/campaigns/RecipientsRowEditor';
import { campaignKeys } from '@/features/campaigns/queries';
import { recipientKeys } from '@/features/recipients/queries';
import { usePageH1Focus } from '@/hooks/usePageH1Focus';
import { ApiError } from '@/lib/apiClient';

export function CampaignNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const h1Ref = usePageH1Focus([]);

  const form = useForm<CampaignFormInputValues>({
    resolver: zodResolver(campaignFormInputSchema),
    defaultValues: {
      name: '',
      subject: '',
      body: '',
      recipients: [{ email: '', name: '' }],
    },
  });

  const mutation = useMutation({
    mutationFn: (body: CampaignFormInputValues) => {
      return createCampaign(toApiPayload(body));
    },
    onSuccess: async (data) => {
      toast.success('Campaign created');
      await queryClient.invalidateQueries({ queryKey: campaignKeys.lists(), exact: false });
      await queryClient.invalidateQueries({ queryKey: campaignKeys.dashboard() });
      await queryClient.invalidateQueries({ queryKey: recipientKeys.lists(), exact: false });
      navigate(`/campaigns/${data.id}`, { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400 && err.details) {
        form.setError('root', { message: 'Validation failed — check fields.' });
        toast.error(err.message);
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Create failed';
      toast.error(msg, {
        action: { label: 'Try again', onClick: () => mutation.mutate(form.getValues()) },
      });
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs text-mist">
        <Link to="/dashboard" className="hover:text-accent">
          Dashboard
        </Link>
        {' · '}
        <Link to="/campaigns" className="hover:text-accent">
          Campaigns
        </Link>{' '}
        / new
      </p>
      <h1
        ref={h1Ref}
        tabIndex={-1}
        className="mt-2 font-display text-3xl text-white outline-none"
      >
        New campaign
      </h1>
      <p className="mt-2 text-sm text-mist">Recipients: one column for email, one for name — add rows with +.</p>

      <form
        className="mt-8 space-y-6"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="c-name" className="block text-sm font-medium text-mist">
            Name
          </label>
          <input
            id="c-name"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.name}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="c-subject" className="block text-sm font-medium text-mist">
            Subject
          </label>
          <input
            id="c-subject"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.subject}
            {...form.register('subject')}
          />
          {form.formState.errors.subject && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.subject.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="c-body" className="block text-sm font-medium text-mist">
            Body
          </label>
          <textarea
            id="c-body"
            rows={8}
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-sm text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.body}
            {...form.register('body')}
          />
          {form.formState.errors.body && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.body.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-mist">Recipients</label>
          <RecipientsRowEditor control={form.control} register={form.register} errors={form.formState.errors} />
          {(() => {
            const rec = form.formState.errors.recipients;
            const msg =
              rec && typeof rec === 'object' && 'message' in rec && typeof rec.message === 'string'
                ? rec.message
                : undefined;
            return msg ? (
              <p className="mt-2 text-sm text-red-400" role="alert">
                {msg}
              </p>
            ) : null;
          })()}
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-red-400" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent-dim disabled:opacity-60"
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? 'Creating…' : 'Create campaign'}
        </button>
      </form>
    </div>
  );
}
