export interface DimUser {
  user_id: string;
  user_name: string;
  user_lastname: string | null;
  user_email: string;
  user_date_of_birth: string | null; // ISO date format
  user_gender: string | null;
  user_height_cm: number | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}
