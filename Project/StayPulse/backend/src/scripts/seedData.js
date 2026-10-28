import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import RoomReservationSlot from '../models/RoomReservationSlot.js';
import { connectDB } from '../config/db.js';

const seedInitialData = async () => {
  console.log('[Seed] Seeding sample verified properties and room inventories...');

  const conn = await connectDB();
  if (!conn) {
    console.error('[Seed Error] Could not connect to MongoDB.');
    process.exit(1);
  }

  try {
    // 1. Ensure Property Owners exist
    let ownerAmit = await User.findOne({ email: 'amit@staypulse.com' });
    if (!ownerAmit) {
      ownerAmit = await User.create({
        name: 'Amit Sharma',
        email: 'amit@staypulse.com',
        password: 'Password123#',
        role: 'PROPERTY_OWNER',
        phone: '+91 98111 22334',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
        ownerAvatarVisible: true,
      });
      console.log('✓ Created Owner: Amit Sharma (avatar visible to guests)');
    }

    let ownerPriya = await User.findOne({ email: 'priya@staypulse.com' });
    if (!ownerPriya) {
      ownerPriya = await User.create({
        name: 'Priya Patel',
        email: 'priya@staypulse.com',
        password: 'Password123#',
        role: 'PROPERTY_OWNER',
        phone: '+91 98222 33445',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        ownerAvatarVisible: false, // Strict test: Avatar hidden from guest view!
      });
      console.log('✓ Created Owner: Priya Patel (avatar hidden from guest view)');
    }

    let guestUser = await User.findOne({ email: 'rohit@example.com' });
    if (!guestUser) {
      guestUser = await User.findOne({ email: 'sachin@example.com' });
    }
    if (!guestUser) {
      guestUser = await User.create({
        name: 'Rohit Kumar Singh',
        email: 'rohit@example.com',
        password: 'Password123#',
        role: 'GUEST',
        phone: '+91 98765 43210',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      });
      console.log('✓ Created Guest: Rohit Kumar Singh');
    }

    // 2. Check if sample booking exists
    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0) {
      const sampleProperty = await Property.findOne({ name: 'The Grand Heritage Palace' });
      if (sampleProperty) {
        const sampleRoom = await Room.findOne({ property: sampleProperty._id });
        if (sampleRoom) {
          const checkIn = new Date();
          checkIn.setDate(checkIn.getDate() + 5);
          checkIn.setHours(0, 0, 0, 0);

          const checkOut = new Date();
          checkOut.setDate(checkOut.getDate() + 8);
          checkOut.setHours(0, 0, 0, 0);

          const nights = 3;
          const pricePerNight = sampleRoom.pricePerNight;
          const subtotal = pricePerNight * nights;
          const taxes = Math.round(subtotal * 0.12);
          const totalPrice = subtotal + taxes;

          const createdBooking = await Booking.create({
            bookingReference: 'SP-2026-HERITAGE',
            guest: guestUser._id,
            property: sampleProperty._id,
            room: sampleRoom._id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guestsCount: 2,
            nights,
            pricePerNight,
            subtotal,
            taxes,
            totalPrice,
            status: 'CONFIRMED',
          });

          // Insert database reservation slots
          const cur = new Date(checkIn);
          while (cur < checkOut) {
            const dateStr = cur.toISOString().split('T')[0];
            await RoomReservationSlot.create({
              room: sampleRoom._id,
              dateString: dateStr,
              booking: createdBooking._id,
            });
            cur.setDate(cur.getDate() + 1);
          }

          console.log('✓ Created Sample Booking: SP-2026-HERITAGE with database reservation slots for Guest User');
        }
      }
    }

    // 3. Check if properties already exist
    const count = await Property.countDocuments();
    if (count > 0) {
      console.log(`[Seed] Database already contains ${count} properties and ${await Booking.countDocuments()} bookings.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // 3. Create Hotel 1 (Jaipur - Amit)
    const hotelJaipur = await Property.create({
      owner: ownerAmit._id,
      name: 'The Grand Heritage Palace',
      tagline: 'Royal Rajasthani hospitality amidst marble courtyards',
      description: 'Immerse yourself in authentic royal Rajasthani heritage. Built with traditional sandstone carvings, fountains, and lush gardens, this heritage hotel offers bespoke service, world-class dining, and rooftop sunset views of the Pink City.',
      location: {
        address: '14 Palace Road, Civil Lines',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        zipCode: '302006',
      },
      startingPrice: 4200,
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Free WiFi', 'Swimming Pool', 'Multi-Cuisine Dining', 'Valet Parking', 'Air Conditioning', 'Spa & Wellness'],
      status: 'ACTIVE',
    });

    await Room.create([
      {
        property: hotelJaipur._id,
        roomType: 'Deluxe Heritage Room',
        description: 'Traditional carved teakwood furnishings with marble ensuite bathroom and courtyard view.',
        capacity: 2,
        bedType: '1 King Bed',
        pricePerNight: 4200,
        amenities: ['King Bed', 'AC', 'Free WiFi', 'Courtyard View', 'Smart TV'],
        images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
        status: 'AVAILABLE',
      },
      {
        property: hotelJaipur._id,
        roomType: 'Royal Maharaja Suite',
        description: 'Expansive private living salon, four-poster bed, antique brass chandelier, and deep soaking tub.',
        capacity: 4,
        bedType: '2 King Beds',
        pricePerNight: 7500,
        amenities: ['Living Room', 'Deep Soaking Tub', 'Panoramic Balcony', 'Express Check-In'],
        images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'],
        status: 'AVAILABLE',
      },
    ]);
    console.log('✓ Created The Grand Heritage Palace with 2 rooms');

    // 4. Create Hotel 2 (Goa - Amit)
    const hotelGoa = await Property.create({
      owner: ownerAmit._id,
      name: 'Azure Palms Beach Resort',
      tagline: 'Direct private beach access along the Arabian coast',
      description: 'Wake up to the rhythm of ocean waves. Azure Palms offers breezy beachside cottages, sunset deck cocktails, fresh seafood grills, and an infinity pool overlooking the Arabian Sea in vibrant North Goa.',
      location: {
        address: '88 Beachfront Lane, Calangute',
        city: 'Goa',
        state: 'Goa',
        country: 'India',
        zipCode: '403516',
      },
      startingPrice: 3800,
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
      images: [
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Beachfront Access', 'Infinity Pool', 'Seafood Restaurant', 'Cocktail Bar', 'Free WiFi'],
      status: 'ACTIVE',
    });

    await Room.create([
      {
        property: hotelGoa._id,
        roomType: 'Oceanview Cabana Suite',
        description: 'Floor-to-ceiling glass doors opening onto private sand terrace with direct beach walkway.',
        capacity: 2,
        bedType: '1 Queen Bed',
        pricePerNight: 3800,
        amenities: ['Sea View', 'Private Deck', 'Hammock', 'AC', 'Mini Fridge'],
        images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'],
        status: 'AVAILABLE',
      },
      {
        property: hotelGoa._id,
        roomType: 'Family Beach Villa',
        description: 'Two separate bedrooms, kitchenette, private plunge pool, and shaded veranda.',
        capacity: 5,
        bedType: '2 Queen Beds + 1 Sofa Bed',
        pricePerNight: 8200,
        amenities: ['Private Pool', 'Kitchenette', '2 Bathrooms', 'High-Speed WiFi'],
        images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'],
        status: 'AVAILABLE',
      },
    ]);
    console.log('✓ Created Azure Palms Beach Resort with 2 rooms');

    // 5. Create Hotel 3 (Manali - Priya)
    const hotelManali = await Property.create({
      owner: ownerPriya._id,
      name: 'Silver Pine Valley Resort',
      tagline: 'Peaceful mountain sanctuary with cedar wood chalets',
      description: 'Nestled on apple orchard hills overlooking snowcapped peaks. Features cozy cedar chalets, stone fireplaces, herbal tea gardens, and daily guided nature trails.',
      location: {
        address: '22 Apple Grove Road, Old Manali',
        city: 'Manali',
        state: 'Himachal Pradesh',
        country: 'India',
        zipCode: '175131',
      },
      startingPrice: 3100,
      coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
      images: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
      ],
      amenities: ['Mountain View Balcony', 'Wood Fireplace', 'Heated Rooms', 'Organic Dining', 'Free Parking'],
      status: 'ACTIVE',
    });

    await Room.create({
      property: hotelManali._id,
      roomType: 'Pine View Wooden Chalet',
      description: 'Hand-hewn cedar interiors, personal fireplace, heated bathroom tiles, and orchard views.',
      capacity: 3,
      bedType: '1 King Bed + 1 Daybed',
      pricePerNight: 3100,
      amenities: ['Stone Fireplace', 'Heated Flooring', 'Balcony', 'Mountain View'],
      images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'],
      status: 'AVAILABLE',
    });
    console.log('✓ Created Silver Pine Valley Resort with 1 room');

    console.log('[Seed] Seeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed data: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedInitialData();
