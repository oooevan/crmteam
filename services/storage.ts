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

// Получение данных из Supabase
export const getInitialData = async (): Promise<AppData> => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('data')
      .eq('id', REPORTS_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const initialData = createInitialData();
        await saveData(initialData);
        return initialData;
      }
      throw error;
    }

    if (data && data.data) {
      const fetchedData = data.data as AppData;
      
      if (Array.isArray(fetchedData)) {
        return {} as AppData;
      }
      
      if (Object.keys(fetchedData).length === 0) {
        const initialData = createInitialData();
        await saveData(initialData);
        return initialData;
      }
      
      // Подсчитываем лиды для лога
      let totalLeads = 0;
      Object.values(fetchedData).forEach(user => {
        const userData = user as any;
        userData.projects?.forEach((p: any) => {
          Object.values(p.leads || {}).forEach((v: any) => {
            if (v && Number(v) > 0) totalLeads += Number(v);
          });
        });
      });
      
      console.log('📥 Получено из базы (Лидов: ' + totalLeads + ')');
      return fetchedData;
    }

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
  try {
    if (Array.isArray(data) || !data) {
      return;
    }

    // Подсчитываем лиды для лога
    let totalLeads = 0;
    Object.values(data).forEach(user => {
      const userData = user as any;
      userData.projects?.forEach((p: any) => {
        Object.values(p.leads || {}).forEach((v: any) => {
          if (v && Number(v) > 0) totalLeads += Number(v);
        });
      });
    });

    console.log('📤 Отправка в базу (Лидов: ' + totalLeads + ')');

    const payload = {
      id: REPORTS_ID,
      data: data
    };

    const { error } = await supabase
      .from('reports')
      .upsert(payload)
      .select();

    if (error) {
      console.error('❌ Ошибка Supabase:', error.message);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Ошибка при сохранении в Supabase:', error);
    throw error;
  }
};

// Подписка на изменения в реальном времени
export const subscribeToDataChanges = (
  callback: (data: AppData) => void,
  onStatusChange?: (connected: boolean) => void
): (() => void) => {
  const channelName = `reports-${Date.now()}`;
  
  console.log('🔌 Инициализация Realtime подписки...', { channelName, reportId: REPORTS_ID });

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reports',
        filter: `id=eq.${REPORTS_ID}`
      },
      (payload) => {
        console.log('📡 Получено событие из Supabase:', { 
          eventType: payload.eventType, 
          hasData: !!(payload.new as any)?.data,
          timestamp: new Date().toISOString()
        });
        
        if (payload.eventType === 'UPDATE' && payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data as AppData;
          
          // Подсчитываем лиды для лога
          let totalLeads = 0;
          let totalLeadEntries = 0;
          Object.values(newData).forEach(user => {
            const userData = user as any;
            userData.projects?.forEach((p: any) => {
              Object.entries(p.leads || {}).forEach(([date, v]: [string, any]) => {
                totalLeadEntries++;
                if (v && Number(v) > 0) totalLeads += Number(v);
              });
            });
          });
          
          console.log('📥 Получено обновление из базы:', { 
            totalLeads, 
            totalLeadEntries,
            users: Object.keys(newData).length,
            sample: Object.keys(newData).slice(0, 2)
          });
          callback(newData);
        } else if (payload.eventType === 'INSERT' && payload.new && (payload.new as any).data) {
          const newData = (payload.new as any).data as AppData;
          console.log('📥 Получено вставка новой записи из базы');
          callback(newData);
        } else {
          console.warn('⚠️ Неожиданное событие Realtime:', payload);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime подписка активна!', { channelName });
        onStatusChange?.(true);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Ошибка Realtime канала:', err);
        onStatusChange?.(false);
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Realtime подписка не удалась (timeout)');
        onStatusChange?.(false);
      } else if (status === 'CLOSED') {
        console.log('🔌 Realtime подписка закрыта');
        onStatusChange?.(false);
      } else {
        console.log('🔄 Статус Realtime:', status);
      }
    });

  return () => {
    console.log('🔌 Отключение Realtime подписки...', { channelName });
    supabase.removeChannel(channel);
  };
};
