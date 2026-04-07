import api from './config';

export const classroomApi = {
  getAll: async () => {
    const response = await api.get('/classrooms');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/classrooms/${id}`);
    return response.data;
  },

  create: async (classroomData) => {
    const response = await api.post('/classrooms', classroomData);
    return response.data;
  },
};