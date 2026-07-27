import { defineType, defineField } from 'sanity'

export const siteContent = defineType({
  name: 'siteContent',
  title: 'Site Content',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      validation: (rule) => rule.required(),
      description: 'Unique identifier (e.g. home_heading, about_title, global_avatar)',
    }),
    defineField({
      name: 'value',
      title: 'Value',
      type: 'text',
      rows: 3,
      description: 'Text content for this key',
    }),
    defineField({
      name: 'image',
      title: 'Image (if applicable)',
      type: 'image',
      options: { hotspot: false },
      description: 'For image-type keys, upload an image here instead of using the text value',
    }),
  ],
  preview: {
    select: {
      title: 'key',
      subtitle: 'value',
    },
  },
})
