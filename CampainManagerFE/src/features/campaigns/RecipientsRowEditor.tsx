import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { useFieldArray, useWatch } from 'react-hook-form';
import type { CampaignFormInputValues } from '@/features/campaigns/campaignFormSchema';
import { isValidRecipientEmail, isValidRecipientName } from '@/features/campaigns/campaignFormSchema';

const inputBase =
  'w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white outline-none ring-accent focus:ring-1';

const inputValid = 'font-validScript italic text-emerald-100';

type Props = {
  control: Control<CampaignFormInputValues>;
  register: UseFormRegister<CampaignFormInputValues>;
  errors: FieldErrors<CampaignFormInputValues>;
};

export function RecipientsRowEditor({ control, register, errors }: Props) {
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'recipients',
  });

  const rows = useWatch({ control, name: 'recipients' }) ?? [];

  const addRow = () => {
    append({ email: '', name: '' });
  };

  const removeRow = (index: number) => {
    if (fields.length <= 1) {
      replace([{ email: '', name: '' }]);
      return;
    }
    remove(index);
  };

  const clearAll = () => {
    if (!window.confirm('Remove all recipient rows?')) {
      return;
    }
    replace([{ email: '', name: '' }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/30"
          >
            Clear all
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl border border-ink-800 bg-ink-900/40"
        role="group"
        aria-labelledby="recipients-heading"
      >
        <h2 id="recipients-heading" className="sr-only">
          Recipients
        </h2>
        <div className="grid min-w-[520px] grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-2 border-b border-ink-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-mist">
          <span>Email</span>
          <span>Name (optional)</span>
          <span className="w-10 text-center"> </span>
        </div>
        <ul className="divide-y divide-ink-800">
          {fields.map((field, index) => {
            const emailVal = rows[index]?.email ?? '';
            const nameVal = rows[index]?.name ?? '';
            const emailOk = isValidRecipientEmail(emailVal);
            const nameOk = isValidRecipientName(nameVal);
            const emailErr = errors.recipients?.[index]?.email;
            const nameErr = errors.recipients?.[index]?.name;

            return (
              <li key={field.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2">
                <div>
                  <label htmlFor={`recip-email-${String(index)}`} className="sr-only">
                    Email row {String(index + 1)}
                  </label>
                  <input
                    id={`recip-email-${String(index)}`}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`${inputBase} ${emailOk ? inputValid : ''}`}
                    aria-invalid={!!emailErr}
                    aria-describedby={emailErr ? `recip-email-err-${String(index)}` : 'recipients-help'}
                    {...register(`recipients.${index}.email` as const)}
                  />
                  {emailErr && (
                    <p id={`recip-email-err-${String(index)}`} className="mt-1 text-xs text-red-400" role="alert">
                      {emailErr.message as string}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`recip-name-${String(index)}`} className="sr-only">
                    Name row {String(index + 1)}
                  </label>
                  <input
                    id={`recip-name-${String(index)}`}
                    type="text"
                    autoComplete="name"
                    placeholder="Display name"
                    className={`${inputBase} ${nameOk ? inputValid : ''}`}
                    aria-invalid={!!nameErr}
                    aria-describedby={nameErr ? `recip-name-err-${String(index)}` : undefined}
                    {...register(`recipients.${index}.name` as const)}
                  />
                  {nameErr && (
                    <p id={`recip-name-err-${String(index)}`} className="mt-1 text-xs text-red-400" role="alert">
                      {nameErr.message as string}
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    className="rounded-lg border border-ink-600 px-2 py-1.5 text-xs text-mist hover:border-red-800 hover:text-red-200"
                    onClick={() => removeRow(index)}
                    aria-label={`Remove recipient row ${String(index + 1)}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-ink-800 px-3 py-2">
          <button
            type="button"
            onClick={addRow}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-ink-600 text-lg text-mist hover:border-accent hover:text-accent"
            aria-label="Add another recipient row"
          >
            +
          </button>
        </div>
      </div>

      <p className="text-sm text-mist" aria-live="polite">
        {rows.filter((r) => r?.email?.trim()).length} recipient
        {rows.filter((r) => r?.email?.trim()).length === 1 ? '' : 's'} with email
      </p>
    </div>
  );
}
