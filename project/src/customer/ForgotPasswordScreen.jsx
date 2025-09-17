// components/ForgotPasswordScreen.jsx
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";

const ForgotPasswordScreen = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage("");

    try {
      console.log('📧 Sending forgot password request for:', email);
      
      // ✅ FIXED: Use correct endpoint /api/auth/forgot-password
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      console.log('📡 Forgot password response:', data);
      
      if (data.success) {
        setIsSubmitted(true);
        setMessage(data.message);
        console.log('✅ Reset link sent successfully');
      } else {
        setMessage(data.error || "Failed to send reset link");
        console.log('❌ Failed to send reset link:', data.error);
      }
    } catch (err) {
      console.error("❌ Forgot Password Error:", err);
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ After successful submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {/* Success Icon */}
          <div className="bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We've sent a password reset link to <br />
            <span className="font-semibold text-orange-500">{email}</span>
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-800 text-sm">
              📧 Click the link in your email to reset your password. 
              The link will expire in 15 minutes.
            </p>
          </div>
          
          <button
            onClick={onBackToLogin}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors shadow-lg"
          >
            Back to Login
          </button>
          
          <button
            onClick={() => {
              setIsSubmitted(false);
              setEmail("");
              setMessage("");
            }}
            className="w-full mt-3 text-orange-600 text-sm hover:text-orange-800 transition-colors"
          >
            Resend Email
          </button>
        </div>
      </div>
    );
  }

  // ✅ Before submission (form)
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        {onBackToLogin && (
          <button
            onClick={onBackToLogin}
            className="flex items-center text-gray-600 mb-8 hover:text-orange-500 transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute w-full h-full bg-orange-500 rounded-full shadow-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12">
              <div className="relative w-full h-full">
                {/* Bicycle logo parts */}
                <div className="absolute bottom-1 left-2 w-4 h-4 border-2 border-white rounded-full"></div>
                <div className="absolute bottom-1 right-2 w-4 h-4 border-2 border-white rounded-full"></div>
                <div className="absolute top-5 left-2 w-8 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-3 left-3 w-6 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-2 left-4 w-0.5 h-3 bg-white"></div>
                <div className="absolute top-1 left-3 w-2 h-0.5 bg-white transform -rotate-12"></div>
                <div className="absolute top-3 right-3 w-0.5 h-2 bg-white"></div>
                <div className="absolute top-2 right-2 w-3 h-0.5 bg-white transform -rotate-45"></div>
                <div className="absolute top-5 left-4 w-2 h-0.5 bg-white transform rotate-12"></div>
                <div className="absolute top-0 right-1 w-2 h-2 bg-white rounded-sm"></div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">TasteSphere</h1>
        </div>

        {/* Form Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your email to receive a reset link</p>
        </div>

        {/* Error/Success Message */}
        {message && !isSubmitted && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            required
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!email || loading}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-full hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;