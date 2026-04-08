import { create } from 'zustand';
import { BookingFlow, Service, Professional, Coupon } from '../types';

interface BookingState extends BookingFlow {
  // Actions
  selectService: (service: Service) => void;
  selectProfessional: (professional: Professional) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  resetBooking: () => void;
}

const initialState: BookingFlow = {
  selectedService: null,
  selectedProfessional: null,
  selectedDate: null,
  selectedTime: null,
  selectedCoupon: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  selectService: (service) =>
    set({ selectedService: service, selectedProfessional: null, selectedDate: null, selectedTime: null }),

  selectProfessional: (professional) =>
    set({ selectedProfessional: professional }),

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
