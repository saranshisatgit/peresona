import { Client, Databases } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!)

const databases = new Databases(client)

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!

function col(id: string | undefined): string {
  if (!id) throw new Error(`Missing collection ID`)
  return id
}

const SITE_CONTENT = col(process.env.APPWRITE_SITE_CONTENT_COLLECTION_ID)
const EXPERIENCE = col(process.env.APPWRITE_EXPERIENCE_COLLECTION_ID)
const PROJECTS = col(process.env.APPWRITE_PROJECTS_COLLECTION_ID)
const TOOLS = col(process.env.APPWRITE_TOOLS_COLLECTION_ID)
const SOCIAL_LINKS = col(process.env.APPWRITE_SOCIAL_LINKS_COLLECTION_ID)

export async function getSiteContent(): Promise<Record<string, string>> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, SITE_CONTENT)
    const map: Record<string, string> = {}
    for (const doc of response.documents as any[]) {
      map[doc.key] = doc.value
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
    const response = await databases.listDocuments(DATABASE_ID, EXPERIENCE)
    return (response.documents as any[])
      .map((doc) => ({
        company: doc.company,
        title: doc.title,
        logo: doc.logo,
        start: doc.start,
        end: doc.end,
        sort_order: doc.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)
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
    const response = await databases.listDocuments(DATABASE_ID, PROJECTS)
    return (response.documents as any[])
      .map((doc) => ({
        name: doc.name,
        description: doc.description,
        url: doc.url,
        label: doc.label,
        logo: doc.logo,
        sort_order: doc.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)
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
    const response = await databases.listDocuments(DATABASE_ID, TOOLS)
    return (response.documents as any[])
      .map((doc) => ({
        section: doc.section,
        title: doc.title,
        description: doc.description,
        url: doc.url,
        sort_order: doc.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)
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
    const response = await databases.listDocuments(DATABASE_ID, SOCIAL_LINKS)
    return (response.documents as any[])
      .map((doc) => ({
        platform: doc.platform,
        url: doc.url,
        label: doc.label,
        sort_order: doc.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)
  } catch {
    return []
  }
}
