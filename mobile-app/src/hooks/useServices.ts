import { useQuery } from '@tanstack/react-query';
import { servicesService } from '../services/api/services';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => servicesService.getServices(),
    staleTime: 1000 * 60 * 10, // 10 minutes — services don't change often
  });
}

export function useProfessionals(serviceId?: string) {
  return useQuery({
    queryKey: ['professionals', serviceId],
    queryFn: () => servicesService.getProfessionals(serviceId),
    staleTime: 1000 * 60 * 10,
  });
}

export function useAvailableSlots(professionalId: string, serviceId: string, date: string) {
  return useQuery({
    queryKey: ['slots', professionalId, serviceId, date],
    queryFn: () => servicesService.getAvailableSlots(professionalId, serviceId, date),
    enabled: !!professionalId && !!serviceId && !!date,
    staleTime: 1000 * 60 * 1, // 1 minute — slots change frequently
  });
}
