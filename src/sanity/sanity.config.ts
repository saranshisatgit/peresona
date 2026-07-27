import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

export const config = defineConfig({
  name: 'saranshsharma-me',
  title: 'Saransh Sharma',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
