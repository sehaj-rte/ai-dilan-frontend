'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Calendar, 
  Users, 
  MessageSquare, 
  Mic, 
  User, 
  Settings 
} from 'lucide-react'
import Link from 'next/link'

interface ComingSoonPageProps {
  title: string
  description: string
  icon?: React.ReactNode
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ 
  title, 
  description,
  icon 
}) => {
  const getIcon = () => {
    switch (title.toLowerCase()) {
      case 'conversations':
        return <MessageSquare className="h-12 w-12 text-blue-500" />
      case 'voice studio':
        return <Mic className="h-12 w-12 text-purple-500" />
      case 'profile':
        return <User className="h-12 w-12 text-green-500" />
      case 'settings':
        return <Settings className="h-12 w-12 text-gray-500" />
      default:
        return icon || <Clock className="h-12 w-12 text-blue-500" />
    }
  }


  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <p className="text-blue-800 font-medium">Coming Soon</p>
            <p className="text-blue-600 text-sm mt-2">
              We're working hard to bring you this feature. Stay tuned!
            </p>
          </div>
          
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ComingSoonPage
