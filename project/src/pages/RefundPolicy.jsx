import React from 'react';
import { DollarSign, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const RefundPolicy = () => {
  const eligibleReasons = [
    "Food quality issues (spoiled, contaminated, or unsafe)",
    "Missing items from your order",
    "Wrong items delivered",
    "Order cancelled by restaurant after payment",
    "Excessive delay (more than 60 minutes past estimated time)"
  ];

  const ineligibleReasons = [
    "Change of mind after order is confirmed",
    "Taste or flavor preferences",
    "Minor delays within reasonable time",
    "Incorrect address provided by customer",
    "Customer unavailable to receive delivery"
  ];

  const refundTimelines = [
    { method: "UPI/Wallet", time: "Instant to 24 hours", icon: "⚡" },
    { method: "Credit/Debit Card", time: "5-7 business days", icon: "💳" },
    { method: "Net Banking", time: "5-7 business days", icon: "🏦" },
    { method: "Cash on Delivery", time: "To TasteSphere Wallet instantly", icon: "💰" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <RefreshCw className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Refund Policy</h1>
          <p className="text-lg text-green-100">We're committed to your satisfaction</p>
          <p className="text-sm text-green-200 mt-2">Last updated: October 21, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Our Commitment to You</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            At TasteSphere, customer satisfaction is our top priority. We understand that sometimes things don't go as planned, and we're here to make it right. This Refund Policy outlines the circumstances under which you may be eligible for a refund.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We process refunds fairly and promptly to ensure you have the best possible experience with our platform.
          </p>
        </div>

        {/* Eligible for Refund */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Eligible for Refund</h2>
          </div>
          <p className="text-gray-700 mb-4">You may request a refund in the following situations:</p>
          <div className="space-y-3">
            {eligibleReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-gray-700">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Not Eligible for Refund */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Not Eligible for Refund</h2>
          </div>
          <p className="text-gray-700 mb-4">Refunds are generally not provided for:</p>
          <div className="space-y-3">
            {ineligibleReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                <p className="text-gray-700">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to Request a Refund */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold">How to Request a Refund</h2>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold mb-1">Step 1: Report the Issue</p>
              <p className="text-gray-700 text-sm">Contact our support team within 24 hours of order delivery through the app, website, or customer service hotline.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold mb-1">Step 2: Provide Details</p>
              <p className="text-gray-700 text-sm">Share your order number, describe the issue, and provide photos if applicable (for quality or missing item issues).</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold mb-1">Step 3: Review Process</p>
              <p className="text-gray-700 text-sm">Our team will review your request within 24-48 hours and may contact you for additional information.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold mb-1">Step 4: Refund Processing</p>
              <p className="text-gray-700 text-sm">Once approved, your refund will be processed to your original payment method or TasteSphere wallet.</p>
            </div>
          </div>
        </div>

        {/* Refund Timelines */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">Refund Processing Times</h2>
          </div>
          <p className="text-gray-700 mb-6">Refund timelines vary by payment method:</p>
          <div className="grid md:grid-cols-2 gap-4">
            {refundTimelines.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-3xl">{item.icon}</span>
                  <h3 className="font-semibold">{item.method}</h3>
                </div>
                <p className="text-sm text-gray-600">{item.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Partial Refunds */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Partial Refunds</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            In cases where only part of your order has an issue (e.g., one missing item in a multi-item order), we may issue a partial refund covering only the affected items plus any applicable taxes and fees.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Delivery charges are typically refunded only when the entire order is cancelled or not delivered.
          </p>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Cancellation Policy</h2>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800 mb-2">Before Restaurant Accepts:</p>
              <p className="text-gray-700">Full refund with no cancellation charges if cancelled before the restaurant accepts your order.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2">After Restaurant Accepts:</p>
              <p className="text-gray-700">Cancellation charges may apply (typically 20-30% of order value). Refund of remaining amount will be processed.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2">After Food Preparation:</p>
              <p className="text-gray-700">No refund available once food preparation has started or is out for delivery.</p>
            </div>
          </div>
        </div>

        {/* TasteSphere Wallet */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold">TasteSphere Wallet</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            For faster refund processing, you can opt to receive your refund in your TasteSphere Wallet. Wallet refunds are processed instantly and can be used for future orders on our platform.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Wallet balance does not expire and can be used anytime for orders, including special offers and discounts.
          </p>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4 text-yellow-800">Important Notes</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Refund requests must be submitted within 24 hours of order delivery</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Photo evidence may be required for quality-related issues</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Refunds are processed to the original payment method unless otherwise requested</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Multiple fraudulent refund requests may result in account suspension</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-yellow-600 mt-1">•</span>
              <span>Final decision on refund eligibility rests with TasteSphere support team</span>
            </li>
          </ul>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-6 md:p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Need Help with a Refund?</h2>
          <p className="mb-6 text-green-100">
            Our dedicated support team is here to assist you with any refund-related queries.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="font-semibold mb-2">Email Support</p>
              <p className="text-sm">support@tastesphere.com</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="font-semibold mb-2">Phone Support</p>
              <p className="text-sm">+91 98765 43210 (24/7)</p>
            </div>
          </div>
          <button 
            onClick={() => {
              window.open('mailto:legal@tastesphere.com', '_self');
            }}
            className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer"
          >
            Contact Refund Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;