import React from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, Scale, Users } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-lg text-purple-100">Please read these terms carefully before using our services</p>
          <p className="text-sm text-purple-200 mt-2">Effective Date: October 21, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Welcome to TasteSphere! These Terms of Service govern your access to and use of our food delivery platform, including our website, mobile application, and related services.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By accessing or using TasteSphere, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our services.
          </p>
        </div>

        {/* User Obligations */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">User Obligations</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">You must be at least 18 years old to use our services</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Provide accurate and complete information when creating an account</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Maintain the security of your account credentials</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Comply with all applicable laws and regulations</p>
            </div>
          </div>
        </div>

        {/* Prohibited Activities */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Prohibited Activities</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Using the platform for fraudulent or illegal purposes</p>
            </div>
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Attempting to gain unauthorized access to our systems</p>
            </div>
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Harassing, threatening, or abusing delivery partners or restaurant staff</p>
            </div>
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Posting false reviews or manipulating ratings</p>
            </div>
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <p className="text-gray-700">Sharing your account with unauthorized users</p>
            </div>
          </div>
        </div>

        {/* Orders and Payments */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Orders and Payments</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Order Acceptance:</strong> All orders are subject to acceptance by the restaurant. We reserve the right to refuse or cancel any order for any reason.
            </p>
            <p>
              <strong>Pricing:</strong> Prices displayed on our platform are set by restaurants and may vary. We strive to display accurate pricing, but errors may occur.
            </p>
            <p>
              <strong>Payment:</strong> You agree to pay all charges incurred through your account, including delivery fees, taxes, and tips. Payment is processed securely through our payment partners.
            </p>
            <p>
              <strong>Cancellations:</strong> Orders can be cancelled before restaurant acceptance without charge. Post-acceptance cancellations may incur fees as per our refund policy.
            </p>
          </div>
        </div>

        {/* Delivery Terms */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Delivery Terms</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Estimated delivery times are approximate and may vary due to factors beyond our control, including weather, traffic, and restaurant preparation time. While we strive for timely delivery, we are not liable for delays.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You must be available to receive your order at the specified delivery address. If you are unavailable, additional charges may apply for redelivery attempts.
          </p>
        </div>

        {/* Intellectual Property */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Scale className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">Intellectual Property</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            All content on the TasteSphere platform, including text, graphics, logos, images, and software, is the property of TasteSphere or its content suppliers and is protected by intellectual property laws.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You may not reproduce, distribute, modify, or create derivative works from any content without our express written permission.
          </p>
        </div>

        {/* Limitation of Liability */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold">Limitation of Liability</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            TasteSphere acts as an intermediary between customers and restaurants. We are not responsible for the quality, safety, or legality of food items ordered through our platform.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            To the maximum extent permitted by law, TasteSphere shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our total liability for any claims related to our services shall not exceed the amount you paid for the specific order giving rise to the claim.
          </p>
        </div>

        {/* Termination */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Account Termination</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We reserve the right to suspend or terminate your account at our discretion if you violate these Terms or engage in fraudulent activity. You may also close your account at any time through your account settings.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Upon termination, your right to use our services will immediately cease. We may retain certain information as required by law or for legitimate business purposes.
          </p>
        </div>

        {/* Changes to Terms */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to our platform. Your continued use of TasteSphere after changes are posted constitutes acceptance of the modified Terms.
          </p>
        </div>

        {/* Governing Law */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms or your use of our services shall be subject to the exclusive jurisdiction of the courts in Mumbai, India.
          </p>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 md:p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
          <p className="mb-4 text-purple-100">
            If you have any questions about these Terms of Service, please contact our legal team:
          </p>
          <button 
            onClick={() => {
              window.open('mailto:legal@tastesphere.com', '_self');
            }}
            className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer"
          >
            Contact Legal Team
          </button>
          
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
