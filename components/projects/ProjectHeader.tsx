import React from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ProjectHeaderProps {
  title: string
  subtitle?: string
  loading?: boolean
  backUrl?: string
  actions?: React.ReactNode
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  title,
  subtitle,
  loading = false,
  backUrl = '/dashboard',
  actions
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b mb-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {title}
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2 ml-auto">
          {actions}
        </div>
      )}
    </div>
  )
}

export default ProjectHeader
