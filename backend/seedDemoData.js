// backend/seedDemoData.js
// Seeds demo sellers + dishes so the customer Discovery page has content.
// Safe to run repeatedly: it upserts by email (sellers) and name+seller (dishes).
// Run: npm run seed        (seeds only if there are no dishes yet)
//      $env:SEED_FORCE=1; npm run seed   (re-seeds/updates even if dishes exist)

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from './connectDB.js';
import Dish from './models/Dish.js';
import Seller from './models/Seller.js';

const SELLERS = [
  {
    email: 'pizza.palace@tastesphere.demo',
    businessName: 'Pizza Palace',
    businessType: 'Restaurant',
    phone: '+91 90000 10001',
    cuisine: ['Italian', 'Fast Food'],
    city: 'Kovilpatti',
    state: 'Tamil Nadu',
    description: 'Wood-fired pizzas and cheesy classics.',
    logo: 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner: 'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    email: 'spice.garden@tastesphere.demo',
    businessName: 'Spice Garden',
    businessType: 'Restaurant',
    phone: '+91 90000 10002',
    cuisine: ['Indian', 'North Indian'],
    city: 'Kovilpatti',
    state: 'Tamil Nadu',
    description: 'Rich North Indian curries and tandoori specials.',
    logo: 'https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner: 'https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    email: 'burger.junction@tastesphere.demo',
    businessName: 'Burger Junction',
    businessType: 'Fast Food',
    phone: '+91 90000 10003',
    cuisine: ['American', 'Burgers'],
    city: 'Tirunelveli',
    state: 'Tamil Nadu',
    description: 'Juicy burgers, fries and thick shakes.',
    logo: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    email: 'sushi.express@tastesphere.demo',
    businessName: 'Sushi Express',
    businessType: 'Restaurant',
    phone: '+91 90000 10004',
    cuisine: ['Japanese', 'Asian'],
    city: 'Madurai',
    state: 'Tamil Nadu',
    description: 'Fresh sushi rolls and Asian favourites.',
    logo: 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner: 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    email: 'paradise.biryani@tastesphere.demo',
    businessName: 'Paradise Biryani',
    businessType: 'Restaurant',
    phone: '+91 90000 10005',
    cuisine: ['South Indian', 'Biryani'],
    city: 'Kovilpatti',
    state: 'Tamil Nadu',
    description: 'Aromatic dum biryani and South Indian meals.',
    logo: 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner: 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

const DISHES = [
  { sellerIndex: 0, name: 'Margherita Pizza', description: 'Classic cheese and tomato pizza.', price: 249, category: 'Continental', type: 'veg', image: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 0, name: 'Chicken Tikka Pizza', description: 'Tandoori chicken with mozzarella.', price: 349, category: 'Continental', type: 'non-veg', image: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 0, name: 'Garlic Bread', description: 'Toasted garlic butter bread.', price: 129, category: 'Starters', type: 'veg', image: 'https://images.pexels.com/photos/1387070/pexels-photo-1387070.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 1, name: 'Paneer Butter Masala', description: 'Creamy tomato paneer curry.', price: 249, category: 'Main Course', type: 'veg', image: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 1, name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry.', price: 299, category: 'Main Course', type: 'non-veg', image: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 1, name: 'Garlic Naan', description: 'Soft tandoori naan with garlic.', price: 59, category: 'Indian', type: 'veg', image: 'https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 2, name: 'Classic Cheeseburger', description: 'Beef-style patty with cheddar.', price: 199, category: 'Main Course', type: 'non-veg', image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 2, name: 'Veggie Burger', description: 'Crispy veg patty with fresh salad.', price: 169, category: 'Main Course', type: 'veg', image: 'https://images.pexels.com/photos/3607284/pexels-photo-3607284.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 2, name: 'French Fries', description: 'Crispy golden fries.', price: 99, category: 'Starters', type: 'veg', image: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 3, name: 'Salmon Sushi Roll', description: 'Fresh salmon and rice roll.', price: 399, category: 'Continental', type: 'non-veg', image: 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 3, name: 'Veg Hakka Noodles', description: 'Stir-fried noodles with vegetables.', price: 179, category: 'Chinese', type: 'veg', image: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 3, name: 'Chicken Manchurian', description: 'Spicy Indo-Chinese chicken.', price: 229, category: 'Chinese', type: 'non-veg', image: 'https://images.pexels.com/photos/6111388/pexels-photo-6111388.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 4, name: 'Hyderabadi Chicken Biryani', description: 'Aromatic dum biryani with chicken.', price: 299, category: 'Main Course', type: 'non-veg', image: 'https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 4, name: 'Masala Dosa', description: 'Crispy dosa with potato masala.', price: 149, category: 'South Indian', type: 'veg', image: 'https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 4, name: 'Gulab Jamun', description: 'Soft milk dumplings in syrup.', price: 99, category: 'Desserts', type: 'veg', image: 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { sellerIndex: 4, name: 'Filter Coffee', description: 'Traditional South Indian coffee.', price: 49, category: 'Beverages', type: 'veg', image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export const seedDemoData = async ({ connect = true } = {}) => {
  if (connect && mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  const existingDishes = await Dish.countDocuments();
  if (existingDishes > 0 && !process.env.SEED_FORCE) {
    console.log(`Skipping seed: ${existingDishes} dishes already exist. Set SEED_FORCE=1 to reseed.`);
    if (connect) await mongoose.connection.close();
    return;
  }

  const sellerDocs = [];
  for (const item of SELLERS) {
    const seller = await Seller.findOneAndUpdate(
      { email: item.email },
      {
        $set: {
          email: item.email,
          businessName: item.businessName,
          businessType: item.businessType,
          phone: item.phone,
          isActive: true,
          isVerified: true,
          isOnline: true,
          dashboardStatus: 'online',
          onboardingCompleted: true,
          'address.city': item.city,
          'address.state': item.state,
          'businessDetails.cuisine': item.cuisine,
          'businessDetails.description': item.description,
          'businessDetails.priceRange': 'mid-range',
          'businessDetails.documents.logo': item.logo,
          'businessDetails.documents.bannerImage': item.banner,
        },
        $setOnInsert: {
          passwordHash: '$2b$12$demoSeedPlaceholderHashNotUsedForLogin000000000000000000',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    sellerDocs.push(seller);
    console.log(`Seller ready: ${seller.businessName}`);
  }

  let created = 0;
  for (const [index, dish] of DISHES.entries()) {
    const seller = sellerDocs[dish.sellerIndex];
    const ratingAverage = Number((4 + ((index % 10) / 10)).toFixed(1));
    await Dish.findOneAndUpdate(
      { name: dish.name, seller: seller._id },
      {
        $set: {
          name: dish.name,
          description: dish.description,
          price: dish.price,
          category: dish.category,
          type: dish.type,
          image: dish.image,
          seller: seller._id,
          restaurantId: seller._id,
          sellerName: seller.businessName,
          restaurantName: seller.businessName,
          availability: true,
          isActive: true,
          isFeatured: index % 4 === 0,
          'location.city': seller.address?.city,
          'location.state': seller.address?.state,
          'rating.average': ratingAverage,
          'rating.count': 20 + index * 3,
          orderCount: 120 - index * 5,
          viewCount: 400 - index * 7,
          offer: index % 3 === 0
            ? {
                hasOffer: true,
                discountPercentage: 20 + (index % 3) * 10,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              }
            : { hasOffer: false, discountPercentage: 0, validUntil: null },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created += 1;
  }

  console.log(`Seeded ${sellerDocs.length} sellers and ${created} dishes.`);
  if (connect) await mongoose.connection.close();
};

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seedDemoData.js');

if (isDirectRun) {
  seedDemoData()
    .then(() => {
      console.log('Seed complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
