// Save this as: backend/seeders/seedFAQs.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CustomerFAQ from '../models/CustomerFAQ.js';

dotenv.config();

const faqs = [
  // ORDERING CATEGORY
  {
    question: "How do I place an order on TasteSphere?",
    answer: "To place an order: 1) Browse restaurants near you, 2) Select dishes you want, 3) Add them to cart, 4) Review your order, 5) Choose delivery address, 6) Select payment method, 7) Place your order. You'll receive real-time updates on your order status!",
    category: "ordering",
    order: 1,
    isActive: true
  },
  {
    question: "Can I modify my order after placing it?",
    answer: "Yes, you can modify your order within 2 minutes of placing it. Go to 'My Orders', select the active order, and click 'Modify Order'. After 2 minutes, please contact our support team for assistance.",
    category: "ordering",
    order: 2,
    isActive: true
  },
  {
    question: "How do I cancel my order?",
    answer: "You can cancel your order before the restaurant accepts it. Go to 'My Orders', select the order, and click 'Cancel Order'. If the restaurant has already accepted it, cancellation may not be possible. Contact support for urgent cancellations.",
    category: "ordering",
    order: 3,
    isActive: true
  },
  {
    question: "What is the minimum order value?",
    answer: "The minimum order value varies by restaurant, typically ranging from ₹99 to ₹199. You'll see the minimum order requirement on each restaurant's page before adding items to your cart.",
    category: "ordering",
    order: 4,
    isActive: true
  },
  {
    question: "Can I schedule an order for later?",
    answer: "Yes! During checkout, you can select 'Schedule for Later' and choose your preferred delivery time. Available time slots range from 30 minutes to 7 days in advance.",
    category: "ordering",
    order: 5,
    isActive: true
  },
  {
    question: "How do I reorder from my previous orders?",
    answer: "Go to 'My Orders', find your previous order, and click 'Reorder'. All items will be added to your cart. You can then modify quantities or add more items before checking out.",
    category: "ordering",
    order: 6,
    isActive: true
  },

  // PAYMENT CATEGORY
  {
    question: "What payment methods do you accept?",
    answer: "We accept: Credit/Debit Cards (Visa, Mastercard, RuPay), UPI (Google Pay, PhonePe, Paytm), Net Banking, Wallets (Paytm, PhonePe, Amazon Pay), and Cash on Delivery (where available).",
    category: "payment",
    order: 1,
    isActive: true
  },
  {
    question: "Is Cash on Delivery (COD) available?",
    answer: "Yes! COD is available for most orders. However, some restaurants may not offer COD for high-value orders or during peak hours. You'll see COD availability during checkout.",
    category: "payment",
    order: 2,
    isActive: true
  },
  {
    question: "How do refunds work?",
    answer: "Refunds are processed within 5-7 business days to your original payment method. For COD orders with issues, we'll refund to your TasteSphere wallet. You'll receive email updates on your refund status.",
    category: "payment",
    order: 3,
    isActive: true
  },
  {
    question: "My payment failed but money was deducted. What should I do?",
    answer: "If payment fails but amount is debited, it will be automatically refunded within 5-7 business days. Check your order history - if no order was created, the refund is being processed. Contact support with transaction ID for faster resolution.",
    category: "payment",
    order: 4,
    isActive: true
  },
  {
    question: "Are there any payment charges?",
    answer: "No! We don't charge any payment gateway fees. The amount you see during checkout is the final amount you'll pay. Some banks may charge convenience fees for credit card transactions.",
    category: "payment",
    order: 5,
    isActive: true
  },
  {
    question: "Can I use multiple payment methods for one order?",
    answer: "Currently, you can use only one payment method per order. However, you can combine wallet balance with any payment method to complete your transaction.",
    category: "payment",
    order: 6,
    isActive: true
  },

  // DELIVERY CATEGORY
  {
    question: "How long does delivery take?",
    answer: "Delivery typically takes 30-45 minutes depending on restaurant preparation time and your location. You'll see estimated delivery time before placing your order. Track real-time delivery status in 'My Orders'.",
    category: "delivery",
    order: 1,
    isActive: true
  },
  {
    question: "How can I track my order?",
    answer: "Track your order in real-time: 1) Go to 'My Orders', 2) Select active order, 3) View live status updates from preparation to delivery. You'll also receive push notifications for each status change.",
    category: "delivery",
    order: 2,
    isActive: true
  },
  {
    question: "What is the delivery fee?",
    answer: "Delivery fee varies based on distance, typically ₹20-₹50. Some restaurants offer free delivery on orders above a certain amount. Check delivery charges during checkout before placing your order.",
    category: "delivery",
    order: 3,
    isActive: true
  },
  {
    question: "Can I change my delivery address after ordering?",
    answer: "You can change delivery address within 2 minutes of placing order if the restaurant hasn't accepted it yet. After that, contact support immediately. Address changes may not be possible once delivery has started.",
    category: "delivery",
    order: 4,
    isActive: true
  },
  {
    question: "What if my order is delayed?",
    answer: "We apologize for delays! Track your order for real-time updates. If delivery is significantly delayed, you may be eligible for compensation or refund. Contact support with your order ID for assistance.",
    category: "delivery",
    order: 5,
    isActive: true
  },
  {
    question: "Do you deliver to my area?",
    answer: "Enter your delivery address on the home page to check availability. We're constantly expanding our delivery zones. If we don't deliver to your area yet, you can subscribe to get notified when we start!",
    category: "delivery",
    order: 6,
    isActive: true
  },

  // ACCOUNT CATEGORY
  {
    question: "How do I create an account?",
    answer: "Creating an account is easy! Click 'Sign Up' and enter your mobile number or email. Verify with OTP. You can also sign up using Google. Complete your profile with name and address to start ordering!",
    category: "account",
    order: 1,
    isActive: true
  },
  {
    question: "I forgot my password. How do I reset it?",
    answer: "Click 'Forgot Password' on the login page, enter your registered email or phone number, and you'll receive an OTP to reset your password. Follow the instructions to create a new password.",
    category: "account",
    order: 2,
    isActive: true
  },
  {
    question: "How do I update my profile information?",
    answer: "Go to 'My Profile' from the menu, click 'Edit Profile', update your information (name, email, phone), and click 'Save Changes'. You may need to verify new email/phone with OTP.",
    category: "account",
    order: 3,
    isActive: true
  },
  {
    question: "How do I add or edit delivery addresses?",
    answer: "Go to 'My Addresses' in your profile. Click 'Add New Address' or edit existing ones. You can save multiple addresses (Home, Work, Other) and set a default delivery address.",
    category: "account",
    order: 4,
    isActive: true
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account from 'Settings' > 'Account Settings' > 'Delete Account'. Note: This action is permanent and all your data, order history, and wallet balance will be deleted.",
    category: "account",
    order: 5,
    isActive: true
  },
  {
    question: "How do I manage notifications?",
    answer: "Go to 'Settings' > 'Notifications' to customize your preferences. You can enable/disable order updates, promotional messages, and delivery alerts via push notifications, SMS, and email.",
    category: "account",
    order: 6,
    isActive: true
  },

  // GENERAL CATEGORY
  {
    question: "What is TasteSphere?",
    answer: "TasteSphere is your go-to food delivery platform connecting you with the best local restaurants. We deliver your favorite cuisines from restaurants near you, ensuring fresh, hot food delivered quickly to your doorstep!",
    category: "general",
    order: 1,
    isActive: true
  },
  {
    question: "How do I contact customer support?",
    answer: "Contact us 24/7 via: Live Chat (in-app), Phone: +91 84288 17940, Email: support@tastesphere.com, or Help Center. Our support team responds within 2-3 minutes!",
    category: "general",
    order: 2,
    isActive: true
  },
  {
    question: "Are there any offers or discounts?",
    answer: "Yes! Check 'Offers' section for ongoing promotions. We have: First order discounts, Bank offers, Seasonal sales, Loyalty rewards. Subscribe to notifications to never miss a deal!",
    category: "general",
    order: 3,
    isActive: true
  },
  {
    question: "How do I rate a restaurant or delivery?",
    answer: "After your order is delivered, you'll receive a prompt to rate your experience. Rate the food quality, delivery speed, and packaging. Your feedback helps us and restaurants improve!",
    category: "general",
    order: 4,
    isActive: true
  },
  {
    question: "What if I receive the wrong order?",
    answer: "We apologize! Contact support immediately with your order ID and photos of the incorrect items. We'll arrange a replacement or full refund. Don't worry - we'll make it right!",
    category: "general",
    order: 5,
    isActive: true
  },
  {
    question: "Is my personal information secure?",
    answer: "Absolutely! We use industry-standard encryption to protect your data. Your payment information is never stored on our servers. Read our Privacy Policy for detailed information on data security.",
    category: "general",
    order: 6,
    isActive: true
  },
  {
    question: "Do you have a mobile app?",
    answer: "Yes! Download TasteSphere app from Google Play Store or Apple App Store. Get exclusive app-only deals, faster checkout, and seamless ordering experience!",
    category: "general",
    order: 7,
    isActive: true
  },
  {
    question: "Can I become a restaurant partner?",
    answer: "Yes! We're always looking for restaurant partners. Visit our 'Partner With Us' page or email partners@tastesphere.com. Our team will guide you through the onboarding process.",
    category: "general",
    order: 8,
    isActive: true
  },
  {
    question: "How do I report a problem with my order?",
    answer: "Go to 'My Orders', select the order, and click 'Report Issue'. Choose the problem type (missing items, quality issue, etc.), add details and photos. Our support team will respond within minutes.",
    category: "general",
    order: 9,
    isActive: true
  },
  {
    question: "What are your operating hours?",
    answer: "TasteSphere operates 24/7! However, restaurant availability varies. Most restaurants are open from 8 AM to 11 PM. Some offer late-night delivery. Check restaurant timings before ordering.",
    category: "general",
    order: 10,
    isActive: true
  }
];

const seedFAQs = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing FAQs...');
    await CustomerFAQ.deleteMany({});
    console.log('✅ Cleared existing FAQs');

    console.log('📝 Inserting new FAQs...');
    const insertedFAQs = await CustomerFAQ.insertMany(faqs);
    console.log(`✅ Inserted ${insertedFAQs.length} FAQs`);

    const summary = await CustomerFAQ.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 FAQ Summary by Category:');
    summary.forEach(cat => {
      console.log(`   ✓ ${cat._id}: ${cat.count} questions`);
    });

    console.log('\n✅ FAQ seeding completed successfully!');
    console.log('🎉 You can now view FAQs at: http://localhost:5173/help-center\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding FAQs:', error);
    process.exit(1);
  }
};

seedFAQs();