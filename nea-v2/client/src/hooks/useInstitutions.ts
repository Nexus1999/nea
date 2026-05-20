import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface Institution {
  id: number;
  centerNumber: string;
  name: string;
  type: 'primary' | 'secondary' | 'college';
  category: string;
  regionId: number;
  regionName: string;
  districtId: number;
  districtName: string;
  postalAddress: string;
  email: string;
  phone: string;
}

export const useInstitutions = (filters: { type?: string; search?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['institutions', filters],
    queryFn: async () => {
      const { data } = await api.get('/institutions', { params: filters });
      return data;
    },
  });
};
