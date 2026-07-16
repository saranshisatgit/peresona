import { Card } from '@/components/Card'
import { Section } from '@/components/Section'
import { SimpleLayout } from '@/components/SimpleLayout'
import { getSiteContent, getTools } from '@/lib/api'

export const dynamic = 'force-dynamic'

function ToolsSection({ children, ...props }: React.ComponentPropsWithoutRef<typeof Section>) {
  return (<Section {...props}><ul role="list" className="space-y-16">{children}</ul></Section>)
}

function Tool({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <Card as="li">
      <Card.Title as="h3" href={href}>{title}</Card.Title>
      <Card.Description>{children}</Card.Description>
    </Card>
  )
}

export const metadata = {
  title: 'Uses',
  description: 'Software I use, gadgets I love, and other things I recommend.',
}

export default async function Uses() {
  let [content, tools] = await Promise.all([
    getSiteContent(),
    getTools(),
  ])

  const title = content.uses_title || 'Software I use, gadgets I love, and other things I recommend.'
  const intro = content.uses_intro || "I get asked a lot about the things I use to build software, stay productive, or buy to fool myself into thinking I'm being productive when I'm really just procrastinating."

  const sections = tools.reduce<Record<string, typeof tools>>((acc, tool) => {
    if (!acc[tool.section]) acc[tool.section] = []
    acc[tool.section].push(tool)
    return acc
  }, {})

  return (
    <SimpleLayout title={title} intro={intro}>
      <div className="space-y-20">
        {Object.entries(sections).map(([sectionName, sectionTools]) => (
          <ToolsSection key={sectionName} title={sectionName}>
            {sectionTools.map((tool) => (
              <Tool key={tool.title} title={tool.title} href={tool.url || undefined}>
                {tool.description}
              </Tool>
            ))}
          </ToolsSection>
        ))}
      </div>
    </SimpleLayout>
  )
}
