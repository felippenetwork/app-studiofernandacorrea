import { useQuery, useMutation } from '@tanstack/react-query';
import { couponsService } from '../services/api/coupons';

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponsService.getCoupons(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) => couponsService.validateCoupon(code),
  });
}
