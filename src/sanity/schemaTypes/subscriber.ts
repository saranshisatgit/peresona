import { defineType, defineField } from 'sanity'

export const subscriber = defineType({
  name: 'subscriber',
  title: 'Subscriber',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.required().email(),
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
      name: 'mailboxKey',
      title: 'Mailbox key',
      type: 'string',
      description:
        'Canonical inbox identity (Gmail dots/+tags stripped). Used for anti-abuse rate limiting.',
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
      title: 'email',
      subtitle: 'status',
    },
  },
})
