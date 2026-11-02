import { sanityClient } from '@/sanity/lib/client'
import imageUrlBuilder from '@sanity/image-url'

const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: any, width?: number): string {
  let img = builder.image(source)
  if (width) img = img.width(width)
  return img.url()
}

export async function getSiteContent(): Promise<Record<string, string>> {
  try {
    const docs = await sanityClient.fetch<any[]>(`
      *[_type == "siteContent"] {
        key,
        value,
        image
      }
    `)

    const map: Record<string, string> = {}
    for (const doc of docs) {
      if (doc.image) {
        map[doc.key] = urlFor(doc.image, 1200)
      } else {
        map[doc.key] = doc.value || ''
      }
    }

    // The author profile (edited in the studio under "Author profile") is the
    // canonical source for the header/home avatar. Falls back to the legacy
    // `global_avatar` siteContent key when no profile document exists yet.
    const profileDoc = await sanityClient.fetch<any>(
      `*[_type == "profile"][0] { photo }`,
    )
    if (profileDoc?.photo) {
      map.global_avatar = urlFor(profileDoc.photo, 400)
    }

    return map
  } catch {
    return {}
  }
}

export interface ExperienceItem {
  company: string
  title: string
  logo: string
  start: string
  end: string
  sort_order: number
}

export async function getExperience(): Promise<ExperienceItem[]> {
  try {
    const docs = await sanityClient.fetch<ExperienceItem[]>(`
      *[_type == "experience"] | order(sortOrder asc) {
        company,
        title,
        logo,
        start,
        end,
        "sort_order": sortOrder
      }
    `)
    return docs.map((doc) => ({
      company: doc.company,
      title: doc.title || '',
      logo: doc.logo || '',
      start: doc.start || '',
      end: doc.end || '',
      sort_order: doc.sort_order || 0,
    }))
  } catch {
    return []
  }
}

export interface ProjectItem {
  name: string
  description: string
  url: string
  label: string
  logo: string
  sort_order: number
}

export async function getProjects(): Promise<ProjectItem[]> {
  try {
    const docs = await sanityClient.fetch<ProjectItem[]>(`
      *[_type == "project"] | order(sortOrder asc) {
        name,
        description,
        url,
        label,
        logo,
        "sort_order": sortOrder
      }
    `)
    return docs.map((doc) => ({
      name: doc.name,
      description: doc.description || '',
      url: doc.url || '',
      label: doc.label || '',
      logo: doc.logo || '',
      sort_order: doc.sort_order || 0,
    }))
  } catch {
    return []
  }
}

export interface ToolItem {
  section: string
  title: string
  description: string
  url: string
  sort_order: number
}

export async function getTools(): Promise<ToolItem[]> {
  try {
    const docs = await sanityClient.fetch<ToolItem[]>(`
      *[_type == "tool"] | order(sortOrder asc) {
        section,
        title,
        description,
        url,
        "sort_order": sortOrder
      }
    `)
    return docs.map((doc) => ({
      section: doc.section || '',
      title: doc.title,
      description: doc.description || '',
      url: doc.url || '',
      sort_order: doc.sort_order || 0,
    }))
  } catch {
    return []
  }
}

export interface SocialLink {
  platform: string
  url: string
  label: string
  sort_order: number
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  try {
    const docs = await sanityClient.fetch<SocialLink[]>(`
      *[_type == "socialLink"] | order(sortOrder asc) {
        platform,
        url,
        label,
        "sort_order": sortOrder
      }
    `)
    return docs.map((doc) => ({
      platform: doc.platform,
      url: doc.url,
      label: doc.label || '',
      sort_order: doc.sort_order || 0,
    }))
  } catch {
    return []
  }
}
