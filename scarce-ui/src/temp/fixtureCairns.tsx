/**
 * @packageDocumentation
 * TEMPORARY: hardcoded cairns for previewing the card UI under F5. Remove together
 * with the `TEMP-FIXTURE` lines in `app.tsx` when real data is wired in.
 */

import type { Cairn } from '@models/cairn';
import { Button } from '@/components/button';
import { CairnList } from '@/components/cairnList';

/**
 * Sample cairns covering every severity, one-line and multi-line ranges, a long
 * directory, a file at the root, a long comment and a snippet longer than the
 * collapsed preview. Deliberately unsorted so the list sorting is visible.
 */
export const FIXTURE_CAIRNS: Cairn[] = [
  {
    id: 'fixture-1',
    rootPath: '/repo',
    filePath: 'src/utils/format.ts',
    codeSnippet: 'export const pad = (n: number) => String(n).padStart(2, "0");',
    lineRange: [11, 11],
    comment: 'Normal severity: single line, short comment.',
    severity: 'normal',
  },
  {
    id: 'fixture-2',
    rootPath: '/repo',
    filePath: 'src/payments/stripe/webhooks/handlers/invoicePaid.ts',
    codeSnippet: [
      'export async function handleInvoicePaid(event: Stripe.Event) {',
      '  const invoice = event.data.object as Stripe.Invoice;',
      '  const customer = await getCustomer(invoice.customer as string);',
      '  await markSubscriptionActive(customer.id);',
      '  await sendReceipt(customer.email, invoice.hosted_invoice_url);',
      '}',
    ].join('\n'),
    lineRange: [41, 46],
    comment:
      'Critical severity: not idempotent. Stripe retries webhooks, so a repeated event sends a second receipt. Add an event-id check before doing any work, and make sure the check and the write happen together.',
    severity: 'critical',
  },
  {
    id: 'fixture-3',
    rootPath: '/repo',
    filePath: 'README.md',
    codeSnippet: '## Installation\n\nRun the installer.',
    lineRange: [0, 2],
    comment: 'Normal severity: file at the repo root.',
    severity: 'normal',
  },
  {
    id: 'fixture-4',
    rootPath: '/repo',
    filePath: 'src/auth/session.ts',
    codeSnippet: 'if (token.expiresAt < Date.now()) {\n  return refresh(token);\n}',
    lineRange: [87, 89],
    comment: 'High severity: refresh can race when two tabs expire together.',
    severity: 'high',
  },
  {
    id: 'fixture-5',
    rootPath: '/repo',
    filePath: 'src/db/migrations/20240101_add_index.sql',
    codeSnippet: 'CREATE INDEX CONCURRENTLY idx_orders_user ON orders (user_id);',
    lineRange: [3, 3],
    comment: 'Critical severity: locks the table on older Postgres versions.',
    severity: 'critical',
  },
];

/**
 * TEMPORARY: renders {@link FIXTURE_CAIRNS} with inert Edit and Delete buttons so
 * the cards can be reviewed without any real data.
 *
 * @returns The fixture list.
 */
export function FixtureCairnList() {
  return (
    <CairnList
      cairns={FIXTURE_CAIRNS}
      onNavigate={() => undefined}
      renderActions={() => (
        <>
          <Button type="button" variant="ghost" size="xs">
            Edit
          </Button>
          <Button type="button" variant="ghost" size="xs">
            Delete
          </Button>
        </>
      )}
    />
  );
}
