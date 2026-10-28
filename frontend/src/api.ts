import { User, Item, Booking, LockerLocation, Locker, LockerBooking, LockerAccessLog, AdminStats } from './types.js';
import { mockService } from './mockService.js';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('lendnest_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async register(body: any): Promise<{ success: boolean; token: string; user: User; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.register(body);
    }
  },

  async login(body: any): Promise<{ success: boolean; token: string; user: User; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.login(body);
    }
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getMe();
    }
  },

  async updateProfile(body: any): Promise<{ success: boolean; user: User; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.updateProfile(body);
    }
  },

  // Items
  async getItems(params: Record<string, any> = {}): Promise<{ success: boolean; items: Item[]; count: number }> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const url = `${API_BASE}/items${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const res = await fetch(url);
      return await handleResponse(res);
    } catch {
      return mockService.getItems(params);
    }
  },

  async getItemById(id: number): Promise<{ success: boolean; item: Item }> {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`);
      return await handleResponse(res);
    } catch {
      return mockService.getItemById(id);
    }
  },

  async createItem(body: any): Promise<{ success: boolean; item: Item; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.createItem(body);
    }
  },

  async updateItem(id: number, body: any): Promise<{ success: boolean; item: Item; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.updateItem(id, body);
    }
  },

  async deleteItem(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.deleteItem(id);
    }
  },

  // Image Uploads
  async uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string; size: number; mime: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData,
      });
      return await handleResponse(res);
    } catch {
      return mockService.uploadImage(file);
    }
  },

  async deleteUploadedImage(filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/upload/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return { success: true, message: 'Image deleted from preview' };
    }
  },

  // Bookings
  async createBooking(body: any): Promise<{ success: boolean; booking: Booking; payment: any; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.createBooking(body);
    }
  },

  async getMyBookings(): Promise<{
    success: boolean;
    itemBookings: Booking[];
    incomingBookings: Booking[];
    lockerBookings: LockerBooking[];
  }> {
    try {
      const res = await fetch(`${API_BASE}/bookings/my-bookings`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getMyBookings();
    }
  },

  async getBookingById(id: number): Promise<{ success: boolean; booking: Booking }> {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getBookingById(id);
    }
  },

  async cancelBooking(id: number): Promise<{ success: boolean; message: string; refund: any }> {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.cancelBooking(id);
    }
  },

  async updateBookingStatus(
    id: number,
    status: 'confirmed' | 'completed' | 'cancelled'
  ): Promise<{ success: boolean; message: string; booking: Booking; refund?: any }> {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status }),
      });
      return await handleResponse(res);
    } catch {
      const booking = mockService.getBookingById(id).booking;
      booking.status = status;
      return { success: true, message: 'Status updated', booking };
    }
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
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/assign-locker`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      const booking = mockService.getBookingById(id).booking;
      booking.locker_hub_name = 'MG Road Metro Station Hub';
      booking.assigned_locker_number = 'CM-105';
      booking.assigned_locker_size = body.size_preference || 'Medium';
      return {
        success: true,
        message: 'Locker hub assigned successfully (Demo Mode)',
        booking,
        assignedHub: { name: 'MG Road Metro Station Hub', address: 'MG Road Concourse Level B' },
        simulationNotice: 'Locker assigned in demo simulation',
      };
    }
  },

  // Smart Lockers
  async getLockerLocations(): Promise<{ success: boolean; locations: LockerLocation[] }> {
    try {
      const res = await fetch(`${API_BASE}/lockers/locations`);
      return await handleResponse(res);
    } catch {
      return mockService.getLockerLocations();
    }
  },

  async getLocationById(id: number): Promise<{ success: boolean; location: LockerLocation }> {
    try {
      const res = await fetch(`${API_BASE}/lockers/locations/${id}`);
      return await handleResponse(res);
    } catch {
      return mockService.getLocationById(id);
    }
  },

  async getLockers(params: Record<string, any> = {}): Promise<{ success: boolean; lockers: Locker[]; count: number }> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const url = `${API_BASE}/lockers/lockers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const res = await fetch(url);
      return await handleResponse(res);
    } catch {
      return mockService.getLockers(params);
    }
  },

  async bookLocker(body: any): Promise<{ success: boolean; booking: any; payment: any; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/lockers/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.bookLocker(body);
    }
  },

  async unlockLockerDemo(token: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/lockers/unlock-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ token }),
      });
      return await handleResponse(res);
    } catch {
      return mockService.unlockLockerDemo(token);
    }
  },

  async getLockerAccessLogs(): Promise<{ success: boolean; logs: LockerAccessLog[] }> {
    try {
      const res = await fetch(`${API_BASE}/lockers/access-logs`);
      return await handleResponse(res);
    } catch {
      return mockService.getLockerAccessLogs();
    }
  },

  // Admin
  async getAdminStats(): Promise<{ success: boolean; stats: AdminStats }> {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getAdminStats();
    }
  },

  async getAdminUsers(): Promise<{ success: boolean; users: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getAdminUsers();
    }
  },

  async getAdminBookings(): Promise<{ success: boolean; bookings: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getAdminBookings();
    }
  },

  async getAdminLockers(): Promise<{ success: boolean; lockers: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/lockers`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getAdminLockers();
    }
  },

  async updateLockerStatus(id: number, status: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/lockers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status }),
      });
      return await handleResponse(res);
    } catch {
      return mockService.updateLockerStatus(id, status);
    }
  },

  async getAdminAccessLogs(): Promise<{ success: boolean; logs: LockerAccessLog[] }> {
    try {
      const res = await fetch(`${API_BASE}/admin/access-logs`, {
        headers: { ...getAuthHeader() },
      });
      return await handleResponse(res);
    } catch {
      return mockService.getAdminAccessLogs();
    }
  },

  async updateHubCoordinates(
    id: number,
    body: { lat: number; lng: number; name?: string; address?: string; city?: string; postal_code?: string }
  ): Promise<{ success: boolean; message: string; location: LockerLocation }> {
    try {
      const res = await fetch(`${API_BASE}/admin/lockers/locations/${id}/coordinates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    } catch {
      return mockService.updateHubCoordinates(id, body);
    }
  },
};
