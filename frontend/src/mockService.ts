import { User, Item, Booking, LockerLocation, Locker, LockerBooking, LockerAccessLog, AdminStats } from './types.js';
import {
  INITIAL_MOCK_USERS,
  INITIAL_MOCK_ITEMS,
  INITIAL_MOCK_LOCATIONS,
  INITIAL_MOCK_LOCKERS,
  INITIAL_MOCK_BOOKINGS,
  INITIAL_MOCK_LOCKER_BOOKINGS,
  INITIAL_MOCK_ACCESS_LOGS,
} from './mockData.js';

// Load or initialize storage
function loadStorage<T>(key: string, initial: T): T {
  try {
    const item = localStorage.getItem(`lendnest_${key}`);
    return item ? JSON.parse(item) : initial;
  } catch {
    return initial;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`lendnest_${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota
  }
}

let mockUsers: User[] = loadStorage('mock_users', INITIAL_MOCK_USERS);
let mockItems: Item[] = loadStorage('mock_items', INITIAL_MOCK_ITEMS);
let mockLocations: LockerLocation[] = loadStorage('mock_locations', INITIAL_MOCK_LOCATIONS);
let mockLockers: Locker[] = loadStorage('mock_lockers', INITIAL_MOCK_LOCKERS);
let mockBookings: Booking[] = loadStorage('mock_bookings', INITIAL_MOCK_BOOKINGS);
let mockLockerBookings: LockerBooking[] = loadStorage('mock_locker_bookings', INITIAL_MOCK_LOCKER_BOOKINGS);
let mockAccessLogs: LockerAccessLog[] = loadStorage('mock_access_logs', INITIAL_MOCK_ACCESS_LOGS);

export const mockService = {
  login(body: { email?: string; password?: string }): { success: boolean; token: string; user: User; message: string } {
    const email = (body.email || '').toLowerCase().trim();
    const user = mockUsers.find((u) => u.email.toLowerCase() === email) || mockUsers[1]; // default Sarah
    const token = `mock-token-${user.id}-${Date.now()}`;
    return {
      success: true,
      token,
      user,
      message: 'Logged in successfully (Demo Preview Mode)',
    };
  },

  register(body: any): { success: boolean; token: string; user: User; message: string } {
    const newUser: User = {
      id: Date.now(),
      name: body.name || 'New Member',
      email: body.email || `user${Date.now()}@lendnest.com`,
      role: 'user',
      phone: body.phone || '+91 99999 00000',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      location: body.location || 'Bengaluru, Karnataka',
      stats: { itemsListed: 0, activeBookings: 0, activeLockers: 0, totalEarnings: 0 },
    };
    mockUsers.push(newUser);
    saveStorage('mock_users', mockUsers);
    return {
      success: true,
      token: `mock-token-${newUser.id}-${Date.now()}`,
      user: newUser,
      message: 'Account created successfully (Demo Preview Mode)',
    };
  },

  getMe(): { success: boolean; user: User } {
    const token = localStorage.getItem('lendnest_token') || '';
    let user = mockUsers[2]; // Default Alex
    if (token.includes('mock-token-')) {
      const parts = token.split('-');
      const id = parseInt(parts[2], 10);
      user = mockUsers.find((u) => u.id === id) || user;
    }
    return { success: true, user };
  },

  updateProfile(body: any): { success: boolean; user: User; message: string } {
    const me = this.getMe().user;
    Object.assign(me, body);
    saveStorage('mock_users', mockUsers);
    return { success: true, user: me, message: 'Profile updated successfully' };
  },

  getItems(params: Record<string, any> = {}): { success: boolean; items: Item[]; count: number } {
    let items = [...mockItems];
    if (params.category && params.category !== 'all') {
      items = items.filter((i) => i.category.toLowerCase() === String(params.category).toLowerCase());
    }
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)
      );
    }
    if (params.maxPrice) {
      const max = parseFloat(params.maxPrice);
      if (!isNaN(max)) items = items.filter((i) => i.price_per_day <= max);
    }
    return { success: true, items, count: items.length };
  },

  getItemById(id: number): { success: boolean; item: Item } {
    const item = mockItems.find((i) => i.id === Number(id)) || mockItems[0];
    return { success: true, item };
  },

  createItem(body: any): { success: boolean; item: Item; message: string } {
    const me = this.getMe().user;
    const newItem: Item = {
      id: Date.now(),
      owner_id: me.id,
      title: body.title || 'Untitled Item',
      description: body.description || '',
      category: body.category || 'Electronics',
      price_per_day: parseFloat(body.price_per_day) || 500,
      deposit: parseFloat(body.deposit) || 2000,
      location: body.location || me.location || 'Bengaluru, Karnataka',
      image_url: body.image_url || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
      item_condition: body.item_condition || 'Excellent',
      available: 1,
      created_at: new Date().toISOString(),
      owner_name: me.name,
      owner_email: me.email,
    };
    mockItems.unshift(newItem);
    saveStorage('mock_items', mockItems);
    return { success: true, item: newItem, message: 'Item listing created successfully!' };
  },

  updateItem(id: number, body: any): { success: boolean; item: Item; message: string } {
    const idx = mockItems.findIndex((i) => i.id === Number(id));
    if (idx !== -1) {
      mockItems[idx] = { ...mockItems[idx], ...body };
      saveStorage('mock_items', mockItems);
      return { success: true, item: mockItems[idx], message: 'Item updated successfully' };
    }
    return { success: false, item: mockItems[0], message: 'Item not found' };
  },

  deleteItem(id: number): { success: boolean; message: string } {
    mockItems = mockItems.filter((i) => i.id !== Number(id));
    saveStorage('mock_items', mockItems);
    return { success: true, message: 'Item deleted successfully' };
  },

  uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string; size: number; mime: string; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          success: true,
          url: reader.result as string,
          filename: file.name,
          size: file.size,
          mime: file.type,
          message: 'Image uploaded successfully (Client Preview)',
        });
      };
      reader.readAsDataURL(file);
    });
  },

  createBooking(body: any): { success: boolean; booking: Booking; payment: any; message: string } {
    const me = this.getMe().user;
    const item = mockItems.find((i) => i.id === Number(body.item_id)) || mockItems[0];
    const totalDays = Number(body.total_days) || 3;
    const rentalPrice = item.price_per_day * totalDays;
    const totalAmount = rentalPrice + item.deposit;

    const newBooking: Booking = {
      id: Date.now(),
      item_id: item.id,
      renter_id: me.id,
      start_date: body.start_date || new Date().toISOString().split('T')[0],
      end_date: body.end_date || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      total_days: totalDays,
      rental_price: rentalPrice,
      deposit_amount: item.deposit,
      total_amount: totalAmount,
      status: 'confirmed',
      pickup_code: `LN-PICK-${Math.floor(1000 + Math.random() * 9000)}`,
      renter_notes: body.renter_notes || '',
      created_at: new Date().toISOString(),
      item_title: item.title,
      item_image: item.image_url,
      item_category: item.category,
      item_location: item.location,
      owner_name: item.owner_name || 'Sarah Jenkins',
      owner_phone: item.owner_phone || '+91 98201 34981',
      owner_email: item.owner_email || 'sarah@lendnest.com',
      renter_name: me.name,
      renter_email: me.email,
      renter_phone: me.phone,
      transaction_ref: `TXN-LN-${Date.now()}`,
      payment_status: 'paid',
      payment_method: body.payment_method || 'UPI',
      locker_hub_name: 'MG Road Metro Station Hub',
      assigned_locker_number: 'CM-102',
      assigned_locker_size: 'Medium',
    };

    mockBookings.unshift(newBooking);
    saveStorage('mock_bookings', mockBookings);
    return {
      success: true,
      booking: newBooking,
      payment: { status: 'paid', transaction_ref: newBooking.transaction_ref },
      message: 'Reservation confirmed! Your contactless locker pickup code has been generated.',
    };
  },

  getMyBookings(): { success: boolean; itemBookings: Booking[]; incomingBookings: Booking[]; lockerBookings: LockerBooking[] } {
    return {
      success: true,
      itemBookings: mockBookings,
      incomingBookings: [],
      lockerBookings: mockLockerBookings,
    };
  },

  getBookingById(id: number): { success: boolean; booking: Booking } {
    const booking = mockBookings.find((b) => b.id === Number(id)) || mockBookings[0];
    return { success: true, booking };
  },

  cancelBooking(id: number): { success: boolean; message: string; refund: any } {
    const b = mockBookings.find((x) => x.id === Number(id));
    if (b) b.status = 'cancelled';
    saveStorage('mock_bookings', mockBookings);
    return { success: true, message: 'Booking cancelled. Deposit refund initiated.', refund: { amount: 15000, status: 'processed' } };
  },

  getLockerLocations(): { success: boolean; locations: LockerLocation[] } {
    return { success: true, locations: mockLocations };
  },

  getLocationById(id: number): { success: boolean; location: LockerLocation } {
    const loc = mockLocations.find((l) => l.id === Number(id)) || mockLocations[0];
    return { success: true, location: loc };
  },

  getLockers(params: Record<string, any> = {}): { success: boolean; lockers: Locker[]; count: number } {
    let list = [...mockLockers];
    if (params.location_id) {
      list = list.filter((l) => l.location_id === Number(params.location_id));
    }
    return { success: true, lockers: list, count: list.length };
  },

  bookLocker(body: any): { success: boolean; booking: any; payment: any; message: string } {
    const me = this.getMe().user;
    const locker = mockLockers.find((l) => l.id === Number(body.locker_id)) || mockLockers[0];
    const newLockerBooking: LockerBooking = {
      id: Date.now(),
      locker_id: locker.id,
      user_id: me.id,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 86400000).toISOString(),
      duration_hours: 24,
      total_amount: locker.daily_rate,
      status: 'active',
      locker_number: locker.locker_number,
      locker_size: locker.size,
      location_name: locker.location_name || 'MG Road Metro Station Hub',
      qr_token: `QR-LN-${locker.locker_number}-${Date.now().toString(36).toUpperCase()}`,
      token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      used_count: 0,
      max_uses: 5,
      qr_status: 'active',
      transaction_ref: `TXN-LCK-${Date.now()}`,
      payment_status: 'paid',
    };
    mockLockerBookings.unshift(newLockerBooking);
    saveStorage('mock_locker_bookings', mockLockerBookings);
    return {
      success: true,
      booking: newLockerBooking,
      payment: { status: 'paid', transaction_ref: newLockerBooking.transaction_ref },
      message: 'Smart Locker reserved successfully! Your dynamic QR access pass is ready.',
    };
  },

  unlockLockerDemo(token: string): any {
    return {
      success: true,
      message: `Locker unlocked successfully! Relay circuit activated for 15 seconds.`,
      status: 'unlocked',
      token,
      timestamp: new Date().toISOString(),
    };
  },

  getLockerAccessLogs(): { success: boolean; logs: LockerAccessLog[] } {
    return { success: true, logs: mockAccessLogs };
  },

  getAdminStats(): { success: boolean; stats: AdminStats } {
    return {
      success: true,
      stats: {
        totalUsers: mockUsers.length + 42,
        totalListings: mockItems.length + 18,
        totalItemBookings: 68,
        totalLockerBookings: 47,
        activeItemRentals: 9,
        lockersOccupied: 4,
        lockersMaintenance: 1,
        lockersAvailable: 29,
        grossRentalVolume: 345800,
        itemVolume: 298400,
        lockerVolume: 47400,
      },
    };
  },

  getAdminUsers(): { success: boolean; users: any[] } {
    return { success: true, users: mockUsers };
  },

  getAdminBookings(): { success: boolean; bookings: any[] } {
    return { success: true, bookings: mockBookings };
  },

  getAdminLockers(): { success: boolean; lockers: any[] } {
    return { success: true, lockers: mockLockers };
  },

  updateLockerStatus(id: number, status: string): { success: boolean; message: string } {
    const l = mockLockers.find((x) => x.id === Number(id));
    if (l) (l as any).status = status;
    saveStorage('mock_lockers', mockLockers);
    return { success: true, message: `Locker status updated to ${status}` };
  },

  getAdminAccessLogs(): { success: boolean; logs: LockerAccessLog[] } {
    return { success: true, logs: mockAccessLogs };
  },

  updateHubCoordinates(id: number, body: any): { success: boolean; message: string; location: LockerLocation } {
    const loc = mockLocations.find((l) => l.id === Number(id)) || mockLocations[0];
    Object.assign(loc, body);
    saveStorage('mock_locations', mockLocations);
    return { success: true, message: 'Locker hub coordinates updated', location: loc };
  },
};
