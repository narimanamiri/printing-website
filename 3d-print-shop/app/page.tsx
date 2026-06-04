'use client';

import { useState } from 'react';
import { Header } from './components/Header';
import { STLUploader, EstimateCard } from './components/Uploader';
import { FeaturesSection } from './components/Features';
import { CheckCircle, Zap, Heart } from 'lucide-react';

interface UploadResponse {
  success: boolean;
  orderId: string;
  filename: string;
  weight: number;
  cost: number;
  volume: number;
}

export default function Home() {
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);

  const handleUploadSuccess = (data: UploadResponse) => {
    setUploadData(data);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Professional 3D Printing
            <span className="block text-blue-200">Made Simple</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Upload your STL file, get an instant price quote, pay securely, and receive your 3D prints.
            All in minutes.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="#upload"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Get Started Now
            </a>
            <button
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="upload" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Get Your Instant Quote
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <STLUploader onSuccess={handleUploadSuccess} />
            </div>

            <div className="space-y-6">
              {uploadData ? (
                <>
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-900 mb-2">
                      File Accepted!
                    </h3>
                    <p className="text-green-700 mb-4">
                      {uploadData.filename}
                    </p>
                  </div>

                  <EstimateCard
                    weight={uploadData.weight}
                    cost={uploadData.cost}
                    volume={uploadData.volume}
                  />

                  <a
                    href={`/checkout?orderId=${uploadData.orderId}`}
                    className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors block text-center"
                  >
                    Proceed to Checkout
                  </a>

                  <button
                    onClick={() => setUploadData(null)}
                    className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:border-gray-400 transition-colors"
                  >
                    Upload Another File
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-3">How It Works</h3>
                    <ol className="space-y-3 text-gray-700">
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                        <span>Upload your STL file</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                        <span>Get instant pricing based on weight</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                        <span>Secure payment processing</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                        <span>Your print joins the production queue</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                        <span>We print and ship it to you</span>
                      </li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <Zap className="w-6 h-6 text-green-600 mb-2" />
                      <p className="font-semibold text-gray-900">Fast Service</p>
                      <p className="text-gray-600">Quick turnaround</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <Heart className="w-6 h-6 text-purple-600 mb-2" />
                      <p className="font-semibold text-gray-900">Quality First</p>
                      <p className="text-gray-600">Expert care</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold mb-2">500+</p>
            <p className="text-blue-100">Happy Customers</p>
          </div>
          <div>
            <p className="text-4xl font-bold mb-2">1000+</p>
            <p className="text-blue-100">Successful Prints</p>
          </div>
          <div>
            <p className="text-4xl font-bold mb-2">24h</p>
            <p className="text-blue-100">Average Turnaround</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 mt-auto">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-white mb-4">3D Print Shop</h3>
            <p className="text-sm">Professional 3D printing service for all your needs.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Upload</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Materials</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">PLA</a></li>
              <li><a href="#" className="hover:text-white transition-colors">ABS</a></li>
              <li><a href="#" className="hover:text-white transition-colors">PETG</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Contact</h4>
            <p className="text-sm">Email: info@3dprintshop.com</p>
            <p className="text-sm">Phone: +1 (555) 123-4567</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-gray-700 mt-8 pt-8 text-sm text-center">
          <p>&copy; 2024 3D Print Shop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
