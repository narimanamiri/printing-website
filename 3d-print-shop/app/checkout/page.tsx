'use client';

import { useSearchParams } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { EstimateCard } from '@/app/components/Uploader';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Order {
  id: string;
  email: string;
  filename: string;
  weight: number;
  cost: number;
  status: string;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    try {
      const response = await fetch(`/api/orders?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  const handlePayment = async () => {
    if (!order) return;

    setProcessingPayment(true);
    try {
      // Simulate payment processing (in production, use Stripe)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Confirm payment
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentIntentId: `pi_demo_${Date.now()}`,
        }),
      });

      if (response.ok) {
        setPaymentSuccess(true);
      } else {
        setError('Payment failed');
      }
    } catch (err) {
      setError('Payment processing error');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-700 font-medium">{error || 'Order not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          {paymentSuccess ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                Your order has been confirmed and is now in our print queue.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Order ID:</p>
                <p className="text-lg font-mono font-bold text-gray-900 break-all">
                  {order.id}
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">File:</span>
                    <span className="font-semibold text-gray-900">
                      {order.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Weight:</span>
                    <span className="font-semibold text-gray-900">
                      {order.weight.toFixed(1)}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Status:</span>
                    <span className="font-semibold text-blue-600 uppercase">
                      {order.status}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice(order.cost)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-900">
                  <strong>What happens next?</strong> Our team will review your file and move it to the print queue.
                  You'll receive an email update when your print is complete.
                </p>
              </div>

              <a
                href="/"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Back to Home
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Order Summary
                </h2>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">File Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Filename</p>
                      <p className="font-semibold text-gray-900">
                        {order.filename}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-600">Estimated Weight</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {order.weight.toFixed(1)}g
                      </p>
                    </div>
                  </div>
                </div>

                <EstimateCard
                  weight={order.weight}
                  cost={order.cost}
                  volume={0}
                />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Payment
                </h2>

                <div className="bg-white rounded-lg shadow p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={processingPayment}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={processingPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        disabled={processingPayment}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">
                        Total:
                      </span>
                      <span className="text-3xl font-bold text-blue-600">
                        {formatPrice(order.cost)}
                      </span>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={processingPayment}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processingPayment && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      {processingPayment
                        ? 'Processing...'
                        : 'Complete Payment'}
                    </button>

                    <p className="text-xs text-gray-600 text-center mt-4">
                      Demo mode: Use any card number. Your file will be placed in the print queue after confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
