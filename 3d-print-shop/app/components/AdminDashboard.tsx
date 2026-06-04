'use client';

import React, { useState, useEffect } from 'react';
import { formatPrice, formatDate } from '@/lib/utils';
import { CheckCircle, Clock, Printer, Package } from 'lucide-react';

interface Order {
  id: string;
  email: string;
  filename: string;
  weight: number;
  cost: number;
  status: string;
  uploaded_at: string;
  payment_confirmed_at: string | null;
  completed_at: string | null;
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', color: 'yellow' },
  paid: { icon: CheckCircle, label: 'Paid', color: 'blue' },
  confirmed: { icon: Printer, label: 'Confirmed', color: 'indigo' },
  printing: { icon: Printer, label: 'Printing', color: 'purple' },
  completed: { icon: Package, label: 'Completed', color: 'green' },
};

export function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function loadOrders() {
    try {
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });

      if (response.ok) {
        loadOrders();
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  const filteredOrders = selectedStatus
    ? orders.filter((o) => o.status === selectedStatus)
    : orders;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = orders.filter((o) => o.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedStatus(selectedStatus === key ? null : key)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedStatus === key
                  ? `border-${config.color}-500 bg-${config.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 text-${config.color}-600`} />
                <span className="font-semibold text-gray-900">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  File
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Weight
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const config = statusConfig[order.status as keyof typeof statusConfig];
                const Icon = config?.icon || Clock;
                const color = config?.color || 'gray';

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {order.id.slice(0, 12)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{order.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {order.filename.slice(0, 20)}...
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {order.weight.toFixed(1)}g
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatPrice(order.cost)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 text-${color}-600`} />
                        <span className="font-medium text-gray-900">
                          {config?.label || order.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(order.uploaded_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {order.status === 'paid' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-semibold"
                        >
                          Confirm
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'printing')}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-semibold"
                        >
                          Start Print
                        </button>
                      )}
                      {order.status === 'printing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-xs font-semibold"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
