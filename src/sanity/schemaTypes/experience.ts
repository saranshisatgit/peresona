import { defineType, defineField } from 'sanity'

export const experience = defineType({
  name: 'experience',
  title: 'Experience',
  type: 'document',
  fields: [
    defineField({ name: 'company', title: 'Company', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'title', title: 'Job Title', type: 'string' }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'string',
      description: 'Logo key (e.g. planetaria) or image URL',
    }),
    defineField({ name: 'start', title: 'Start', type: 'string', description: 'e.g. 2021' }),
    defineField({ name: 'end', title: 'End', type: 'string', description: 'e.g. 2024 or current year for Present' }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'company',
      subtitle: 'title',
    },
  },
})
