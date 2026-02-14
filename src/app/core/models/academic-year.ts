export interface AcademicYear {
  id: number;
  yearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPromotionCompleted: boolean;  // ✅ Important!
}