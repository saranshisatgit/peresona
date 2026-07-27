import { defineType, defineField } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
    defineField({ name: 'url', title: 'URL', type: 'url' }),
    defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. github.com/username/project' }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'string',
      description: 'Logo key (e.g. planetaria) or image URL',
    }),
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
      title: 'name',
      subtitle: 'description',
    },
  },
})
