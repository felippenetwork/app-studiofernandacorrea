import { create } from 'zustand';
import { BookingFlow, Service, ServiceVariation, Professional, Coupon } from '../types';

interface BookingState extends BookingFlow {
  // Actions
  selectService: (service: Service) => void;
  selectVariation: (variation: ServiceVariation) => void;
  selectProfessional: (professional: Professional) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  resetBooking: () => void;
}

const initialState: BookingFlow = {
  selectedService: null,
  selectedVariation: null,
  selectedProfessional: null,
  selectedDate: null,
  selectedTime: null,
  selectedCoupon: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  selectService: (service) =>
    set({ selectedService: service, selectedVariation: null, selectedProfessional: null, selectedDate: null, selectedTime: null }),

  selectVariation: (variation) =>
    set({ selectedVariation: variation }),

  selectProfessional: (professional) =>
    set({ selectedProfessional: professional, selectedTime: null }),

  selectDate: (date) =>
    set({ selectedDate: date, selectedTime: null }),

  selectTime: (time) =>
    set({ selectedTime: time }),

  applyCoupon: (coupon) =>
    set({ selectedCoupon: coupon }),

  removeCoupon: () =>
    set({ selectedCoupon: null }),

  resetBooking: () =>
    set(initialState),
}));
