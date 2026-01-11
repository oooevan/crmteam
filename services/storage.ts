import { AppData, TARGETOLOGISTS, Project } from '../types';
import { supabase } from './supabase';

const REPORTS_ID = 'main-reports'; // ID единственной записи с данными

const ALENA_CITIES = [
  'Ростов',
  'Н.Новгород',
  'Тюмень',
  'Воронеж',
  'Ярославль',
  'Ярославль Фрунзе',
  'Красноярск',
  'ЕКБ Ботаника',
  'Рязань',
  'Магнитогорск',
  'ЕКБ',
  'Купчино',
  'Колпино'
];

const DENIS_CITIES = [
  'Новороссийск',
  'Челябинск',
  'Пермь',
  'Пенза',
  'Старый Оскол',
  'Саранск',
  'Находка',
  'Мурино (НЕ левита)',
  'Балашиха',
  'Ханты Мансийск',
  'Самара',
  'Апрелевка',
  'Казань Максимова'
];

const ALEXEY_CITIES = [
  'Краснодар',
  'Саратов',
  'Чебоксары',
  'Владивосток',
  'Ярославль',
  'Барнаул',
  'Казань МЕРИД',
  'Смоленск',
  'Екатеринбург',
  'Каменск Уральский',
  'Реутов',
  'Чита'
];

const SERGEY_CITIES = [
  'Казань (Дубравная)',
  'Севастополь',
  'Владимир',
  'Пятигорск',
  'Коломна',
  'Вологда',
  'Петергоф',
  'Красногорск Fit&Soul',
  'Саратов',
  'Магнитогорск',
  'Череповец',
  'Тула'
];

const ANASTASIA_CITIES = [
  'Белгород',
  'Пушкин',
  'Выборг',
  'Жуковский',
  'Краснодар',
  'Темрюк',
  'Домодедово',
  'Уфа',
  'Посад',
  'Орел',
  'Железногорск',
  'Подольск',
  'Братск',
  'Котельники',
  'Лобня',
  'Нижний Новгород',
  'Ростов',
  'Всеволожск',
  'Пышма'
];

const IVAN_CITIES = [
  'Химки (Сходня)',
  'Кемерово (Окт)',
  'Серпухов',
  'Камчатка',
  'Одинцово',
  'Бор'
];

const createProject = (name: string): Project => ({
  id: Math.random().toString(36).substr(2, 9),
  name,
  leads: {},
  weeks: {},
  defaultGoal: 100,
  defaultBudget: 5000,
  defaultTargetCpa: 500
});

// Функция для создания начальной структуры данных
const createInitialData = (): AppData => {
  const initialData: Partial<AppData> = {};
  
  TARGETOLOGISTS.forEach((name) => {
    let cities: string[] = [];
    
    switch (name) {
      case 'Алена': cities = ALENA_CITIES; break;
      case 'Денис': cities = DENIS_CITIES; break;
      case 'Алексей': cities = ALEXEY_CITIES; break;
      case 'Сергей': cities = SERGEY_CITIES; break;
      case 'Анастасия': cities = ANASTASIA_CITIES; break;
      case 'Иван': cities = IVAN_CITIES; break;
      default: cities = [];
    }

    initialData[name] = { projects: cities.map(city => createProject(city)) };
  });

  return initialData as AppData;
};

// Проверка, настроен ли Supabase
const isSupabaseConfigured = (): boolean => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(supabaseUrl && supabaseKey);
};

// Получение данных из Supabase
export const getInitialData = async (): Promise<AppData> => {
  // Проверяем, есть ли Supabase конфигурация
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase не настроен! Пожалуйста, настройте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env файле');
    throw new Error('Supabase не настроен. Проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  }

  try {
    // Получаем данные из Supabase
    const { data, error } = await supabase
      .from('reports')
      .select('data')
      .eq('id', REPORTS_ID)
      .single();

    if (error) {
      // Если записи нет, создаем начальную структуру
      if (error.code === 'PGRST116') {
        console.log('📝 Создание начальной записи в Supabase...');
        const initialData = createInitialData();
        await saveData(initialData);
        return initialData;
      }
      console.error('❌ Ошибка при получении данных из Supabase:', error);
      throw error;
    }

    if (data && data.data) {
      const fetchedData = data.data as AppData;
      console.log('📦 JSON из базы:', fetchedData);
      console.log('📊 Ключи в данных:', Object.keys(fetchedData));
      return fetchedData;
    }

    // Если данных нет, создаем начальную структуру
    const initialData = createInitialData();
    await saveData(initialData);
    return initialData;
  } catch (error) {
    console.error('❌ Ошибка при подключении к Supabase:', error);
    throw error;
  }
};

// Сохранение данных в Supabase с использованием upsert
export const saveData = async (data: AppData): Promise<void> => {
  // Проверяем, есть ли Supabase конфигурация
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase не настроен! Данные не будут сохранены.');
    throw new Error('Supabase не настроен. Проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  }

  try {
    // Используем upsert для создания или обновления записи
    const { error } = await supabase
      .from('reports')
      .upsert({
        id: REPORTS_ID,
        data: data
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('❌ Ошибка при сохранении данных в Supabase:', error);
      throw error;
    }
    console.log('✅ Данные успешно сохранены в Supabase');
    console.log('💾 Сохранено пользователей:', Object.keys(data).length);
    console.log('🔔 Событие должно быть отправлено через Realtime...');
  } catch (error) {
    console.error('❌ Ошибка при сохранении в Supabase:', error);
    throw error;
  }
};

// Подписка на изменения в реальном времени
export const subscribeToDataChanges = (
  callback: (data: AppData) => void
): (() => void) => {
  // Проверяем, есть ли Supabase конфигурация
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase не настроен, real-time подписка недоступна');
    return () => {}; // Пустая функция для отписки
  }

  console.log('🔔 Подписка на изменения данных в реальном времени...');
  console.log('🔍 ID записи для подписки:', REPORTS_ID);

  const channelName = `reports-${Date.now()}`; // Уникальное имя канала для каждой подписки
  console.log('📡 Имя канала:', channelName);
  console.log('📡 Фильтр подписки:', `id=eq.${REPORTS_ID}`);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*', // Слушаем все события (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'reports',
        filter: `id=eq.${REPORTS_ID}`
      },
      (payload) => {
        console.log('📡 Получено обновление из Supabase:', payload.eventType);
        console.log('📦 Полный payload:', JSON.stringify(payload, null, 2));
        
        if (payload.eventType === 'UPDATE' && payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data as AppData;
          console.log('📥 Обновление данных через real-time:', Object.keys(newData));
          // Вызываем callback для обновления UI
          callback(newData);
        } else if (payload.eventType === 'INSERT' && payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data as AppData;
          console.log('📥 Вставка данных через real-time:', Object.keys(newData));
          callback(newData);
        } else {
          console.warn('⚠️ Неожиданный формат payload:', payload);
          console.warn('⚠️ eventType:', payload.eventType);
          console.warn('⚠️ payload.new:', payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      console.log('📊 Статус подписки:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Подписка на изменения активна');
        console.log('✅ Канал:', channelName, 'подключен');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Ошибка подписки на изменения:', err);
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Таймаут при подписке на изменения');
      } else if (status === 'CLOSED') {
        console.warn('⚠️ Канал подписки закрыт:', channelName);
      } else {
        console.log('ℹ️ Статус подписки:', status, err ? `Ошибка: ${err}` : '');
      }
    });

  console.log('🔔 Подписка создана, ожидание подключения...');

  // Возвращаем функцию для отписки
  return () => {
    console.log('🔕 Отписка от изменений данных, канал:', channelName);
    supabase.removeChannel(channel).then(() => {
      console.log('✅ Канал удален:', channelName);
    });
  };
};
