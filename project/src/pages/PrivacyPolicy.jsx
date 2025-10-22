import React from 'react';
import { Shield, Lock, Eye, UserCheck, Database, Globe, Mail, Phone } from 'lucide-react';

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: <Database className="w-6 h-6" />,
      title: "Information We Collect",
      content: [
        "Personal information including name, email address, phone number, and delivery address",
        "Payment information processed securely through encrypted channels",
        "Order history and food preferences to personalize your experience",
        "Device information and IP address for security purposes",
        "Location data when you use our app to find nearby restaurants"
      ]
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "How We Use Your Information",
      content: [
        "Process and deliver your food orders efficiently",
        "Improve our services and customize your experience",
        "Send order updates, promotional offers, and important notifications",
        "Prevent fraud and maintain platform security",
        "Analyze usage patterns to enhance our platform"
      ]
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Data Security",
      content: [
        "We use industry-standard encryption to protect your data",
        "Payment information is processed through PCI-DSS compliant systems",
        "Regular security audits and vulnerability assessments",
        "Secure servers with restricted access",
        "Multi-factor authentication for sensitive operations"
      ]
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: "Your Rights",
      content: [
        "Access your personal data at any time through your account",
        "Request correction of inaccurate information",
        "Delete your account and associated data",
        "Opt-out of marketing communications",
        "Export your data in a portable format"
      ]
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Information Sharing",
      content: [
        "We share data with restaurant partners only to fulfill orders",
        "Delivery partners receive necessary information for order delivery",
        "Payment processors handle transaction data securely",
        "We never sell your personal information to third parties",
        "Legal authorities may access data when required by law"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-blue-100">Your privacy is our priority</p>
          <p className="text-sm text-blue-200 mt-2">Last updated: October 21, 2025</p>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">Welcome to TasteSphere</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            At TasteSphere, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our food delivery platform.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By using TasteSphere, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.content.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start space-x-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cookies Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mt-6">
          <h2 className="text-xl font-bold mb-4">Cookies and Tracking</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use cookies and similar tracking technologies to enhance your experience on our platform. Cookies help us remember your preferences, understand how you use our service, and provide personalized recommendations.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You can control cookie settings through your browser. However, disabling cookies may limit some functionality of our platform.
          </p>
        </div>

        {/* Children's Privacy */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mt-6">
          <h2 className="text-xl font-bold mb-4">Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Our services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </p>
        </div>

        {/* Updates to Policy */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mt-6">
          <h2 className="text-xl font-bold mb-4">Updates to This Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically for any changes.
          </p>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 md:p-8 mt-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Questions About Privacy?</h2>
          <p className="mb-6 text-blue-100">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5" />
              <span>support@tastesphere.com</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5" />
              <span>+91 84288 17940</span>
            </div>
          </div>
          <br></br>
          <button 
            onClick={() => {
              window.open('mailto:legal@tastesphere.com', '_self');
            }}
            className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer"
          >
            Contact Privacy Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;