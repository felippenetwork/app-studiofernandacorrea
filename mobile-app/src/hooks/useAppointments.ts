import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService, CreateAppointmentPayload } from '../services/api/appointments';

export function useMyAppointments() {
  return useQuery({
    queryKey: ['appointments', 'me'],
    queryFn: () => appointmentsService.getMyAppointments(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      appointmentsService.createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) =>
      appointmentsService.cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
