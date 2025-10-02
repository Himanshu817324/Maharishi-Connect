import { safeFormatDate } from './dateValidation';

export const formatDate = (date: string | number | Date): string => {
  return safeFormatDate(date);
};
