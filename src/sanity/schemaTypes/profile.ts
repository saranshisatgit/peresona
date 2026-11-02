import { defineType, defineField } from 'sanity'

export const profile = defineType({
  name: 'profile',
  title: 'Author profile',
  type: 'document',
  icon: () => '👤',
  description:
    'The person behind the site. The photo is shown in the header and on the home page.',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      initialValue: 'Saransh Sharma',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
      description:
        'Your avatar — shown in the site header and at the top of the home page. Square works best.',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Optional short line shown next to your name.',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'tagline',
      media: 'photo',
    },
  },
})