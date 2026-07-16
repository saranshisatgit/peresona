export type FieldType = 'text' | 'textarea' | 'email' | 'image'

export interface ContentField {
  key: string
  label: string
  page: string
  type: FieldType
}

export const contentSchema: ContentField[] = [
  // Global
  { key: 'global_avatar', label: 'Header Avatar', page: 'global', type: 'image' },

  // Home
  { key: 'home_heading', label: 'Heading', page: 'home', type: 'text' },
  { key: 'home_description', label: 'Description', page: 'home', type: 'textarea' },
  { key: 'home_photo_1', label: 'Photo 1', page: 'home', type: 'image' },
  { key: 'home_photo_2', label: 'Photo 2', page: 'home', type: 'image' },
  { key: 'home_photo_3', label: 'Photo 3', page: 'home', type: 'image' },
  { key: 'home_photo_4', label: 'Photo 4', page: 'home', type: 'image' },
  { key: 'home_photo_5', label: 'Photo 5', page: 'home', type: 'image' },

  // About
  { key: 'about_title', label: 'Title', page: 'about', type: 'text' },
  { key: 'about_email', label: 'Contact Email', page: 'about', type: 'email' },
  { key: 'about_paragraphs', label: 'Bio (HTML)', page: 'about', type: 'textarea' },
  { key: 'about_portrait', label: 'Portrait Image', page: 'about', type: 'image' },

  // Projects
  { key: 'projects_title', label: 'Title', page: 'projects', type: 'text' },
  { key: 'projects_intro', label: 'Intro', page: 'projects', type: 'textarea' },

  // Uses
  { key: 'uses_title', label: 'Title', page: 'uses', type: 'text' },
  { key: 'uses_intro', label: 'Intro', page: 'uses', type: 'textarea' },

  // Articles
  { key: 'articles_title', label: 'Title', page: 'articles', type: 'text' },
  { key: 'articles_intro', label: 'Intro', page: 'articles', type: 'textarea' },
]

export const pageLabels: Record<string, string> = {
  global: 'Global (All Pages)',
  home: 'Homepage',
  about: 'About',
  projects: 'Projects',
  uses: 'Uses',
  articles: 'Articles',
}

export const pageOrder = ['global', 'home', 'about', 'projects', 'uses', 'articles']

export const contentKeys = contentSchema.map((f) => f.key)

export function getFieldsByPage(): Record<string, ContentField[]> {
  const groups: Record<string, ContentField[]> = {}
  for (const field of contentSchema) {
    if (!groups[field.page]) groups[field.page] = []
    groups[field.page].push(field)
  }
  return groups
}
