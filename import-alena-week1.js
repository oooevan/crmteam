// Скрипт импорта данных Алёны за неделю 29.12-04.01
// Запустите этот скрипт в консоли браузера, когда залогинены как Алёна

const weekStart = '2025-12-29'; // Понедельник первой недели

// Даты недели
const dates = [
  '2025-12-29', // ПН
  '2025-12-30', // ВТ
  '2025-12-31', // СР
  '2026-01-01', // ЧТ
  '2026-01-02', // ПТ
  '2026-01-03', // СБ
  '2026-01-04', // ВС
];

// Данные проектов Алёны из таблицы
const alenaProjects = [
  {
    name: 'Ростов',
    leads: [4, 1, 0, 0, 8, 12, 5], // ПН-ВС = 30
    budget: 5000,
    spend: 10493,
    goal: 350,
    targetCpa: 700,
    bundles: [
      { bundle: 'pc80', unscrew: 3000 },
      { bundle: 'p141', unscrew: 2000 },
      { bundle: 'p13лев', unscrew: 2000 },
    ]
  },
  {
    name: 'Н.Новгород',
    leads: [5, 1, 3, 4, 19, 14, 14], // = 60
    budget: 5000,
    spend: 27995,
    goal: 467,
    targetCpa: 800,
    bundles: [
      { bundle: 'pc80', unscrew: 6000 },
      { bundle: 'p270', unscrew: 6000 },
      { bundle: '.+++.pc1', unscrew: 4000 },
    ]
  },
  {
    name: 'Тюмень',
    leads: [2, 3, 3, 8, 18, 26, 0], // нужно уточнить ВС, пока 0
    budget: 5000,
    spend: 16680,
    goal: 238,
    targetCpa: 300,
    bundles: [
      { bundle: 'pc80', unscrew: 3000 },
      { bundle: 'p270', unscrew: 3000 },
      { bundle: 'pc49', unscrew: 2500 },
    ]
  },
  {
    name: 'Воронеж',
    leads: [14, 4, 5, 12, 28, 40, 62], // = 165
    budget: 15000,
    spend: 55701,
    goal: 338,
    targetCpa: 500,
    bundles: [
      { bundle: 'p270', unscrew: 10000 },
      { bundle: 'pc80', unscrew: 7000 },
      { bundle: 'тн8.4', unscrew: 6000 },
    ]
  },
  {
    name: 'Ярославль',
    leads: [3, 1, 6, 6, 14, 16, 18], // = 64
    budget: 8250,
    spend: 40830,
    goal: 638,
    targetCpa: 500,
    bundles: [
      { bundle: 'p190', unscrew: 3500 },
      { bundle: 'p270.2', unscrew: 2000 },
      { bundle: 'pc80', unscrew: 0 },
    ]
  },
  {
    name: 'Ярославль Фрунзе',
    leads: [3, 1, 2, 2, 7, 13, 13], // = 41
    budget: 4950,
    spend: 19713,
    goal: 481,
    targetCpa: 500,
    bundles: [
      { bundle: '.+++.pc1', unscrew: 4000 },
      { bundle: 'p204', unscrew: 2000 },
      { bundle: 'p190', unscrew: 2000 },
    ]
  },
  {
    name: 'Красноярск',
    leads: [0, 5, 2, 6, 17, 12, 21], // = 63
    budget: 2000,
    spend: 21780,
    goal: 346,
    targetCpa: 600,
    bundles: [
      { bundle: 'Т1_РАСТ', unscrew: 9400 },
      { bundle: 'p187', unscrew: 4000 },
      { bundle: 'p190', unscrew: 3000 },
    ]
  },
  {
    name: 'ЕКБ Ботаника',
    leads: [1, 4, 2, 0, 0, 0, 0], // = 7 (остальные дни неизвестны)
    budget: 800,
    spend: 2000,
    goal: 286,
    targetCpa: 300,
    bundles: [
      { bundle: 'ии83', unscrew: 1200 },
    ]
  },
  {
    name: 'Рязань',
    leads: [4, 1, 1, 2, 4, 18, 7], // = 37
    budget: 4000,
    spend: 17087,
    goal: 462,
    targetCpa: 600,
    bundles: [
      { bundle: 'pc9', unscrew: 1500 },
      { bundle: 'p190', unscrew: 1500 },
      { bundle: 'тн8.4', unscrew: 1500 },
    ]
  },
  {
    name: 'Магнитогорск',
    leads: [0, 0, 0, 0, 0, 0, 0], // = 0
    budget: 0,
    spend: 0,
    goal: 0,
    targetCpa: 500,
    bundles: []
  },
  {
    name: 'ЕКБ',
    leads: [0, 0, 0, 5, 18, 12, 0], // = 35 (нужно уточнить)
    budget: 3000,
    spend: 11028,
    goal: 315,
    targetCpa: 300,
    bundles: [
      { bundle: 'pc13', unscrew: 4000 },
      { bundle: 'p190', unscrew: 2000 },
      { bundle: 'ИИ52 (40+)', unscrew: 1000 },
    ]
  },
  {
    name: 'Купчино',
    leads: [4, 3, 1, 1, 3, 6, 1], // = 19
    budget: 2100,
    spend: 7620,
    goal: 401,
    targetCpa: 500,
    bundles: [
      { bundle: 'p183', unscrew: 2500 },
      { bundle: 'pc40', unscrew: 1000 },
      { bundle: 'pc80', unscrew: 1000 },
    ]
  },
  {
    name: 'Колпино',
    leads: [0, 1, 0, 0, 6, 8, 3], // = 18
    budget: 2250,
    spend: 8390,
    goal: 466,
    targetCpa: 500,
    bundles: [
      { bundle: 'ИИ52 (40+)', unscrew: 1000 },
      { bundle: 'p312', unscrew: 1000 },
      { bundle: 'pc80', unscrew: 1000 },
    ]
  },
];

// Генерация ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Создание структуры проектов для сохранения
const projectsData = alenaProjects.map(p => {
  const leadsObj = {};
  dates.forEach((date, idx) => {
    leadsObj[date] = p.leads[idx];
  });
  
  return {
    id: generateId(),
    name: p.name,
    leads: leadsObj,
    weeks: {
      [weekStart]: {
        budget: p.budget,
        spend: p.spend,
        goal: p.goal,
        targetCpa: p.targetCpa
      }
    },
    defaultGoal: p.goal,
    defaultBudget: p.budget,
    defaultTargetCpa: p.targetCpa,
    bundles: p.bundles
  };
});

console.log('📊 Данные Алёны готовы к импорту:');
console.log(JSON.stringify(projectsData, null, 2));

// Вывод инструкций
console.log('\n\n📋 ИНСТРУКЦИЯ:');
console.log('1. Скопируйте объект projectsData выше');
console.log('2. Используйте его для обновления данных в Supabase');
console.log('3. Или вставьте вручную через интерфейс CRM');

// Экспорт для использования
window.alenaProjectsWeek1 = projectsData;
console.log('\n✅ Данные сохранены в window.alenaProjectsWeek1');
