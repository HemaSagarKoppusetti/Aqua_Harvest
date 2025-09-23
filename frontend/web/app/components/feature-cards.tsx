'use client'

import { motion } from 'framer-motion'
import { 
  Brain, 
  Satellite, 
  Calculator, 
  Eye, 
  BarChart3, 
  Smartphone,
  Cloud,
  Shield,
  Zap,
  Globe,
  Users,
  TreePine
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced machine learning algorithms analyze satellite imagery to detect roof areas with 95%+ accuracy',
    features: ['Computer Vision', 'CNN Models', 'Real-time Processing'],
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    category: 'AI/ML'
  },
  {
    icon: Satellite,
    title: 'Satellite Integration',
    description: 'Real-time satellite imagery from Google Earth Engine for precise roof detection and area calculation',
    features: ['Google Earth Engine', 'Sentinel-2 Data', 'High Resolution'],
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    category: 'GIS'
  },
  {
    icon: Calculator,
    title: 'Smart Calculations',
    description: 'Comprehensive feasibility scoring using rainfall data, soil conditions, and groundwater levels',
    features: ['XGBoost Models', 'Multi-criteria Analysis', 'Cost-Benefit'],
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    category: 'Analytics'
  },
  {
    icon: Eye,
    title: 'AR Visualization',
    description: 'See 3D models of recommended structures overlaid on your actual property using augmented reality',
    features: ['AR.js Integration', '3D Modeling', 'Interactive Placement'],
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    category: 'Visualization'
  },
  {
    icon: BarChart3,
    title: 'Government Dashboard',
    description: 'District-wise impact tracking for government officials with real-time adoption and savings metrics',
    features: ['Impact Analytics', 'Policy Insights', 'Real-time Data'],
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    category: 'Analytics'
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Cross-platform Flutter app with offline capabilities and seamless synchronization',
    features: ['Flutter Framework', 'Offline Support', 'PWA Ready'],
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    category: 'Mobile'
  },
  {
    icon: Cloud,
    title: 'Real-time Data',
    description: 'Integration with IMD weather APIs and CGWB groundwater database for accurate predictions',
    features: ['IMD Integration', 'CGWB Data', 'Live Updates'],
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    category: 'Data'
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'GDPR compliant with end-to-end encryption and secure data handling practices',
    features: ['GDPR Compliant', 'Data Encryption', 'Privacy First'],
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    category: 'Security'
  },
  {
    icon: Zap,
    title: 'High Performance',
    description: 'Microservices architecture with Redis caching for lightning-fast assessment results',
    features: ['Microservices', 'Redis Caching', 'Auto Scaling'],
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    category: 'Performance'
  },
  {
    icon: Globe,
    title: 'Multi-language',
    description: 'Support for regional Indian languages making water conservation accessible to everyone',
    features: ['Hindi Support', 'Regional Languages', 'Cultural Adaptation'],
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    category: 'Accessibility'
  },
  {
    icon: Users,
    title: 'Community Features',
    description: 'Gamification with leaderboards, achievements, and social sharing to drive adoption',
    features: ['Leaderboards', 'Achievements', 'Social Sharing'],
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    category: 'Social'
  },
  {
    icon: TreePine,
    title: 'Sustainability',
    description: 'Track environmental impact with CO₂ reduction calculations and water savings metrics',
    features: ['Impact Tracking', 'CO₂ Calculation', 'Sustainability Goals'],
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    category: 'Environment'
  }
]

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          viewport={{ once: true }}
          className="h-full"
        >
          <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2 glass">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-full ${feature.bgColor} flex items-center justify-center`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {feature.category}
                </Badge>
              </div>
              <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {feature.features.map((item, featureIndex) => (
                  <Badge 
                    key={featureIndex} 
                    variant="outline" 
                    className="text-xs px-2 py-1"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}