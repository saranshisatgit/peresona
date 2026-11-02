import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

export const config = defineConfig({
  name: 'saranshsharma-me',
  title: 'Saransh Sharma',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Author profile')
              .icon(() => '👤')
              .child(S.documentTypeList('profile')),
            S.divider(),
            S.documentTypeListItem('page').title('Pages'),
            S.documentTypeListItem('article').title('Articles'),
            S.documentTypeListItem('project').title('Projects'),
            S.documentTypeListItem('experience').title('Experience'),
            S.documentTypeListItem('tool').title('Tools'),
            S.documentTypeListItem('socialLink').title('Social links'),
            S.divider(),
            S.documentTypeListItem('subscriber').title('Subscribers'),
            S.documentTypeListItem('siteContent').title('Site content (key/value)'),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})