-- SQL схема для таблицы reports в Supabase
-- Выполни этот SQL в SQL Editor в Supabase Dashboard

-- Создание таблицы reports
-- ВАЖНО: Если таблица уже создана с UUID, нужно изменить тип колонки:
-- ALTER TABLE reports ALTER COLUMN id TYPE TEXT;
-- Затем установить значение: UPDATE reports SET id = 'main-reports' WHERE id IS NOT NULL LIMIT 1;
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Создание индекса для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at DESC);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Политика доступа: все могут читать и писать (для начала)
-- В продакшене следует настроить более строгие политики
CREATE POLICY "Allow all operations" ON reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Альтернативный вариант: только авторизованные пользователи
-- Раскомментируй это, если хочешь использовать аутентификацию:
-- CREATE POLICY "Allow authenticated users" ON reports
--   FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- Комментарии к таблице
COMMENT ON TABLE reports IS 'Хранилище отчетов CRM системы. Содержит данные всех таргетологов в формате JSONB';
COMMENT ON COLUMN reports.data IS 'JSON объект с данными всех таргетологов и их проектов';
COMMENT ON COLUMN reports.updated_at IS 'Время последнего обновления данных';

-- Включение Realtime для таблицы reports (важно для синхронизации между браузерами)
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
