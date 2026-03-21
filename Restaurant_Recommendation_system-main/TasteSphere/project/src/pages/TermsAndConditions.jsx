import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const TermsAndConditions = () => {
  const navigate = useNavigate();
  return /*#__PURE__*/React.createElement("section", {
    className: "min-h-screen bg-white dark:bg-gray-900 py-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate(-1),
    className: "flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-semibold mb-6"
  }, /*#__PURE__*/React.createElement(ArrowLeft, {
    className: "w-5 h-5"
  }), /*#__PURE__*/React.createElement("span", null, "Back")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-8 shadow-lg text-white"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl font-bold mb-4"
  }, "Terms & Conditions"), /*#__PURE__*/React.createElement("p", {
    className: "mb-6 opacity-90"
  }, "Please read these terms and conditions carefully before using TasteSphere."), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal ml-6 space-y-4 text-white opacity-95"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Account Responsibility:"), " You are responsible for maintaining the confidentiality of your account and password."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Service Usage:"), " Use TasteSphere for lawful purposes only. Any misuse may result in account suspension."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Payments:"), " All payments are processed securely. TasteSphere is not liable for third-party payment failures."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Offers & Promotions:"), " Offers are subject to change and may have specific terms. Please check offer details before applying."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Notifications:"), " You can manage notification preferences in your account settings."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Privacy:"), " Your data is protected as per our Privacy Policy. We do not share your information without consent."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Changes to Terms:"), " TasteSphere reserves the right to update these terms at any time. Continued use means acceptance of changes.")), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => navigate('/settings'),
    className: "bg-white text-orange-600 font-semibold px-6 py-2 rounded-lg hover:bg-orange-50 transition-colors"
  }, "Go to Settings")))));
};
export default TermsAndConditions;