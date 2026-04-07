import api from './config';

export const lectureApi = {
  create: async (lectureData) => {
    const response = await api.post('/lectures', lectureData);
    return response.data;
  },

  getMyLectures: async () => {
    const response = await api.get('/lectures/my-lectures');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/lectures/${id}`);
    return response.data;
  },

  activate: async (id) => {
    const response = await api.post(`/lectures/${id}/activate`);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await api.post(`/lectures/${id}/deactivate`);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.post(`/lectures/${id}/cancel`);
    return response.data;
  },

  search: async (searchParams) => {
    const params = new URLSearchParams();
    
    if (searchParams.query) params.append('query', searchParams.query);
    if (searchParams.date) params.append('date', searchParams.date);
    if (searchParams.classroom) params.append('classroom', searchParams.classroom);
    if (searchParams.status) params.append('status', searchParams.status);
    
    const response = await api.get(`/lectures/search?${params.toString()}`);
    return response.data;
  },
};