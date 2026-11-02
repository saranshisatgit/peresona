import { defineField, defineType } from 'sanity'
import { NotionEditor } from '@/sanity/components/NotionEditor'
import { ShareLinkField } from '@/sanity/components/ShareLinkField'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: () => '📄',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'sharing', title: 'Sharing' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'sharing',
      options: { source: 'title' },
      description:
        'This page is shared with your friends at /p/{slug} on the website.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'emoji',
      title: 'Emoji icon',
      type: 'string',
      group: 'content',
      description:
        'Optional Notion-style emoji shown next to the title. Pick one: ✨ 🚀 📝 🎉 …',
    }),
    defineField({
      name: 'cover',
      title: 'Cover image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'string',
      group: 'content',
      description:
        'Notion-style editor — type "/" for blocks, drag the ⋮⋮ handle to move things around.',
      components: { input: NotionEditor },
    }),
    defineField({
      name: 'published',
      title: 'Share with a link',
      type: 'boolean',
      group: 'sharing',
      initialValue: false,
      description:
        'When enabled, the page is publicly accessible at /p/{slug}. Anyone with the link can view it.',
    }),
    defineField({
      name: 'shareLink',
      title: 'Share link',
      type: 'string',
      group: 'sharing',
      readOnly: true,
      hidden: ({ document }) =>
        !(document?.slug as { current?: string } | undefined)?.current,
      components: { field: ShareLinkField },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      emoji: 'emoji',
      slug: 'slug.current',
      published: 'published',
    },
    prepare({ title, emoji, slug, published }) {
      return {
        title: emoji ? `${emoji} ${title ?? 'Untitled'}` : (title ?? 'Untitled'),
        subtitle: `/p/${slug ?? '…'}${published ? '' : ' · not shared yet'}`,
      }
    },
  },
})