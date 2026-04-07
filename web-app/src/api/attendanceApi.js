import api from './config';

export const attendanceApi = {
  // Start attendance session (teacher)
  startAttendance: async (lectureId) => {
    const response = await api.get(`/attendance/${lectureId}/start`);
    return response.data;
  },

  // Mark attendance (student) - NOW INCLUDES NETWORK INFO
  markAttendance: async (lectureId, faceDescriptor, password,) => {
    const response = await api.post(`/attendance/${lectureId}/mark`, {
      faceDescriptor,
      password,
    });
    return response.data;
  },

  // Get attendance list
  getAttendance: async (lectureId) => {
    const response = await api.get(`/attendance/${lectureId}`);
    return response.data;
  },

  // Download PDF
  downloadPDF: async (lectureId) => {
    const response = await api.get(`/attendance/${lectureId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};