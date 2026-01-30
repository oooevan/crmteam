import { createClient } from '@supabase/supabase-js';

// Ваши реальные данные напрямую (так мы на 100% исключим ошибки .env)
// 
const supabaseUrl = 'https://dtponlzqggqjzivezzpp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cG9ubHpxZ2dxanppdmV6enBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjAzMjgsImV4cCI6MjA4MzY5NjMyOH0.J5U5PJdi0Nn98jOzQSR282DwgPPECCy0FlLsaeBTBa4';

// Создаем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,      // Сохранение сессии между перезагрузками
    autoRefreshToken: true,    // Автоматическое обновление токенов
  },
});

// Типы для работы
export interface ReportsRow {
  id: string;
  data: any; 
  created_at: string;
  updated_at: string;
}
