import { Platform } from 'react-native';

// Default backend API URL. Uses localhost for web/desktop, 10.0.2.2 for Android emulator
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

export const API_BASE_URL = DEFAULT_HOST;

class ApiClient {
  private baseUrl: string = API_BASE_URL;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for snappy response

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // Gracefully fall back to local AsyncStorage when backend is offline
      // console.log(`[Backend Offline/Fallback] ${endpoint}`);
      return null;
    }
  }

  // Profile
  async getProfile() {
    return this.request<any>('/profile');
  }

  async updateProfile(profile: any) {
    return this.request<any>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // Outings
  async getOutings(usn?: string) {
    return this.request<any[]>(`/outings${usn ? `?usn=${usn}` : ''}`);
  }

  async getActiveOuting(usn?: string) {
    return this.request<any>(`/outings/active${usn ? `?usn=${usn}` : ''}`);
  }

  async applyOuting(outingData: any) {
    return this.request<any>('/outings', {
      method: 'POST',
      body: JSON.stringify(outingData),
    });
  }

  async markOutingExit(id: string, gate?: string, guard?: string) {
    return this.request<any>(`/outings/${id}/exit`, {
      method: 'PUT',
      body: JSON.stringify({ gate, guard }),
    });
  }

  async markOutingReturn(id: string, gate?: string, guard?: string) {
    return this.request<any>(`/outings/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify({ gate, guard }),
    });
  }

  // Leaves
  async getLeaves(usn?: string) {
    return this.request<any[]>(`/leaves${usn ? `?usn=${usn}` : ''}`);
  }

  async applyLeave(leaveData: any) {
    return this.request<any>('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  }

  async markLeaveReturn(id: string, gate?: string, guard?: string) {
    return this.request<any>(`/leaves/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify({ gate, guard }),
    });
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async markNotificationsRead() {
    return this.request<any>('/notifications/mark-read', { method: 'PUT' });
  }

  // Grievances
  async getGrievances() {
    return this.request<any[]>('/grievances');
  }

  async submitGrievance(ticket: any) {
    return this.request<any>('/grievances', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  // Mess Ratings & Food Inspection Photos
  async getMessRatings() {
    return this.request<any[]>('/mess/ratings');
  }

  async submitMessRating(rating: any) {
    return this.request<any>('/mess/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  // Gate Check-In & Check-Out Movement Logs
  async getGateLogs(usn?: string) {
    return this.request<any[]>(`/gate-logs${usn ? `?usn=${usn}` : ''}`);
  }

  async recordGateLog(entry: any) {
    return this.request<any>('/gate-logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  // AO Petitions (Fees Delay, Mess Bill Reduction, Study Certificate, Marks Card)
  async getAoPetitions(usn?: string) {
    return this.request<any[]>(`/ao/petitions${usn ? `?usn=${usn}` : ''}`);
  }

  async submitAoPetition(data: any) {
    return this.request<any>('/ao/petitions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveAoPetition(id: string, body?: any) {
    return this.request<any>(`/ao/petitions/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    });
  }

  async rejectAoPetition(id: string, body?: any) {
    return this.request<any>(`/ao/petitions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(body || {}),
    });
  }

  // Admin Leaves Management (Warden, SWO, HOD, AO)
  async getAdminLeaves() {
    return this.request<any[]>('/admin/leaves');
  }

  async approveLeaveAdmin(id: string, approverData: any) {
    return this.request<any>(`/admin/leaves/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(approverData),
    });
  }

  async rejectLeaveAdmin(id: string, approverData: any) {
    return this.request<any>(`/admin/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(approverData),
    });
  }

  async grantEmergencyLeaveByAO(data: any) {
    return this.request<any>('/admin/leaves/emergency', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async issueDuplicateCouponByAO(data: any) {
    return this.request<any>('/admin/leaves/duplicate-coupon', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // SWO Outpass Privilege Controls
  async getBlockedStudents() {
    return this.request<any[]>('/admin/swo/blocked-students');
  }

  async swoLockOuting(data: any) {
    return this.request<any>('/admin/swo/lock-outing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async swoPermitOuting(usn: string) {
    return this.request<any>(`/admin/swo/permit-outing/${encodeURIComponent(usn)}`, {
      method: 'PUT',
    });
  }

  // Academics & Attendance Management
  async getAcademics() {
    return this.request<any[]>('/academics');
  }

  async updateAcademics(data: any) {
    return this.request<any>('/academics/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Warden Health Room / Sick Bay
  async getHealthLogs() {
    return this.request<any[]>('/health-logs');
  }

  async addHealthLog(data: any) {
    return this.request<any>('/health-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async dischargeHealthLog(id: string, data: any) {
    return this.request<any>(`/health-logs/${id}/discharge`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Registered Students Directory
  async getStudents() {
    return this.request<any[]>('/admin/students');
  }

  // Vehicle Bookings
  async getVehicleBookings() {
    return this.request<any[]>('/vehicle-bookings');
  }

  async bookVehicle(data: any) {
    return this.request<any>('/vehicle-bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

