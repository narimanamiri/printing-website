'use client';

import React from 'react';
import { Printer, Zap, Award, Clock } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Quotes',
    description: 'Get your 3D print cost instantly. Upload your STL file and we calculate the price automatically.',
  },
  {
    icon: Printer,
    title: 'Professional Quality',
    description: 'We use premium materials and advanced printing technology to deliver exceptional results.',
  },
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: 'Quick production and shipping. Your prints arrive ready to use.',
  },
  {
    icon: Award,
    title: 'Expert Support',
    description: 'Our team handles complex prints and provides consultation for optimal results.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Our 3D Printing Service?
          </h2>
          <p className="text-lg text-gray-600">
            Professional-grade 3D printing with exceptional customer service
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <Icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
