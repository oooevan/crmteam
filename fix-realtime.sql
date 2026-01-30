-- Скрипт для исправления Realtime синхронизации
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- 1. Проверяем существование таблицы и её структуру
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'reports' 
  AND table_schema = 'public';

-- 2. Проверяем, включена ли таблица в Realtime публикацию
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'reports';

-- 3. Проверяем RLS политики
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'reports';

-- 4. ИСПРАВЛЕНИЕ: Включаем Realtime для таблицы (если не включено)
-- Это главная команда для решения вашей проблемы!
ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- 5. Проверяем данные в таблице
SELECT id, created_at, updated_at FROM reports;

-- 6. Если таблица пустая или id имеет неправильный тип, создаем/обновляем запись
-- Вставляем начальную запись, если её нет
INSERT INTO reports (id, data) 
VALUES ('main-reports', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. Проверяем Row Level Security
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'reports';

-- Если RLS включен, убедимся что политики разрешают все операции
DROP POLICY IF EXISTS "Allow all operations" ON reports;
CREATE POLICY "Allow all operations" ON reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. КРИТИЧЕСКИ ВАЖНО: Проверяем, что Realtime включен глобально для проекта
-- Это нужно сделать в UI Supabase:
-- Database → Replication → Enable Realtime for 'reports' table
-- (Но SQL команда выше ALTER PUBLICATION должна это сделать)

-- 9. Финальная проверка
SELECT 
    'Realtime enabled' as status,
    count(*) as publications_count
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'reports';
