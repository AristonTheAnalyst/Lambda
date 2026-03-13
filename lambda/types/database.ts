export interface DimUser {
  user_id: string;
  user_name: string | null;
  user_lastname: string | null;
  user_date_of_birth: string | null; // ISO date format YYYY-MM-DD
  user_gender: 'Male' | 'Female' | 'Other' | null;
  user_height_cm: number | null;
  onboarded: boolean;
  user_date_created: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
}
