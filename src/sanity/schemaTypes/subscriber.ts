import { defineType, defineField } from 'sanity'

export const subscriber = defineType({
  name: 'subscriber',
  title: 'Subscriber',
  type: 'document',
  fields: [
    defineField({
      name: 'emailHash',
      title: 'Email hash',
      type: 'string',
      description:
        'HMAC of the email — the only lookup key. The address itself is in emailEnc (sealed) and shown masked below.',
      readOnly: true,
    }),
    defineField({
      name: 'emailEnc',
      title: 'Email (encrypted)',
      type: 'text',
      description:
        'AES-256-GCM sealed address. Only the site server can open it.',
      readOnly: true,
    }),
    defineField({
      name: 'emailMasked',
      title: 'Email (masked)',
      type: 'string',
      description: 'Safe display form, e.g. uf•••••@gmail.com',
      readOnly: true,
    }),
    defineField({ name: 'name', title: 'Name', type: 'string' }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Inactive', value: 'inactive' },
          { title: 'Blocked (spam)', value: 'blocked' },
        ],
      },
      initialValue: 'active',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      initialValue: 'website',
    }),
    defineField({
      name: 'mailboxKeyHash',
      title: 'Mailbox key hash',
      type: 'string',
      description:
        'HMAC of the canonical inbox identity (Gmail dots/+tags stripped) — used for anti-abuse rate limiting.',
      readOnly: true,
    }),
    defineField({
      name: 'lastEmailSentAt',
      title: 'Last email sent at',
      type: 'datetime',
      description: 'Timestamp of the last verification email actually sent.',
      readOnly: true,
    }),
    defineField({
      name: 'sentEmailCount',
      title: 'Emails sent',
      type: 'number',
      initialValue: 0,
      description: 'Total verification emails sent to this address.',
      readOnly: true,
    }),
    defineField({
      name: 'signupIpHash',
      title: 'Signup IP hash',
      type: 'string',
      description: 'HMAC of the signup IP. Used for per-IP rate limiting.',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'emailMasked',
      subtitle: 'status',
    },
  },
})
