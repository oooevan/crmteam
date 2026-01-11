import { createClient } from '@supabase/supabase-js';

// Ваши реальные данные напрямую (так мы на 100% исключим ошибки .env)
// 
const supabaseUrl = 'https://dtponlzqggqjzivezzpp.supabase.co/';
const supabaseAnonKey = 'sb_publishable_nknaT2_yScTYDgsdlSVHag_mPCZTN6E';

// Создаем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Типы для работы
export interface ReportsRow {
  id: string;
  data: any; 
  created_at: string;
  updated_at: string;
}
