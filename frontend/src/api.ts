import { User, Item, Booking, LockerLocation, Locker, LockerBooking, LockerAccessLog, AdminStats } from './types.js';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('lendnest_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async register(body: any): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async login(body: any): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateProfile(body: any): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  // Items
  async getItems(params: Record<string, any> = {}): Promise<{ success: boolean; items: Item[]; count: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const url = `${API_BASE}/items${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async getItemById(id: number): Promise<{ success: boolean; item: Item }> {
    const res = await fetch(`${API_BASE}/items/${id}`);
    return handleResponse(res);
  },

  async createItem(body: any): Promise<{ success: boolean; item: Item; message: string }> {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async updateItem(id: number, body: any): Promise<{ success: boolean; item: Item; message: string }> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async deleteItem(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Image Uploads
  async uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string; size: number; mime: string; message: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = { ...getAuthHeader() };
    // Notice: Do NOT set Content-Type header so browser automatically sets boundary for multipart/form-data
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  async deleteUploadedImage(filename: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/upload/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },


  // Bookings
  async createBooking(body: any): Promise<{ success: boolean; booking: Booking; payment: any; message: string }> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async getMyBookings(): Promise<{
    success: boolean;
    itemBookings: Booking[];
    incomingBookings: Booking[];
    lockerBookings: LockerBooking[];
  }> {
    const res = await fetch(`${API_BASE}/bookings/my-bookings`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getBookingById(id: number): Promise<{ success: boolean; booking: Booking }> {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async cancelBooking(id: number): Promise<{ success: boolean; message: string; refund: any }> {
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateBookingStatus(
    id: number,
    status: 'confirmed' | 'completed' | 'cancelled'
  ): Promise<{ success: boolean; message: string; booking: Booking; refund?: any }> {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async assignBookingLocker(
    id: number,
    body: { locker_location_id: number; size_preference?: string }
  ): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
    assignedHub: any;
    simulationNotice: string;
  }> {
    const res = await fetch(`${API_BASE}/bookings/${id}/assign-locker`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  // Smart Lockers
  async getLockerLocations(): Promise<{ success: boolean; locations: LockerLocation[] }> {
    const res = await fetch(`${API_BASE}/lockers/locations`);
    return handleResponse(res);
  },

  async getLocationById(id: number): Promise<{ success: boolean; location: LockerLocation }> {
    const res = await fetch(`${API_BASE}/lockers/locations/${id}`);
    return handleResponse(res);
  },

  async getLockers(params: Record<string, any> = {}): Promise<{ success: boolean; lockers: Locker[]; count: number }> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const url = `${API_BASE}/lockers/lockers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async bookLocker(body: any): Promise<{ success: boolean; booking: any; payment: any; message: string }> {
    const res = await fetch(`${API_BASE}/lockers/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async unlockLockerDemo(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/lockers/unlock-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ token }),
    });
    return handleResponse(res);
  },

  async getLockerAccessLogs(): Promise<{ success: boolean; logs: LockerAccessLog[] }> {
    const res = await fetch(`${API_BASE}/lockers/access-logs`);
    return handleResponse(res);
  },

  // Admin
  async getAdminStats(): Promise<{ success: boolean; stats: AdminStats }> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAdminUsers(): Promise<{ success: boolean; users: any[] }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAdminBookings(): Promise<{ success: boolean; bookings: any[] }> {
    const res = await fetch(`${API_BASE}/admin/bookings`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getAdminLockers(): Promise<{ success: boolean; lockers: any[] }> {
    const res = await fetch(`${API_BASE}/admin/lockers`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateLockerStatus(id: number, status: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin/lockers/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async getAdminAccessLogs(): Promise<{ success: boolean; logs: LockerAccessLog[] }> {
    const res = await fetch(`${API_BASE}/admin/access-logs`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateHubCoordinates(
    id: number,
    body: { lat: number; lng: number; name?: string; address?: string; city?: string; postal_code?: string }
  ): Promise<{ success: boolean; message: string; location: LockerLocation }> {
    const res = await fetch(`${API_BASE}/admin/lockers/locations/${id}/coordinates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
};

