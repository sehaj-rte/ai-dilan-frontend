'use client'

import React from 'react'
import Link from 'next/link'

const CreateDigitalMindSection = () => {
  const steps = [
    {
      number: "01",
      title: "Connect your content",
      description: "Upload writing, videos, podcasts, or link to live feeds – Dilan AI indexes it all.",
      icon: "📁"
    },
    {
      number: "02", 
      title: "Train and customize",
      description: "We mirror your tone, style, and knowledge. Add notes on what your Dilan AI should do.",
      icon: "🎯"
    },
    {
      number: "03",
      title: "Share everywhere", 
      description: "Deploy on your site, via SMS, or in any chat platform so your audience can talk to you with Dilan AI.",
      icon: "🌐"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-black mb-6">
            Create your Digital Mind
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Build the Digital Version of you to scale your expertise & availability, infinitely.
          </p>
          
          <Link 
            href="#"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-black rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Get Started
          </Link>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 text-center"
            >
              <div className="text-5xl mb-6">{step.icon}</div>
              
              <div className="text-3xl font-bold text-gray-300 mb-4">
                {step.number}
              </div>
              
              <h3 className="text-xl font-semibold text-black mb-4">
                {step.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Duplicate Section (as shown on original site) */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-black mb-6">
            Create your<br />Digital Mind
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Build the Digital Version of you to scale your expertise & availability, infinitely.
          </p>
          
          <Link 
            href="#"
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-black rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Get Started
          </Link>
        </div>

        {/* Steps Repeat */}
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={`repeat-${index}`}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 text-center"
            >
              <div className="text-5xl mb-6">{step.icon}</div>
              
              <div className="text-3xl font-bold text-gray-300 mb-4">
                {step.number}
              </div>
              
              <h3 className="text-xl font-semibold text-black mb-4">
                {step.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CreateDigitalMindSection
