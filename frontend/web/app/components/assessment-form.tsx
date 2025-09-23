'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Home, Users, Calculator, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Slider } from './ui/slider'
import { Badge } from './ui/badge'

interface AssessmentResult {
  feasibilityScore: number
  waterPotential: number
  recommendedStructures: Array<{
    name: string
    type: string
    cost: number
    specifications: Record<string, any>
  }>
  costEstimate: number
  paybackPeriod: number
  environmentalImpact: {
    waterSaved: number
    co2Reduction: number
  }
}

export function AssessmentForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [formData, setFormData] = useState({
    address: '',
    latitude: '',
    longitude: '',
    roofArea: [100],
    householdSize: [4],
    roofType: 'concrete',
    propertyType: 'residential'
  })

  const handleLocationSearch = async () => {
    // Mock location search - in real app, use geocoding API
    if (formData.address) {
      setFormData(prev => ({
        ...prev,
        latitude: '28.6139',
        longitude: '77.2090'
      }))
    }
  }

  const runAssessment = async () => {
    setLoading(true)
    
    // Mock API call - in real app, call the ML service
    setTimeout(() => {
      const mockResult: AssessmentResult = {
        feasibilityScore: 85,
        waterPotential: 45000, // liters per year
        recommendedStructures: [
          {
            name: 'Basic Storage Tank',
            type: 'storage_tank',
            cost: 25000,
            specifications: {
              capacity: '2000L',
              material: 'concrete',
              dimensions: '2m x 1.5m x 1m'
            }
          },
          {
            name: 'First Flush Filter',
            type: 'filter_tank',
            cost: 8000,
            specifications: {
              type: 'mechanical',
              maintenance: 'monthly'
            }
          }
        ],
        costEstimate: 33000,
        paybackPeriod: 18,
        environmentalImpact: {
          waterSaved: 45000,
          co2Reduction: 120
        }
      }
      setResult(mockResult)
      setLoading(false)
      setStep(3)
    }, 2000)
  }

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-aqua-blue-100 mx-auto mb-4">
          <MapPin className="h-8 w-8 text-aqua-blue-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Location Details</h3>
        <p className="text-muted-foreground">Tell us where you want to assess rainwater harvesting potential</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="address">Property Address</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="address"
              placeholder="Enter your complete address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="flex-1"
            />
            <Button onClick={handleLocationSearch} variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Locate
            </Button>
          </div>
        </div>

        {formData.latitude && formData.longitude && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={formData.latitude}
                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                placeholder="28.6139"
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={formData.longitude}
                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                placeholder="77.2090"
              />
            </div>
          </motion.div>
        )}
      </div>

      <Button 
        onClick={() => setStep(2)} 
        className="w-full" 
        disabled={!formData.address || !formData.latitude}
      >
        Continue to Property Details <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  )

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-earth-green-100 mx-auto mb-4">
          <Home className="h-8 w-8 text-earth-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Property Information</h3>
        <p className="text-muted-foreground">Help us understand your property for accurate assessment</p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Roof Area (sq meters)</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Current estimate: {formData.roofArea[0]} sq meters
          </p>
          <Slider
            value={formData.roofArea}
            onValueChange={(value) => setFormData(prev => ({ ...prev, roofArea: value }))}
            max={500}
            min={20}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>20 sq m</span>
            <span>500 sq m</span>
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Household Size</Label>
          <p className="text-sm text-muted-foreground mb-4">
            Number of people: {formData.householdSize[0]}
          </p>
          <Slider
            value={formData.householdSize}
            onValueChange={(value) => setFormData(prev => ({ ...prev, householdSize: value }))}
            max={12}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1 person</span>
            <span>12+ people</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="roofType">Roof Type</Label>
            <Select value={formData.roofType} onValueChange={(value) => setFormData(prev => ({ ...prev, roofType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select roof type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concrete">Concrete</SelectItem>
                <SelectItem value="tile">Clay Tiles</SelectItem>
                <SelectItem value="metal">Metal Sheets</SelectItem>
                <SelectItem value="asbestos">Asbestos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Select value={formData.propertyType} onValueChange={(value) => setFormData(prev => ({ ...prev, propertyType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="institutional">Institutional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
          Back
        </Button>
        <Button onClick={runAssessment} className="flex-1 bg-gradient-to-r from-aqua-blue-500 to-earth-green-500">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Run Assessment
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )

  const renderResults = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-aqua-blue-500 to-earth-green-500 mx-auto mb-4">
          <span className="text-3xl font-bold text-white">{result?.feasibilityScore}</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">Assessment Complete!</h3>
        <p className="text-muted-foreground">Your rainwater harvesting feasibility score</p>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-aqua-blue-600">{result.waterPotential.toLocaleString()}L</div>
                <div className="text-sm text-muted-foreground">Annual Water Potential</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-earth-green-600">₹{result.costEstimate.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Investment</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{result.paybackPeriod}</div>
                <div className="text-sm text-muted-foreground">Payback (Months)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{result.environmentalImpact.co2Reduction}kg</div>
                <div className="text-sm text-muted-foreground">CO₂ Reduction/Year</div>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Structures */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Structures</CardTitle>
              <CardDescription>Based on your property analysis and local conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.recommendedStructures.map((structure, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{structure.name}</h4>
                      <p className="text-sm text-muted-foreground">{structure.specifications.capacity || 'Custom size'}</p>
                      <Badge variant="secondary" className="mt-2">{structure.type.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{structure.cost.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Installation cost</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="flex-1 bg-gradient-to-r from-aqua-blue-500 to-earth-green-500">
              View AR Visualization
            </Button>
            <Button variant="outline" className="flex-1">
              Find Contractors
            </Button>
            <Button variant="outline" className="flex-1">
              Download Report
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  )

  return (
    <Card className="w-full max-w-4xl mx-auto glass">
      <CardContent className="p-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= stepNum 
                  ? 'bg-gradient-to-r from-aqua-blue-500 to-earth-green-500 text-white' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div className={`h-1 w-12 md:w-24 mx-2 ${
                  step > stepNum ? 'bg-gradient-to-r from-aqua-blue-500 to-earth-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderResults()}
      </CardContent>
    </Card>
  )
}