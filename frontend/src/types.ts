export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  stats?: {
    itemsListed: number;
    activeBookings: number;
    activeLockers: number;
    totalEarnings: number;
  };
}

export interface Item {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  deposit: number;
  location: string;
  image_url: string;
  item_condition: string;
  available: number;
  created_at: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_avatar?: string;
  owner_location?: string;
  bookedDates?: { start_date: string; end_date: string }[];
}

export interface Booking {
  id: number;
  item_id: number;
  renter_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  rental_price: number;
  deposit_amount: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  pickup_code: string;
  renter_notes?: string | null;
  created_at: string;
  item_title?: string;
  item_image?: string;
  item_category?: string;
  item_location?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  renter_name?: string;
  renter_email?: string;
  renter_phone?: string;
  transaction_ref?: string;
  payment_status?: string;
  payment_method?: string;
  locker_location_id?: number | null;
  locker_id?: number | null;
  locker_hub_name?: string | null;
  locker_hub_address?: string | null;
  locker_hub_city?: string | null;
  locker_hub_lat?: number | null;
  locker_hub_lng?: number | null;
  assigned_locker_number?: string | null;
  assigned_locker_size?: string | null;
}

export interface LockerLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  total_lockers: number;
  available_lockers: number;
  available_small?: number;
  available_medium?: number;
  available_large?: number;
  operating_hours?: string;
  is_virtual_simulation?: boolean;
  lat: number;
  lng: number;
  lockers?: Locker[];
}

export interface Locker {
  id: number;
  location_id: number;
  locker_number: string;
  size: 'Small' | 'Medium' | 'Large';
  hourly_rate: number;
  daily_rate: number;
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
  location_name?: string;
  location_address?: string;
}

export interface LockerBooking {
  id: number;
  locker_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  locker_number?: string;
  locker_size?: 'Small' | 'Medium' | 'Large';
  location_name?: string;
  location_address?: string;
  qr_token?: string;
  token_expires_at?: string;
  used_count?: number;
  max_uses?: number;
  qr_status?: string;
  transaction_ref?: string;
  payment_status?: string;
}

export interface LockerAccessLog {
  id: number;
  locker_id: number;
  locker_number?: string;
  location_name?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  action: string;
  status: string;
  details: string;
  timestamp: string;
}

export interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalItemBookings: number;
  totalLockerBookings: number;
  activeItemRentals: number;
  lockersOccupied: number;
  lockersMaintenance: number;
  lockersAvailable: number;
  grossRentalVolume: number;
  itemVolume: number;
  lockerVolume: number;
}
