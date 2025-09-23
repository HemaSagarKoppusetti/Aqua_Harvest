'use client'

import { motion } from 'framer-motion'
import { Droplets, Users, TrendingUp, Leaf, MapPin, Award } from 'lucide-react'
import { Card, CardContent } from './ui/card'

const stats = [
  {
    icon: Droplets,
    value: '2.5M+',
    label: 'Liters Water Saved',
    description: 'Through successful implementations',
    color: 'text-aqua-blue-500',
    bgColor: 'bg-aqua-blue-50'
  },
  {
    icon: Users,
    value: '15K+',
    label: 'Households Served',
    description: 'Across 12 states in India',
    color: 'text-earth-green-500',
    bgColor: 'bg-earth-green-50'
  },
  {
    icon: TrendingUp,
    value: '85%',
    label: 'Average Feasibility',
    description: 'Success rate in urban areas',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Leaf,
    value: '450T',
    label: 'CO₂ Reduced',
    description: 'Environmental impact achieved',
    color: 'text-green-500',
    bgColor: 'bg-green-50'
  },
  {
    icon: MapPin,
    value: '500+',
    label: 'Cities Covered',
    description: 'Pan-India implementation',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
  {
    icon: Award,
    value: '95%',
    label: 'User Satisfaction',
    description: 'Based on post-implementation surveys',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50'
  }
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300 glass">
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className={`text-2xl md:text-3xl font-bold ${stat.color} mb-2`}>
                {stat.value}
              </div>
              <div className="font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}