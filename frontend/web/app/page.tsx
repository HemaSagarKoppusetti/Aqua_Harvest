'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, MapPin, Calculator, TrendingUp, Users, Award, ArrowRight, Zap } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { AssessmentForm } from './components/assessment-form'
import { StatsCards } from './components/stats-cards'
import { FeatureCards } from './components/feature-cards'
import ARVisualization from './components/ar/ARVisualization'

export default function HomePage() {
  const [showAssessment, setShowAssessment] = useState(false)

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="glass fixed top-0 w-full z-50 border-b">
        <div className="container-fluid">
          <div className="flex h-16 items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-aqua-blue-500 to-earth-green-500 water-ripple">
                <Droplets className="h-6 w-6 text-white animate-water-drop" />
              </div>
              <span className="text-2xl font-bold gradient-text">AquaHarvest</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center space-x-6"
            >
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">About</a>
              <a href="#impact" className="text-muted-foreground hover:text-primary transition-colors">Impact</a>
              <Button variant="outline" size="sm">
                Government Login
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container-fluid">
          <motion.div 
            variants={staggerChildren}
            initial="initial"
            animate="animate"
            className="text-center space-y-8"
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Harvest Rain,{' '}
                <span className="gradient-text">Save Tomorrow</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto text-balance">
                AI-powered assessment of your rooftop rainwater harvesting potential. 
                Get instant recommendations, cost analysis, and 3D visualizations.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-aqua-blue-500 to-earth-green-500 hover:from-aqua-blue-600 hover:to-earth-green-600"
                onClick={() => setShowAssessment(true)}
              >
                Start Assessment <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                View Demo <Zap className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>

            {/* Impact Statistics */}
            <motion.div variants={fadeInUp}>
              <StatsCards />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Assessment Section */}
      {showAssessment && (
        <motion.section 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 px-4 bg-gradient-to-r from-aqua-blue-50 to-earth-green-50"
        >
          <div className="container-fluid">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Get Your <span className="gradient-text">Instant Assessment</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Enter your location details and get AI-powered recommendations in seconds
                </p>
              </div>
              <AssessmentForm />
            </div>
          </div>
        </motion.section>
      )}

      {/* Features Section */}
      <section id="features" className="py-16 px-4">
        <div className="container-fluid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Revolutionary Features</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cutting-edge AI and satellite technology for the most accurate rainwater harvesting assessments
            </p>
          </motion.div>
          
          <FeatureCards />
        </div>
      </section>

      {/* AR Visualization Demo Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
        <div className="container-fluid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">3D System Visualization</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Experience your rainwater harvesting system in interactive 3D. See how components work together 
              and visualize the potential impact on your property.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <ARVisualization 
              assessmentData={{
                feasibilityScore: 0.85,
                potentialWaterCollection: 45000,
                recommendedSystem: {
                  tankCapacityLiters: 8000
                },
                annualSavings: 25000,
                propertyDetails: {
                  roofArea: 120,
                  roofType: 'Concrete'
                }
              }}
              onModelLoad={(model) => {
                console.log('3D model loaded:', model);
              }}
              onARStart={() => {
                console.log('AR session started');
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <p className="text-sm text-muted-foreground mb-4">
              This interactive 3D model shows a sample rainwater harvesting system. 
              Your actual assessment will provide customized visualizations.
            </p>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowAssessment(true)}
            >
              Get Your Custom 3D Model
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container-fluid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Addressing India&apos;s <span className="gradient-text">Water Crisis</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="glass float">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-6 w-6 text-red-500 mr-2" />
                    The Challenge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    India receives 4,000 BCM of rainfall annually, but captures less than 8%. 
                    Groundwater depletion affects 60% of districts.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Rainfall Captured</span>
                      <span className="font-semibold text-red-500">&lt;8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Affected Districts</span>
                      <span className="font-semibold text-red-500">60%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass float" style={{ animationDelay: '2s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-6 w-6 text-earth-green-500 mr-2" />
                    Our Solution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    AI-powered rooftop assessments can help capture 20% of rainfall just from urban rooftops, 
                    creating massive impact for water security.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Potential Capture</span>
                      <span className="font-semibold text-earth-green-500">20%+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy Rate</span>
                      <span className="font-semibold text-earth-green-500">95%+</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-r from-aqua-blue-500 to-earth-green-500 text-white p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Ready to Make Impact?</h3>
              <p className="mb-6">
                Join thousands of households already harvesting rainwater and contributing to India&apos;s water security
              </p>
              <Button 
                variant="secondary" 
                size="lg" 
                className="bg-white text-aqua-blue-600 hover:bg-gray-100"
                onClick={() => setShowAssessment(true)}
              >
                Start Your Assessment Now
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container-fluid">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Droplets className="h-6 w-6 text-aqua-blue-400" />
                <span className="text-xl font-bold">AquaHarvest</span>
              </div>
              <p className="text-gray-400">
                AI-powered rainwater harvesting for a sustainable future
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>AI Roof Detection</li>
                <li>Cost Analysis</li>
                <li>AR Visualization</li>
                <li>Government Dashboard</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>API Access</li>
                <li>Research Papers</li>
                <li>Community</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@aquaharvest.in</li>
                <li>+91-XXX-XXX-XXXX</li>
                <li>Smart India Hackathon 2024</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AquaHarvest Team. Built for Smart India Hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}