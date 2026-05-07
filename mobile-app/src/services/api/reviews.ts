import { apiClient, USE_MOCK } from './client';
import { Review } from '../../types';

function mapReview(r: any): Review {
  return {
    id: r.id,
    appointmentId: r.appointment_id ?? r.appointmentId,
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: r.created_at ?? r.createdAt,
  };
}

export const reviewsService = {
  async getForAppointment(appointmentId: string): Promise<Review | null> {
    if (USE_MOCK) return null;
    const { data } = await apiClient.get(`/reviews/appointment/${appointmentId}`);
    return data.data ? mapReview(data.data) : null;
  },

  async submit(appointmentId: string, rating: number, comment?: string): Promise<Review> {
    if (USE_MOCK) {
      return { id: `rev-mock-${Date.now()}`, appointmentId, rating, comment, createdAt: new Date().toISOString() };
    }
    const { data } = await apiClient.post('/reviews', { appointmentId, rating, comment });
    return mapReview(data.data);
  },
};
