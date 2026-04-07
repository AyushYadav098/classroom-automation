import api from './config';

export const authApi = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Get students by department/year filters
  getStudentsByFilter: async (filters) => {
    const response = await api.post('/auth/students/filter', filters);
    return response.data;
  },

  // Get available departments and years
  getStudentMetadata: async () => {
    const response = await api.get('/auth/students/metadata');
    return response.data;
  },
};