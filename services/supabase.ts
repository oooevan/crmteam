import { createClient } from '@supabase/supabase-js';

// Диагностика: проверка наличия переменных окружения
console.log('🔍 Проверка ключей Supabase:');
console.log('  VITE_SUPABASE_URL:', !!import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_URL ? '(установлен)' : '(НЕ УСТАНОВЛЕН)');
console.log('  VITE_SUPABASE_ANON_KEY:', !!import.meta.env.VITE_SUPABASE_ANON_KEY, import.meta.env.VITE_SUPABASE_ANON_KEY ? '(установлен)' : '(НЕ УСТАНОВЛЕН)');

// Получаем URL и ключ из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials not found!');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅ есть' : '❌ отсутствует');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ есть' : '❌ отсутствует');
  console.error('   Пожалуйста, проверьте файл .env в корне проекта и перезапустите dev сервер (npm run dev)');
}

// Создаем клиент Supabase (Supabase клиент сам устанавливает правильные заголовки)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Типы для работы с Supabase
export interface ReportsRow {
  id: string;
  data: any; // AppData в формате JSON
  created_at: string;
  updated_at: string;
}
