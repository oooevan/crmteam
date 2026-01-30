// =====================================================
// СКРИПТ ИМПОРТА ДАННЫХ ЗА НЕДЕЛЮ 29.12-04.01
// =====================================================
// Как использовать:
// 1. Откройте CRM в браузере
// 2. Войдите как Администратор
// 3. Откройте DevTools (F12) -> Console
// 4. Скопируйте и вставьте этот скрипт
// 5. Нажмите Enter
// =====================================================

(async function importData() {
  const weekStart = '2025-12-29';
  const dates = [
    '2025-12-29', '2025-12-30', '2025-12-31',
    '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'
  ];
  
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  // =====================================================
  // ДАННЫЕ АЛЁНЫ
  // =====================================================
  const alenaData = [
    { name: 'Ростов', leads: [4,1,0,0,8,12,5], budget: 5000, spend: 10493, goal: 100, targetCpa: 700,
      bundles: [{bundle:'pc80',unscrew:3000},{bundle:'p141',unscrew:2000},{bundle:'p13лев',unscrew:2000}] },
    { name: 'Н.Новгород', leads: [5,1,3,4,19,14,14], budget: 5000, spend: 27995, goal: 100, targetCpa: 800,
      bundles: [{bundle:'pc80',unscrew:6000},{bundle:'p270',unscrew:6000},{bundle:'.+++.pc1',unscrew:4000}] },
    { name: 'Тюмень', leads: [2,3,3,8,18,26,0], budget: 5000, spend: 16680, goal: 100, targetCpa: 300,
      bundles: [{bundle:'pc80',unscrew:3000},{bundle:'p270',unscrew:3000},{bundle:'pc49',unscrew:2500}] },
    { name: 'Воронеж', leads: [14,4,5,12,28,40,62], budget: 15000, spend: 55701, goal: 100, targetCpa: 500,
      bundles: [{bundle:'p270',unscrew:10000},{bundle:'pc80',unscrew:7000},{bundle:'тн8.4',unscrew:6000}] },
    { name: 'Ярославль', leads: [3,1,6,6,14,16,18], budget: 8250, spend: 40830, goal: 100, targetCpa: 500,
      bundles: [{bundle:'p190',unscrew:3500},{bundle:'p270.2',unscrew:2000},{bundle:'pc80',unscrew:0}] },
    { name: 'Ярославль Фрунзе', leads: [3,1,2,2,7,13,13], budget: 4950, spend: 19713, goal: 100, targetCpa: 500,
      bundles: [{bundle:'.+++.pc1',unscrew:4000},{bundle:'p204',unscrew:2000},{bundle:'p190',unscrew:2000}] },
    { name: 'Красноярск', leads: [0,5,2,6,17,12,21], budget: 2000, spend: 21780, goal: 100, targetCpa: 600,
      bundles: [{bundle:'Т1_РАСТ',unscrew:9400},{bundle:'p187',unscrew:4000},{bundle:'p190',unscrew:3000}] },
    { name: 'ЕКБ Ботаника', leads: [1,4,2,0,0,0,0], budget: 800, spend: 2000, goal: 100, targetCpa: 300,
      bundles: [{bundle:'ии83',unscrew:1200}] },
    { name: 'Рязань', leads: [4,1,1,2,4,18,7], budget: 4000, spend: 17087, goal: 100, targetCpa: 600,
      bundles: [{bundle:'pc9',unscrew:1500},{bundle:'p190',unscrew:1500},{bundle:'тн8.4',unscrew:1500}] },
    { name: 'Магнитогорск', leads: [0,0,0,0,0,0,0], budget: 0, spend: 0, goal: 100, targetCpa: 500, bundles: [] },
    { name: 'ЕКБ', leads: [0,0,0,5,18,12,0], budget: 3000, spend: 11028, goal: 100, targetCpa: 300,
      bundles: [{bundle:'pc13',unscrew:4000},{bundle:'p190',unscrew:2000},{bundle:'ИИ52 (40+)',unscrew:1000}] },
    { name: 'Купчино', leads: [4,3,1,1,3,6,1], budget: 2100, spend: 7620, goal: 100, targetCpa: 500,
      bundles: [{bundle:'p183',unscrew:2500},{bundle:'pc40',unscrew:1000},{bundle:'pc80',unscrew:1000}] },
    { name: 'Колпино', leads: [0,1,0,0,6,8,3], budget: 2250, spend: 8390, goal: 100, targetCpa: 500,
      bundles: [{bundle:'ИИ52 (40+)',unscrew:1000},{bundle:'p312',unscrew:1000},{bundle:'pc80',unscrew:1000}] },
  ];

  // Функция преобразования данных в формат проекта
  function createProject(data) {
    const leadsObj = {};
    dates.forEach((date, idx) => {
      leadsObj[date] = data.leads[idx];
    });
    
    return {
      id: generateId(),
      name: data.name,
      leads: leadsObj,
      weeks: {
        [weekStart]: {
          budget: data.budget,
          spend: data.spend,
          goal: data.goal,
          targetCpa: data.targetCpa
        }
      },
      defaultGoal: data.goal,
      defaultBudget: data.budget,
      defaultTargetCpa: data.targetCpa,
      bundles: data.bundles || []
    };
  }

  // Создаём проекты
  const alenaProjects = alenaData.map(createProject);

  // Формируем данные для сохранения
  const importData = {
    'Алена': { projects: alenaProjects }
  };

  console.log('📊 Данные для импорта:', importData);

  // Получаем текущие данные из Supabase
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    
    // Получаем ключи из переменных окружения (они должны быть доступны в window или .env)
    const SUPABASE_URL = 'https://dtponlzqggqjzivezzpp.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cG9ubHpxZ2dxanppdmV6enBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjAzMjgsImV4cCI6MjA4MzY5NjMyOH0.J5U5PJdi0Nn98jOzQSR282DwgPPECCy0FlLsaeBTBa4';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Получаем текущие данные
    const { data: currentData, error: fetchError } = await supabase
      .from('reports')
      .select('data')
      .eq('id', 'main-reports')
      .single();
    
    if (fetchError) {
      console.error('❌ Ошибка получения данных:', fetchError);
      return;
    }

    // Мержим данные
    const existingData = currentData?.data || {};
    const mergedData = { ...existingData };
    
    // Обновляем данные Алёны
    if (!mergedData['Алена']) {
      mergedData['Алена'] = { projects: [] };
    }
    
    // Добавляем или обновляем проекты
    alenaProjects.forEach(newProject => {
      const existingIdx = mergedData['Алена'].projects.findIndex(p => p.name === newProject.name);
      if (existingIdx >= 0) {
        // Мержим лиды и недели
        const existing = mergedData['Алена'].projects[existingIdx];
        existing.leads = { ...existing.leads, ...newProject.leads };
        existing.weeks = { ...existing.weeks, ...newProject.weeks };
        existing.bundles = newProject.bundles;
      } else {
        mergedData['Алена'].projects.push(newProject);
      }
    });

    // Сохраняем в Supabase
    const { error: saveError } = await supabase
      .from('reports')
      .upsert({
        id: 'main-reports',
        data: mergedData,
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('❌ Ошибка сохранения:', saveError);
      return;
    }

    console.log('✅ Данные Алёны успешно импортированы!');
    console.log('🔄 Перезагрузите страницу чтобы увидеть изменения');
    
  } catch (err) {
    console.error('❌ Ошибка импорта:', err);
  }
})();
