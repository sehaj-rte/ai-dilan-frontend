'use client'

import React from 'react'
import Link from 'next/link'

const UseCasesSection = () => {
  const useCases = [
    {
      title: "Experts",
      subtitle: "Interact, don't just consume.",
      features: [
        "Instantly answer questions at unlimited scale",
        "Create personalized, interactive learning experiences", 
        "Monetize your expertise without extra effort"
      ],
      description: "Share your specialized insights instantly, creating powerful interactions without losing authenticity.",
      link: "Dilan AI for Experts"
    },
    {
      title: "Coaches", 
      subtitle: "Personal coaching, on-demand and unlimited.",
      features: [
        "Offer tailored advice to countless clients simultaneously",
        "Expand your reach without filling your calendar",
        "Generate revenue 24/7 from your expertise"
      ],
      description: "Multiply your impact effortlessly, giving clients personalized guidance exactly when they need it.",
      link: "Dilan AI for Coaches"
    },
    {
      title: "Executives",
      subtitle: "Share your entrepreneurial wisdom at scale.", 
      features: [
        "Deliver strategic advice to ambitious entrepreneurs",
        "Strengthen your thought leadership effortlessly",
        "Open new revenue streams from your insights"
      ],
      description: "Provide instant mentorship, turning your experience into powerful, scalable conversations.",
      link: "Dilan AI for Executives"
    },
    {
      title: "Celebrities",
      subtitle: "Engage authentically with every fan, anytime.",
      features: [
        "Offer meaningful, personal interactions at infinite scale",
        "Take control of your narrative without middlemen", 
        "Unlock new opportunities for growth and monetization"
      ],
      description: "Deepen fan connections through genuine interactions—personal, authentic, and scalable.",
      link: "Dilan AI for Celebrities"
    },
    {
      title: "Authors",
      subtitle: "Transform your ideas into living conversations.",
      features: [
        "Go beyond passive reading with interactive dialogues",
        "Engage readers personally, beyond the pages of your book",
        "Turn ongoing conversations into new revenue"
      ],
      description: "Make your writing interactive, bringing your readers closer through meaningful, dynamic dialogue.",
      link: "Dilan AI for Authors"
    },
    {
      title: "Creators",
      subtitle: "Turn followers into lasting communities.",
      features: [
        "Engage your audience authentically at scale",
        "Monetize interactions without extra effort",
        "Answer questions instantly, deepen connections"
      ],
      description: "Scale your personal connection with fans, turning passive followers into active supporters.",
      link: "Dilan AI for Creators"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-lg text-gray-600 mb-4">Use Cases</p>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            And coaches, celebrities & more.
          </h2>
          
          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {useCases.map((useCase, index) => (
              <span 
                key={index}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer"
              >
                {useCase.title}
              </span>
            ))}
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="grid lg:grid-cols-2 gap-12">
          {useCases.map((useCase, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-300"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-black mb-2">
                  {useCase.title}
                </h3>
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  {useCase.subtitle}
                </h4>
                
                <ul className="space-y-2 mb-6">
                  {useCase.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {useCase.description}
                </p>
                
                <Link 
                  href="#"
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {useCase.link} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default UseCasesSection
