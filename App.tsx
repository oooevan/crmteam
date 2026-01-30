import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Target, 
  LogOut,
  ChevronRight, 
  Calendar, 
  ChevronLeft, 
  Trash2, 
  ArrowUpDown,
  Activity,
  Zap,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Role, 
  TARGETOLOGISTS, 
  AppData, 
  Project,
  UserData,
  WeeklyStats,
  BundleEntry
} from './types';
import { getInitialData, saveData, subscribeToDataChanges } from './services/storage';
import { GlassCard } from './components/ui/GlassCard';
import { ProjectRow } from './components/ProjectRow';

// --- Date Helpers ---

const CALENDAR_START_DATE = new Date('2025-12-29');

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}.${m}`;
};

const getWeekDays = (startMonday: Date) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startMonday);
    d.setDate(startMonday.getDate() + i);
    days.push({
      iso: formatDate(d),
      display: formatDisplayDate(d),
      name: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][i]
    });
  }
  return days;
};

const generateWeeks = (startDate: Date, weeksCount = 52) => {
  const weeks = [];
  for (let i = 0; i < weeksCount; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + (i * 7));
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    weeks.push({
      id: formatDate(d),
      label: `${formatDisplayDate(d)} - ${formatDisplayDate(end)}`,
      start: d,
      monthName: d.toLocaleString('ru-RU', { month: 'long' })
    });
  }
  return weeks;
};

const getMondaysInMonth = (year: number, month: number) => {
  const mondays = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 1) { 
      mondays.push(formatDate(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return mondays;
};

const isDateInMonth = (dateStr: string, referenceWeekStart: string) => {
  const d = new Date(dateStr);
  const ref = new Date(referenceWeekStart);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
};

const getMondaysInSameMonth = (referenceDateStr: string) => {
  const ref = new Date(referenceDateStr);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  
  const mondays = [];
  const d = new Date(year, month, 1);
  
  while (d.getMonth() === month) {
    if (d.getDay() === 1) { 
      mondays.push(formatDate(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return mondays;
};

const WEEKS_LIST = generateWeeks(CALENDAR_START_DATE, 52);
const generateId = () => Math.random().toString(36).substr(2, 9);
const NEW_PROJECT_TEMPLATE: Project = {
  id: '',
  name: '',
  leads: {},
  weeks: {},
  defaultGoal: 100,
  defaultBudget: 5000,
  defaultTargetCpa: 500
};

// --- UI Components ---

const StatCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
  <GlassCard className="relative overflow-hidden group p-6">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg bg-white/5 ${color} text-white`}>
          <Icon size={18} />
        </div>
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
      </div>
      <div className="mt-3 flex items-center justify-between">
         <p className="text-xs text-gray-500 font-medium">{subtext}</p>
         {trend && (
           <span className={`text-xs px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
             {trend > 0 ? '+' : ''}{trend}%
           </span>
         )}
      </div>
    </div>
  </GlassCard>
);

const ProgressBar = ({ percent }: { percent: number }) => {
  const isOver = percent > 100;
  const color = percent < 80 ? 'bg-rose-500' : percent < 100 ? 'bg-amber-500' : 'bg-emerald-500';
  const glow = percent < 80 ? 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'shadow-[0_0_10px_rgba(16,185,129,0.5)]';
  
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percent, 100)}%` }}
        transition={{ duration: 1, ease: "circOut" }}
        className={`h-full absolute top-0 left-0 rounded-full ${color} ${isOver ? glow : ''}`}
      />
      {isOver && (
        <div className="absolute top-0 right-0 h-full w-1 bg-white animate-pulse" />
      )}
    </div>
  );
};

// --- Main Components ---

const AdminDashboard: React.FC<{ 
  data: AppData; 
  weekStart: string;
  onUpdateProject: (owner: string, projectId: string, updated: Project) => void;
  onDeleteProject: (owner: string, projectId: string) => void;
}> = ({ data, weekStart, onUpdateProject, onDeleteProject }) => {
  console.log('🎯 AdminDashboard рендерится:', { 
    dataKeys: Object.keys(data),
    usersCount: Object.keys(data).length,
    users: Object.keys(data).map(key => ({ name: key, projectsCount: data[key]?.projects?.length || 0 }))
  });
  
  const days = useMemo(() => getWeekDays(new Date(weekStart)).map(d => d.iso), [weekStart]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'leads', direction: 'desc' });

  // Константа для "нет бюджета"
  const NO_BUDGET_VALUE = -1;

  // --- Statistics Logic (игнорируем дни с "н") ---
  const stats = useMemo(() => {
    let totalLeads = 0, totalSpend = 0, totalGoal = 0;
    const memberPerformance = Object.entries(data).map(([name, userData]) => {
      const user = userData as UserData;
      let mLeads = 0, mSpend = 0, mGoal = 0;
      user.projects.forEach(p => {
        const pLeads = days.reduce((acc, date) => {
          const val = p.leads[date];
          if (val === NO_BUDGET_VALUE || val === undefined) return acc;
          return acc + val;
        }, 0);
        const wStats = p.weeks[weekStart] || { spend: 0, goal: p.defaultGoal };
        mLeads += pLeads;
        mSpend += (wStats.spend || 0);
        mGoal += (wStats.goal || 0);
      });
      totalLeads += mLeads;
      totalSpend += mSpend;
      totalGoal += mGoal;
      return { name, completion: mGoal > 0 ? (mLeads / mGoal) * 100 : 0, leads: mLeads, cpa: mLeads > 0 ? mSpend / mLeads : 0 };
    });
    memberPerformance.sort((a, b) => b.completion - a.completion);
    return { totalLeads, totalSpend, avgCpa: totalLeads > 0 ? totalSpend / totalLeads : 0, memberPerformance, totalGoal };
  }, [data, days, weekStart]);

  // --- Dynamics Table Logic (игнорируем дни с "н") ---
  const dynamicsData = useMemo(() => {
    const prevWeekIndex = WEEKS_LIST.findIndex(w => w.id === weekStart) - 1;
    const prevWeekStart = prevWeekIndex >= 0 ? WEEKS_LIST[prevWeekIndex].id : null;
    const prevDays = prevWeekStart ? getWeekDays(new Date(prevWeekStart)).map(d => d.iso) : [];

    const rows = Object.entries(data).map(([name, userData]) => {
      let currentFact = 0, currentPlan = 0, currentBudget = 0;
      const dailyFacts: (number | string)[] = days.map(() => 0);

      let prevFact = 0, prevBudget = 0;

      (userData as UserData).projects.forEach(p => {
        // Current Week Stats
        days.forEach((d, idx) => {
          const val = p.leads[d];
          if (val === NO_BUDGET_VALUE) {
            // Если хотя бы один проект имеет "н", показываем "н"
            dailyFacts[idx] = dailyFacts[idx] === 0 ? 'н' : dailyFacts[idx];
          } else if (val !== undefined && val !== NO_BUDGET_VALUE) {
            if (dailyFacts[idx] !== 'н') {
              dailyFacts[idx] = (dailyFacts[idx] as number) + val;
            }
            currentFact += val;
          }
        });
        const wStats = p.weeks[weekStart] || { goal: p.defaultGoal, spend: 0 };
        currentPlan += (wStats.goal || 0);
        currentBudget += (wStats.spend || 0);

        // Previous Week Stats (for Delta)
        if (prevWeekStart) {
          prevDays.forEach(d => {
            const val = p.leads[d];
            if (val !== NO_BUDGET_VALUE && val !== undefined) {
              prevFact += val;
            }
          });
          const prevWStats = p.weeks[prevWeekStart] || { spend: 0 };
          prevBudget += (prevWStats.spend || 0);
        }
      });

      const currentCPL = currentFact > 0 ? currentBudget / currentFact : 0;
      const prevCPL = prevFact > 0 ? prevBudget / prevFact : 0;

      // Deltas
      const deltaCPL = prevCPL > 0 ? ((currentCPL - prevCPL) / prevCPL) * 100 : 0;
      const deltaBudget = prevBudget > 0 ? ((currentBudget - prevBudget) / prevBudget) * 100 : 0;
      const deltaFact = prevFact > 0 ? ((currentFact - prevFact) / prevFact) * 100 : 0;
      const planPercent = currentPlan > 0 ? (currentFact / currentPlan) * 100 : 0;

      return {
        name,
        dailyFacts,
        currentFact,
        currentPlan,
        currentBudget,
        currentCPL,
        deltaCPL,
        deltaBudget,
        deltaFact,
        planPercent
      };
    }).sort((a, b) => b.currentFact - a.currentFact);

    // Totals for footer (dailyFacts может содержать числа или 'н')
    const totals = rows.reduce((acc: { dailyFacts: (number | string)[]; currentFact: number; currentPlan: number; currentBudget: number }, row) => ({
      dailyFacts: acc.dailyFacts.map((v, i) => {
        const rowVal = row.dailyFacts[i];
        if (rowVal === 'н') return v === 0 ? 'н' : v;
        if (v === 'н') return v;
        return (v as number) + (rowVal as number);
      }),
      currentFact: acc.currentFact + row.currentFact,
      currentPlan: acc.currentPlan + row.currentPlan,
      currentBudget: acc.currentBudget + row.currentBudget,
    }), { 
      dailyFacts: [0,0,0,0,0,0,0] as (number | string)[], 
      currentFact: 0, 
      currentPlan: 0, 
      currentBudget: 0 
    });

    const totalCPL = totals.currentFact > 0 ? totals.currentBudget / totals.currentFact : 0;
    const totalPlanPercent = totals.currentPlan > 0 ? (totals.currentFact / totals.currentPlan) * 100 : 0;

    return { rows, totals, totalCPL, totalPlanPercent };
  }, [data, days, weekStart]);

  // --- Monthly Table Logic ---
  const months = useMemo(() => Array.from({length: 12}, (_, i) => ({
    id: i,
    label: new Date(2026, i, 1).toLocaleString('ru-RU', { month: 'long' }).toUpperCase(),
    year: 2026
  })), []);
  const currentMonth = months[selectedMonthIndex];

  const monthlyProjects = useMemo(() => {
    console.log('📊 monthlyProjects вычисляется:', { 
      dataKeys: Object.keys(data),
      dataEntries: Object.entries(data).map(([key, val]) => ({ owner: key, projectsCount: (val as UserData)?.projects?.length || 0 }))
    });
    
    const list: { owner: string; project: Project; leads: number; goal: number; budget: number; spend: number; actualCpa: number; avgTargetCpa: number; percent: number }[] = [];
    Object.entries(data).forEach(([owner, userData]) => {
      const projects = (userData as UserData).projects || [];
      console.log(`📋 Обработка пользователя ${owner}:`, { projectsCount: projects.length });
      projects.forEach(project => {
        let leads = 0, goal = 0, budget = 0, spend = 0, targetCpaSum = 0, weeksCount = 0;
        
        Object.entries(project.leads).forEach(([date, count]) => {
            const d = new Date(date);
            // Игнорируем дни с "н" (NO_BUDGET_VALUE = -1)
            if (d.getMonth() === currentMonth.id && d.getFullYear() === currentMonth.year && Number(count) !== NO_BUDGET_VALUE) {
              leads += Number(count);
            }
        });

        getMondaysInMonth(currentMonth.year, currentMonth.id).forEach(m => {
            const wStats = project.weeks[m] || { goal: project.defaultGoal, budget: project.defaultBudget, spend: 0, targetCpa: project.defaultTargetCpa };
            goal += (wStats.goal || 0);
            budget += (wStats.budget || 0);
            spend += (project.weeks[m]?.spend || 0);
            targetCpaSum += (wStats.targetCpa || project.defaultTargetCpa);
            weeksCount++;
        });

        const avgTargetCpa = weeksCount > 0 ? targetCpaSum / weeksCount : project.defaultTargetCpa;
        list.push({
            owner, project, leads, goal, budget, spend,
            actualCpa: leads > 0 ? spend / leads : 0,
            avgTargetCpa,
            percent: goal > 0 ? (leads / goal) * 100 : 0
        });
      });
    });

    return list.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof typeof a];
        let bVal: any = b[sortConfig.key as keyof typeof b];
        if (sortConfig.key === 'projectName') { aVal = a.project.name.toLowerCase(); bVal = b.project.name.toLowerCase(); }
        return (aVal < bVal ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  }, [data, currentMonth, sortConfig]);

  // --- Месячная динамика таргетологов ---
  const monthlyDynamicsData = useMemo(() => {
    // Получаем все дни текущего календарного месяца
    const year = currentMonth.year;
    const month = currentMonth.id; // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthDays: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      monthDays.push(date.toISOString().split('T')[0]);
    }

    const rows = Object.entries(data).map(([name, userData]) => {
      let monthFact = 0, monthPlan = 0, monthBudget = 0, monthSpend = 0;
      const dailyFacts: (number | string)[] = monthDays.map(() => 0);

      (userData as UserData).projects.forEach(p => {
        // Daily leads for the month
        monthDays.forEach((d, idx) => {
          const val = p.leads[d];
          if (val === NO_BUDGET_VALUE) {
            dailyFacts[idx] = dailyFacts[idx] === 0 ? 'н' : dailyFacts[idx];
          } else if (val !== undefined && val !== NO_BUDGET_VALUE) {
            if (dailyFacts[idx] !== 'н') {
              dailyFacts[idx] = (dailyFacts[idx] as number) + val;
            }
            monthFact += val;
          }
        });

        // Sum weekly stats for all weeks in the month
        getMondaysInMonth(year, month).forEach(monday => {
          const wStats = p.weeks[monday] || { goal: p.defaultGoal, budget: p.defaultBudget, spend: 0 };
          monthPlan += (wStats.goal || 0);
          monthBudget += (wStats.budget || 0);
          monthSpend += (wStats.spend || 0);
        });
      });

      const monthCPL = monthFact > 0 ? monthSpend / monthFact : 0;
      const planPercent = monthPlan > 0 ? (monthFact / monthPlan) * 100 : 0;

      return {
        name,
        dailyFacts,
        monthFact,
        monthPlan,
        monthBudget,
        monthSpend,
        monthCPL,
        planPercent
      };
    }).sort((a, b) => b.monthFact - a.monthFact);

    // Totals
    const totals = rows.reduce((acc, row) => ({
      dailyFacts: acc.dailyFacts.map((v, i) => {
        const rowVal = row.dailyFacts[i];
        if (rowVal === 'н') return v === 0 ? 'н' : v;
        if (v === 'н') return v;
        return (v as number) + (rowVal as number);
      }),
      monthFact: acc.monthFact + row.monthFact,
      monthPlan: acc.monthPlan + row.monthPlan,
      monthBudget: acc.monthBudget + row.monthBudget,
      monthSpend: acc.monthSpend + row.monthSpend,
    }), { 
      dailyFacts: monthDays.map(() => 0) as (number | string)[], 
      monthFact: 0, 
      monthPlan: 0, 
      monthBudget: 0,
      monthSpend: 0
    });

    const totalsCPL = totals.monthFact > 0 ? totals.monthSpend / totals.monthFact : 0;
    const totalsPlanPercent = totals.monthPlan > 0 ? (totals.monthFact / totals.monthPlan) * 100 : 0;

    return { rows, totals: { ...totals, monthCPL: totalsCPL, planPercent: totalsPlanPercent }, monthDays, daysInMonth };
  }, [data, currentMonth]);

  // --- Сводная таблица связок ---
  // Сводная таблица связок за текущую неделю
  const bundlesSummary = useMemo(() => {
    const bundlesByName: Record<string, Record<string, number>> = {};
    const targetologists = Object.keys(data);
    
    Object.entries(data).forEach(([owner, userData]) => {
      const user = userData as UserData;
      user.projects?.forEach(project => {
        // Берём связки из текущей недели
        const weekStats = project.weeks[weekStart];
        const weekBundles = weekStats?.bundles || [];
        weekBundles.forEach(bundle => {
          if (bundle.bundle && bundle.bundle.trim()) {
            const bundleName = bundle.bundle.trim();
            if (!bundlesByName[bundleName]) {
              bundlesByName[bundleName] = {};
              targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
            }
            bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
          }
        });
      });
    });

    const rows = Object.entries(bundlesByName).map(([bundleName, values]) => {
      const total = Object.values(values).reduce((sum, v) => sum + v, 0);
      return { bundleName, values, total };
    }).sort((a, b) => b.total - a.total);

    return { rows, targetologists };
  }, [data, weekStart]);
  
  // Сводная таблица связок за месяц (топ-15)
  const monthlyBundlesSummary = useMemo(() => {
    const bundlesByName: Record<string, Record<string, number>> = {};
    const targetologists = Object.keys(data);
    const mondays = getMondaysInMonth(currentMonth.year, currentMonth.id);
    
    Object.entries(data).forEach(([owner, userData]) => {
      const user = userData as UserData;
      user.projects?.forEach(project => {
        // Суммируем связки за все недели месяца
        mondays.forEach(monday => {
          const weekStats = project.weeks[monday];
          const weekBundles = weekStats?.bundles || [];
          weekBundles.forEach(bundle => {
            if (bundle.bundle && bundle.bundle.trim()) {
              const bundleName = bundle.bundle.trim();
              if (!bundlesByName[bundleName]) {
                bundlesByName[bundleName] = {};
                targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
              }
              bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
            }
          });
        });
      });
    });

    const rows = Object.entries(bundlesByName).map(([bundleName, values]) => {
      const total = Object.values(values).reduce((sum, v) => sum + v, 0);
      return { bundleName, values, total };
    }).sort((a, b) => b.total - a.total).slice(0, 15); // Топ-15

    return { rows, targetologists };
  }, [data, currentMonth]);

  const handleUpdateMonthlyGoal = (owner: string, project: Project, newMonthlyGoal: number) => {
    console.log('📝 handleUpdateMonthlyGoal вызван:', { owner, projectId: project.id, newMonthlyGoal });
    console.log('📝 Текущий проект перед обновлением:', {
      id: project.id,
      name: project.name,
      leadsCount: Object.keys(project.leads || {}).length,
      weeksCount: Object.keys(project.weeks || {}).length,
      leads: project.leads,
      weeks: project.weeks
    });
    const mondays = getMondaysInMonth(currentMonth.year, currentMonth.id);
    if (mondays.length === 0) return;
    const weeklyGoal = Math.round(newMonthlyGoal / mondays.length);
    // ВАЖНО: Сохраняем leads при обновлении!
    const updated = { 
      ...project, 
      leads: { ...project.leads }, // Явно копируем leads
      weeks: { ...project.weeks }, 
      defaultGoal: weeklyGoal 
    };
    mondays.forEach(m => {
        updated.weeks[m] = { ...(updated.weeks[m] || { budget: project.defaultBudget, spend: 0, targetCpa: project.defaultTargetCpa }), goal: weeklyGoal };
    });
    console.log('📝 Обновленный проект перед передачей в onUpdateProject:', {
      id: updated.id,
      name: updated.name,
      leadsCount: Object.keys(updated.leads || {}).length,
      weeksCount: Object.keys(updated.weeks || {}).length,
      leads: updated.leads,
      weeks: updated.weeks
    });
    onUpdateProject(owner, project.id, updated);
  };

  const sortIcon = (key: string) => (
    <ArrowUpDown size={12} className={`transition-opacity ${sortConfig.key === key ? 'opacity-100 text-indigo-400' : 'opacity-0 group-hover/th:opacity-50'}`} />
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Всего лидов" 
          value={stats.totalLeads} 
          subtext={`${((stats.totalLeads / stats.totalGoal) * 100 || 0).toFixed(1)}% от плана`}
          icon={Users} color="text-indigo-400" 
        />
        <StatCard 
          title="Расход" 
          value={`${stats.totalSpend.toLocaleString()} ₽`} 
          subtext="За неделю"
          icon={DollarSign} color="text-emerald-400" 
        />
        <StatCard 
          title="CPL (Факт)" 
          value={`${stats.avgCpa.toFixed(0)} ₽`} 
          subtext="Средняя стоимость"
          icon={Target} color="text-rose-400" 
        />
        <StatCard 
          title="Проектов" 
          value={Object.values(data).reduce((acc: number, u) => acc + (u as UserData).projects.length, 0)} 
          subtext="Активные кампании"
          icon={Activity} color="text-amber-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
        {/* Weekly Dynamics Table (The Complex One) */}
        <GlassCard className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-400" size={18} />
              Динамика недели (Таргетологи)
            </h3>
            <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">{WEEKS_LIST.find(w => w.id === weekStart)?.label}</span>
          </div>
          <div className="flex-1 table-scroll-container overflow-auto">
            <table className="w-full text-xs text-left border-collapse mobile-table">
              <thead className="bg-white/5 sticky top-0 z-10 text-gray-400 font-medium">
                <tr>
                  <th className="p-1.5 md:p-2 border-b border-white/10 min-w-[80px] md:min-w-[120px] sticky-col bg-slate-900/95 backdrop-blur-sm">Таргетолог</th>
                  {['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => <th key={d} className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[40px] md:min-w-[60px]">{d}</th>)}
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 bg-emerald-900/10 text-emerald-400 font-bold min-w-[50px] md:min-w-[70px]">Факт</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">План</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 bg-gray-800/50 min-w-[70px] md:min-w-[100px]">Бюджет</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">CPL</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]" title="Динамика CPL">Δ CPL</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]" title="Динамика Бюджета">Δ Бдж</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]" title="Динамика Факта">Δ Факт</th>
                  <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">План %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dynamicsData.rows.map((row, rowIdx) => (
                  <tr key={row.name} className={`${rowIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'} hover:bg-white/5 transition-colors`}>
                    <td className={`p-1.5 md:p-2 font-medium text-white min-w-[80px] md:min-w-[120px] sticky-col ${rowIdx % 2 === 0 ? 'bg-slate-900/95' : 'bg-slate-800/95'} backdrop-blur-sm`}>{row.name}</td>
                    {row.dailyFacts.map((v, i) => (
                      <td key={i} className={`p-1.5 md:p-2 text-center ${v === 'н' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-gray-400'}`}>{v}</td>
                    ))}
                    <td className="p-1.5 md:p-2 text-center font-bold text-emerald-400 bg-emerald-900/10 border-l border-r border-white/5">{row.currentFact}</td>
                    <td className="p-1.5 md:p-2 text-center text-gray-400">{row.currentPlan}</td>
                    <td className="p-1.5 md:p-2 text-center text-gray-300 bg-gray-800/30">{row.currentBudget.toLocaleString()}</td>
                    <td className="p-1.5 md:p-2 text-center font-medium">{row.currentCPL.toFixed(0)}</td>
                    <td className={`p-1.5 md:p-2 text-center ${row.deltaCPL > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{row.deltaCPL.toFixed(0)}%</td>
                    <td className={`p-1.5 md:p-2 text-center ${row.deltaBudget > 0 ? 'text-gray-200' : 'text-gray-500'}`}>{row.deltaBudget.toFixed(0)}%</td>
                    <td className={`p-1.5 md:p-2 text-center ${row.deltaFact > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.deltaFact.toFixed(0)}%</td>
                    <td className="p-1.5 md:p-2 text-center font-bold text-white relative">
                      <div className="absolute inset-0 bg-indigo-500/10 z-0" style={{ width: `${Math.min(row.planPercent, 100)}%` }} />
                      <span className="relative z-10">{row.planPercent.toFixed(0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-900/20 font-bold text-white border-t border-indigo-500/30 sticky bottom-0">
                <tr>
                  <td className="p-1.5 md:p-2 sticky-col bg-indigo-900/80 backdrop-blur-sm">ИТОГО</td>
                  {dynamicsData.totals.dailyFacts.map((v, i) => (
                    <td key={i} className={`p-1.5 md:p-2 text-center ${v === 'н' ? 'bg-rose-500/20 text-rose-400' : ''}`}>{v}</td>
                  ))}
                  <td className="p-1.5 md:p-2 text-center text-emerald-300 bg-emerald-900/20 border-x border-indigo-500/30">{dynamicsData.totals.currentFact}</td>
                  <td className="p-1.5 md:p-2 text-center">{dynamicsData.totals.currentPlan}</td>
                  <td className="p-1.5 md:p-2 text-center">{dynamicsData.totals.currentBudget.toLocaleString()}</td>
                  <td className="p-1.5 md:p-2 text-center">{dynamicsData.totalCPL.toFixed(0)}</td>
                  <td colSpan={3}></td>
                  <td className="p-1.5 md:p-2 text-center text-indigo-300">{dynamicsData.totalPlanPercent.toFixed(0)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>

        {/* Rating Chart */}
        <GlassCard className="p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <BarChart3 className="text-indigo-400" size={18} />
             Рейтинг выполнения
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.memberPerformance} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={70} tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="completion" radius={[0, 4, 4, 0]} barSize={24}>
                  {stats.memberPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Monthly Projects Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <PieChartIcon className="text-purple-400" />
               Сводная (Месяц)
            </h3>
            <div className="flex items-center bg-black/40 rounded-lg border border-white/10 p-1">
                 <button onClick={() => setSelectedMonthIndex(p => Math.max(0, p - 1))} disabled={selectedMonthIndex === 0} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                 <div className="px-6 text-sm font-bold text-white min-w-[140px] text-center">{currentMonth.label}</div>
                 <button onClick={() => setSelectedMonthIndex(p => Math.min(11, p + 1))} disabled={selectedMonthIndex === 11} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
        </div>
        
        <div className="table-scroll-container overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse mobile-table">
            <thead>
              <tr className="text-gray-500 text-xs font-semibold uppercase bg-black/20 border-b border-white/5 tracking-wider">
                {[
                  { id: 'owner', label: 'Таргетолог', sticky: true },
                  { id: 'projectName', label: 'Проект' },
                  { id: 'leads', label: 'Лиды' },
                  { id: 'goal', label: 'План' },
                  { id: 'percent', label: '%' },
                  { id: 'budget', label: 'Бюджет' },
                  { id: 'spend', label: 'Открут' },
                  { id: 'actualCpa', label: 'CPA' },
                  { id: 'avgTargetCpa', label: 'KPI' },
                ].map((h, idx) => (
                  <th key={h.id} className={`p-2 md:p-4 cursor-pointer group/th hover:text-white transition-colors ${idx === 0 ? 'sticky-col bg-slate-900/95 backdrop-blur-sm min-w-[80px]' : ''}`} onClick={() => setSortConfig({ key: h.id, direction: sortConfig.key === h.id && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>
                    <div className="flex items-center gap-1 justify-center first:justify-start">
                      {h.label}
                      {sortIcon(h.id)}
                    </div>
                  </th>
                ))}
                <th className="p-2 md:p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {monthlyProjects.map(({ owner, project, leads, goal, budget, spend, actualCpa, avgTargetCpa, percent }, rowIdx) => (
                  <tr key={project.id} className={`${rowIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'} hover:bg-white/[0.05] transition-colors group`}>
                    <td className={`p-2 md:p-4 text-indigo-300 font-medium sticky-col ${rowIdx % 2 === 0 ? 'bg-slate-900/95' : 'bg-slate-800/95'} backdrop-blur-sm text-sm`}>{owner}</td>
                    <td className="p-2 md:p-4">
                      <input 
                        className="bg-transparent w-full text-gray-200 focus:text-white focus:outline-none" 
                        value={project.name} 
                        onChange={(e) => {
                          console.log('📝 onChange в инпуте имени вызван:', { owner, projectId: project.id, newValue: e.target.value });
                          console.log('📝 Текущий проект перед обновлением имени:', {
                            id: project.id,
                            name: project.name,
                            leadsCount: Object.keys(project.leads || {}).length,
                            weeksCount: Object.keys(project.weeks || {}).length,
                            leads: project.leads,
                            weeks: project.weeks
                          });
                          // ВАЖНО: Сохраняем leads и weeks при обновлении имени!
                          const updated = { 
                            ...project, 
                            name: e.target.value,
                            leads: { ...project.leads }, // Явно копируем leads
                            weeks: { ...project.weeks }  // Явно копируем weeks
                          };
                          console.log('📝 Обновленный проект после изменения имени:', {
                            id: updated.id,
                            name: updated.name,
                            leadsCount: Object.keys(updated.leads || {}).length,
                            weeksCount: Object.keys(updated.weeks || {}).length,
                            leads: updated.leads,
                            weeks: updated.weeks
                          });
                          onUpdateProject(owner, project.id, updated);
                        }} 
                      />
                    </td>
                    <td className="p-2 md:p-4 text-center text-white font-bold">{leads}</td>
                    <td className="p-2 md:p-4 text-center">
                      <input 
                        type="number"
                        className="bg-black/20 text-center rounded py-1 px-1 md:px-2 text-gray-300 focus:text-white w-16 md:w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={goal || ''}
                        onChange={(e) => handleUpdateMonthlyGoal(owner, project, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 md:p-4 min-w-[80px] md:min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={percent >= 100 ? 'text-emerald-400' : 'text-gray-400'}>{percent.toFixed(0)}%</span>
                        </div>
                        <ProgressBar percent={percent} />
                      </div>
                    </td>
                    <td className="p-2 md:p-4 text-center text-gray-500 text-xs md:text-sm">{budget.toLocaleString()}</td>
                    <td className="p-2 md:p-4 text-center text-white text-xs md:text-sm">{spend.toLocaleString()}</td>
                    <td className={`p-2 md:p-4 text-center font-bold ${actualCpa <= avgTargetCpa ? 'text-emerald-400' : 'text-rose-400'}`}>{actualCpa.toFixed(0)}</td>
                    <td className="p-2 md:p-4 text-center text-gray-500">{avgTargetCpa.toFixed(0)}</td>
                    <td className="p-2 md:p-4 text-center opacity-0 group-hover:opacity-100 md:transition-opacity">
                      <button onClick={() => onDeleteProject(owner, project.id)} className="text-gray-600 hover:text-rose-400"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Месячная динамика таргетологов */}
      <GlassCard className="overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="text-blue-400" size={18} />
            Динамика месяца (Таргетологи)
          </h3>
          <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">
            {currentMonth.label}
          </span>
        </div>
        <div className="table-scroll-container overflow-auto max-h-[500px]">
          <table className="w-full text-xs text-left border-collapse mobile-table">
            <thead className="bg-white/5 sticky top-0 z-10 text-gray-400 font-medium">
              <tr>
                <th className="p-1.5 md:p-2 border-b border-white/10 min-w-[80px] md:min-w-[120px] sticky-col bg-slate-900/95 backdrop-blur-sm">Таргетолог</th>
                {monthlyDynamicsData.monthDays.map((date, i) => {
                  const day = new Date(date).getDate();
                  const isWeekend = [0, 6].includes(new Date(date).getDay());
                  return (
                    <th key={date} className={`p-1 text-center border-b border-white/10 min-w-[28px] ${isWeekend ? 'text-rose-400/70' : ''}`}>
                      {day}
                    </th>
                  );
                })}
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 bg-emerald-900/10 text-emerald-400 font-bold min-w-[50px] md:min-w-[70px]">Факт</th>
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">План</th>
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 bg-gray-800/50 min-w-[70px] md:min-w-[100px]">Бюджет</th>
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[70px] md:min-w-[100px]">Расход</th>
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">CPL</th>
                <th className="p-1.5 md:p-2 text-center border-b border-white/10 min-w-[50px] md:min-w-[70px]">План %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthlyDynamicsData.rows.map((row, rowIdx) => (
                <tr key={row.name} className={`${rowIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'} hover:bg-white/5 transition-colors`}>
                  <td className={`p-1.5 md:p-2 font-medium text-white min-w-[80px] md:min-w-[120px] sticky-col ${rowIdx % 2 === 0 ? 'bg-slate-900/95' : 'bg-slate-800/95'} backdrop-blur-sm`}>{row.name}</td>
                  {row.dailyFacts.map((v, i) => {
                    const isWeekend = [0, 6].includes(new Date(monthlyDynamicsData.monthDays[i]).getDay());
                    return (
                      <td key={i} className={`p-1 text-center text-[10px] ${v === 'н' ? 'bg-rose-500/20 text-rose-400 font-bold' : v === 0 ? 'text-gray-600' : 'text-gray-300'} ${isWeekend ? 'bg-white/[0.02]' : ''}`}>
                        {v === 0 ? '·' : v}
                      </td>
                    );
                  })}
                  <td className="p-1.5 md:p-2 text-center font-bold text-emerald-400 bg-emerald-900/10 border-l border-r border-white/5">{row.monthFact}</td>
                  <td className="p-1.5 md:p-2 text-center text-gray-400">{row.monthPlan}</td>
                  <td className="p-1.5 md:p-2 text-center text-gray-300 bg-gray-800/30">{row.monthBudget.toLocaleString()}</td>
                  <td className="p-1.5 md:p-2 text-center text-white">{row.monthSpend.toLocaleString()}</td>
                  <td className="p-1.5 md:p-2 text-center font-medium">{row.monthCPL > 0 ? row.monthCPL.toFixed(0) + ' ₽' : '—'}</td>
                  <td className={`p-1.5 md:p-2 text-center font-bold ${row.planPercent >= 100 ? 'text-emerald-400' : row.planPercent >= 70 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {row.planPercent.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-900/30 font-bold text-white border-t-2 border-indigo-500/50 sticky bottom-0">
              <tr>
                <td className="p-1.5 md:p-2 sticky-col bg-indigo-900/80 backdrop-blur-sm">ИТОГО</td>
                {monthlyDynamicsData.totals.dailyFacts.map((v, i) => {
                  const isWeekend = [0, 6].includes(new Date(monthlyDynamicsData.monthDays[i]).getDay());
                  return (
                    <td key={i} className={`p-1 text-center text-[10px] ${v === 'н' ? 'text-rose-400' : v === 0 ? 'text-gray-500' : 'text-indigo-200'} ${isWeekend ? 'bg-indigo-900/20' : ''}`}>
                      {v === 0 ? '·' : v}
                    </td>
                  );
                })}
                <td className="p-1.5 md:p-2 text-center text-emerald-300 bg-emerald-900/20 text-base">{monthlyDynamicsData.totals.monthFact}</td>
                <td className="p-1.5 md:p-2 text-center text-gray-300">{monthlyDynamicsData.totals.monthPlan}</td>
                <td className="p-1.5 md:p-2 text-center text-gray-200 bg-gray-800/30">{monthlyDynamicsData.totals.monthBudget.toLocaleString()}</td>
                <td className="p-1.5 md:p-2 text-center text-white">{monthlyDynamicsData.totals.monthSpend.toLocaleString()}</td>
                <td className="p-1.5 md:p-2 text-center">{monthlyDynamicsData.totals.monthCPL > 0 ? monthlyDynamicsData.totals.monthCPL.toFixed(0) + ' ₽' : '—'}</td>
                <td className={`p-1.5 md:p-2 text-center ${monthlyDynamicsData.totals.planPercent >= 100 ? 'text-emerald-400' : monthlyDynamicsData.totals.planPercent >= 70 ? 'text-blue-400' : 'text-amber-400'}`}>
                  {monthlyDynamicsData.totals.planPercent.toFixed(0)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* Сводная таблица связок */}
      {bundlesSummary.rows.length > 0 && (
        <GlassCard className="overflow-hidden">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-amber-400" />
              Сводная таблица связок
            </h3>
            <span className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded">
              {bundlesSummary.rows.length} связок
            </span>
          </div>
          
          <div className="table-scroll-container overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse mobile-table">
              <thead>
                <tr className="text-gray-500 text-xs font-semibold uppercase bg-black/20 border-b border-white/5 tracking-wider">
                  <th className="p-3 md:p-4 sticky-col bg-slate-900/95 backdrop-blur-sm min-w-[100px]">Связка</th>
                  {bundlesSummary.targetologists.map(name => (
                    <th key={name} className="p-3 md:p-4 text-center min-w-[80px]">{name}</th>
                  ))}
                  <th className="p-3 md:p-4 text-center bg-indigo-900/20 text-indigo-300 font-bold min-w-[100px]">ИТОГО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bundlesSummary.rows.map(({ bundleName, values, total }, rowIdx) => (
                  <tr key={bundleName} className={`${rowIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'} hover:bg-white/[0.05] transition-colors`}>
                    <td className={`p-3 md:p-4 font-bold text-white sticky-col ${rowIdx % 2 === 0 ? 'bg-slate-900/95' : 'bg-slate-800/95'} backdrop-blur-sm`}>{bundleName}</td>
                    {bundlesSummary.targetologists.map(name => (
                      <td key={name} className={`p-3 md:p-4 text-center ${values[name] > 0 ? 'text-white' : 'text-gray-600'}`}>
                        {values[name] > 0 ? values[name].toLocaleString() : '0'}
                      </td>
                    ))}
                    <td className="p-3 md:p-4 text-center font-bold text-indigo-300 bg-indigo-900/10">
                      {total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-900/20 font-bold text-white border-t border-indigo-500/30">
                <tr>
                  <td className="p-3 md:p-4 sticky-col bg-indigo-900/80 backdrop-blur-sm">ИТОГО</td>
                  {bundlesSummary.targetologists.map(name => {
                    const userTotal = bundlesSummary.rows.reduce((sum, row) => sum + (row.values[name] || 0), 0);
                    return (
                      <td key={name} className="p-3 md:p-4 text-center">{userTotal.toLocaleString()}</td>
                    );
                  })}
                  <td className="p-3 md:p-4 text-center text-indigo-300 bg-indigo-900/30">
                    {bundlesSummary.rows.reduce((sum, row) => sum + row.total, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// --- Targetologist Workspace ---
const TargetologistWorkspace: React.FC<{ 
  name: string; 
  projects: Project[]; 
  weekStart: string; 
  allData: AppData;
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateBundles: (bundles: BundleEntry[]) => void;
}> = ({ name, projects, weekStart, allData, onUpdateProjects, onUpdateBundles }) => {
  console.log('🎯🎯🎯 TargetologistWorkspace РЕНДЕРИТСЯ! 🎯🎯🎯', { 
    name, 
    projectsCount: projects.length,
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    onUpdateProjectsType: typeof onUpdateProjects,
    onUpdateProjectsExists: !!onUpdateProjects
  });
  
  const days = useMemo(() => getWeekDays(new Date(weekStart)).map(d => d.iso), [weekStart]);
  const displayDays = useMemo(() => getWeekDays(new Date(weekStart)), [weekStart]);

  // Константа для "нет бюджета" (должна совпадать с ProjectRow)
  const NO_BUDGET_VALUE = -1;

  // Статистика личного плана (игнорируем дни с "н")
  const personalStats = useMemo(() => {
    let totalLeads = 0, totalGoal = 0;
    projects.forEach(p => {
      const weeklyLeads = days.reduce((acc, date) => {
        const val = p.leads[date];
        if (val === NO_BUDGET_VALUE || val === undefined) return acc;
        return acc + val;
      }, 0);
      const wStats = p.weeks[weekStart] || { goal: p.defaultGoal };
      totalLeads += weeklyLeads;
      totalGoal += (wStats.goal || 0);
    });
    const percent = totalGoal > 0 ? (totalLeads / totalGoal) * 100 : 0;
    return { totalLeads, totalGoal, percent };
  }, [projects, days, weekStart]);

  // Статистика команды (из allData, игнорируем дни с "н")
  const teamStats = useMemo(() => {
    let teamLeads = 0, teamGoal = 0;
    Object.entries(allData).forEach(([userName, userData]) => {
      const user = userData as UserData;
      user.projects?.forEach(p => {
        const weeklyLeads = days.reduce((acc, date) => {
          const val = p.leads[date];
          if (val === NO_BUDGET_VALUE || val === undefined) return acc;
          return acc + val;
        }, 0);
        const wStats = p.weeks[weekStart] || { goal: p.defaultGoal };
        teamLeads += weeklyLeads;
        teamGoal += (wStats.goal || 0);
      });
    });
    const percent = teamGoal > 0 ? (teamLeads / teamGoal) * 100 : 0;
    return { teamLeads, teamGoal, percent };
  }, [allData, days, weekStart]);

  const handleAddProject = () => {
    onUpdateProjects([...projects, { ...NEW_PROJECT_TEMPLATE, id: generateId(), name: 'Новый проект' }]);
  };

  const handleUpdate = (id: string, updated: Project) => {
    console.log('🔄 handleUpdate в TargetologistWorkspace вызван:', { id, updatedName: updated.name });
    console.log('📝 Обновленный проект (детали):', {
      id: updated.id,
      name: updated.name,
      leadsCount: Object.keys(updated.leads || {}).length,
      weeksCount: Object.keys(updated.weeks || {}).length,
      leads: updated.leads,
      weeks: updated.weeks,
      leadsKeys: Object.keys(updated.leads || {}),
      weeksKeys: Object.keys(updated.weeks || {})
    });
    
    console.log('📋 Текущий массив projects перед обновлением:', {
      projectsCount: projects.length,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        leadsCount: Object.keys(p.leads || {}).length,
        weeksCount: Object.keys(p.weeks || {}).length
      }))
    });
    
    const updatedProjects = projects.map(p => p.id === id ? updated : p);
    console.log('🔄 Стейт обновлен (TargetologistWorkspace):', { projectsCount: updatedProjects.length });
    
    // ДЕТАЛЬНАЯ ПРОВЕРКА: Проверяем весь массив проектов после обновления
    console.log('📋 Проверка ВСЕХ проектов в массиве после обновления:');
    updatedProjects.forEach((p, index) => {
      console.log(`  Проект ${index + 1}:`, {
        id: p.id,
        name: p.name,
        leadsCount: Object.keys(p.leads || {}).length,
        weeksCount: Object.keys(p.weeks || {}).length,
        leads: p.leads,
        weeks: p.weeks,
        leadsKeys: Object.keys(p.leads || {}),
        weeksKeys: Object.keys(p.weeks || {})
      });
    });
    
    // Проверяем, что leads сохранились в массиве проектов
    const updatedProjectInArray = updatedProjects.find(p => p.id === id);
    if (updatedProjectInArray) {
      console.log('✅ Обновленный проект найден в массиве:', {
        id: updatedProjectInArray.id,
        name: updatedProjectInArray.name,
        leadsCount: Object.keys(updatedProjectInArray.leads || {}).length,
        weeksCount: Object.keys(updatedProjectInArray.weeks || {}).length,
        leads: updatedProjectInArray.leads,
        weeks: updatedProjectInArray.weeks
      });
    } else {
      console.error('❌ Обновленный проект НЕ найден в массиве!', { id, updatedProjectsIds: updatedProjects.map(p => p.id) });
    }
    
    console.log('📤 Вызываю onUpdateProjects с массивом проектов...');
    console.log('📤 Массив проектов перед передачей:', updatedProjects.map(p => ({
      id: p.id,
      name: p.name,
      leadsCount: Object.keys(p.leads || {}).length,
      leads: p.leads
    })));
    
    onUpdateProjects(updatedProjects);
    console.log('✅ onUpdateProjects вызван');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить проект?')) {
      onUpdateProjects(projects.filter(p => p.id !== id));
    }
  };

  // Получаем данные связок из allData
  const userBundles = allData[name]?.bundles || [];
  console.log('📦 Данные связок для', name, ':', userBundles);
  
  // Инициализируем массив из 12 строк с 3 парами связок в каждой
  const bundlesRows = useMemo(() => {
    const rows: BundleEntry[][] = [];
    for (let i = 0; i < 12; i++) {
      const row: BundleEntry[] = [];
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        row.push(userBundles[index] || { bundle: '', unscrew: 0 });
      }
      rows.push(row);
    }
    return rows;
  }, [userBundles]);


  // Список возможных связок
  const availableBundles = ['Т1', 'Т2', 'Т3', 'Т4', 'Т5', 'Т6', 'Т7', 'Т8', 'Т9', 'Т10'];

  // Состояние для показа сводной таблицы связок
  const [showBundlesSummary, setShowBundlesSummary] = useState(false);
  const [bundlesViewMode, setBundlesViewMode] = useState<'week' | 'month'>('week');
  const [bundlesWeekIndex, setBundlesWeekIndex] = useState(WEEKS_LIST.findIndex(w => w.id === weekStart));
  const [bundlesMonthIndex, setBundlesMonthIndex] = useState(() => new Date().getMonth()); // Текущий месяц
  
  const bundlesWeek = WEEKS_LIST[bundlesWeekIndex] || WEEKS_LIST[0];
  
  // Список месяцев для выбора
  const MONTHS_LIST = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      { id: 0, year: currentYear - 1, label: 'Декабрь ' + (currentYear - 1), month: 11, monthYear: currentYear - 1 },
      ...Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        year: currentYear,
        label: new Date(currentYear, i, 1).toLocaleString('ru-RU', { month: 'long' }) + ' ' + currentYear,
        month: i,
        monthYear: currentYear
      }))
    ];
  }, []);
  
  const bundlesMonth = MONTHS_LIST[bundlesMonthIndex] || MONTHS_LIST[1]; // По умолчанию январь текущего года

  // Расчёт сводной таблицы связок за неделю
  const weeklyBundlesSummary = useMemo(() => {
    const bundlesByName: Record<string, Record<string, number>> = {};
    const targetologists = Object.keys(allData);
    const weekDays = getWeekDays(new Date(bundlesWeek.id)).map(d => d.iso);
    
    console.log('📊 Недельная сводка связок:', { 
      week: bundlesWeek.label, 
      weekId: bundlesWeek.id,
      targetologists: targetologists.length 
    });
    
    Object.entries(allData).forEach(([owner, userData]) => {
      const user = userData as UserData;
      user.projects?.forEach(project => {
        const weekStats = project.weeks[bundlesWeek.id];
        const weekBundles = weekStats?.bundles || [];
        
        // Новый формат - связки в weeks[weekId].bundles
        weekBundles.forEach(bundle => {
          if (bundle.bundle && bundle.bundle.trim()) {
            const bundleName = bundle.bundle.trim();
            if (!bundlesByName[bundleName]) {
              bundlesByName[bundleName] = {};
              targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
            }
            bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
          }
        });
        
        // Старый формат - связки в project.bundles (fallback)
        if (project.bundles && project.bundles.length > 0 && weekBundles.length === 0) {
          // Проверяем, есть ли у проекта лиды в эту неделю
          const hasLeadsThisWeek = weekDays.some(day => {
            const val = project.leads[day];
            return val !== undefined && val !== 0;
          });
          
          if (hasLeadsThisWeek) {
            project.bundles.forEach(bundle => {
              if (bundle.bundle && bundle.bundle.trim()) {
                const bundleName = bundle.bundle.trim();
                if (!bundlesByName[bundleName]) {
                  bundlesByName[bundleName] = {};
                  targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
                }
                bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
              }
            });
          }
        }
      });
    });

    const rows = Object.entries(bundlesByName).map(([bundleName, values]) => {
      const total = Object.values(values).reduce((sum, v) => sum + v, 0);
      return { bundleName, values, total };
    }).sort((a, b) => b.total - a.total);
    
    console.log('📊 Найдено связок за неделю:', rows.length);

    return { rows, targetologists };
  }, [allData, bundlesWeek.id]);

  // Расчёт сводной таблицы связок за месяц (топ-15)
  const monthlyBundlesSummaryForTargetologist = useMemo(() => {
    const bundlesByName: Record<string, Record<string, number>> = {};
    const targetologists = Object.keys(allData);
    
    // Используем выбранный месяц
    const mondays = getMondaysInMonth(bundlesMonth.monthYear, bundlesMonth.month);
    console.log('📊 Месячная сводка связок:', { 
      month: bundlesMonth.label, 
      mondays,
      targetologists: targetologists.length 
    });
    
    Object.entries(allData).forEach(([owner, userData]) => {
      const user = userData as UserData;
      user.projects?.forEach(project => {
        // Проверяем связки за каждую неделю месяца
        mondays.forEach(monday => {
          const weekStats = project.weeks[monday];
          const weekBundles = weekStats?.bundles || [];
          
          weekBundles.forEach(bundle => {
            if (bundle.bundle && bundle.bundle.trim()) {
              const bundleName = bundle.bundle.trim();
              if (!bundlesByName[bundleName]) {
                bundlesByName[bundleName] = {};
                targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
              }
              bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
            }
          });
        });
        
        // Также проверяем старый формат project.bundles (для совместимости с историческими данными)
        // Но только если нет данных в новом формате за этот месяц
        if (project.bundles && project.bundles.length > 0) {
          // Проверяем, есть ли у проекта лиды в этом месяце (чтобы связать старые связки с месяцем)
          const hasLeadsInMonth = Object.keys(project.leads || {}).some(dateStr => {
            const d = new Date(dateStr);
            return d.getFullYear() === bundlesMonth.monthYear && d.getMonth() === bundlesMonth.month;
          });
          
          // Проверяем, есть ли уже данные за этот месяц в новом формате
          const hasNewFormatData = mondays.some(monday => {
            const weekStats = project.weeks[monday];
            return weekStats?.bundles && weekStats.bundles.length > 0;
          });
          
          // Добавляем старые связки только если они относятся к этому месяцу и нет новых данных
          if (hasLeadsInMonth && !hasNewFormatData) {
            project.bundles.forEach(bundle => {
              if (bundle.bundle && bundle.bundle.trim()) {
                const bundleName = bundle.bundle.trim();
                if (!bundlesByName[bundleName]) {
                  bundlesByName[bundleName] = {};
                  targetologists.forEach(t => bundlesByName[bundleName][t] = 0);
                }
                bundlesByName[bundleName][owner] = (bundlesByName[bundleName][owner] || 0) + (bundle.unscrew || 0);
              }
            });
          }
        }
      });
    });

    const rows = Object.entries(bundlesByName).map(([bundleName, values]) => {
      const total = Object.values(values).reduce((sum, v) => sum + v, 0);
      return { bundleName, values, total };
    }).sort((a, b) => b.total - a.total).slice(0, 15);
    
    console.log('📊 Найдено связок:', rows.length);

    return { rows, targetologists, monthLabel: bundlesMonth.label };
  }, [allData, bundlesMonth]);

  const currentBundlesSummary = bundlesViewMode === 'week' ? weeklyBundlesSummary : monthlyBundlesSummaryForTargetologist;

  // Если показываем сводную таблицу связок
  if (showBundlesSummary) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-amber-400" />
            Сводная таблица связок
          </h2>
          <button
            onClick={() => setShowBundlesSummary(false)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Назад к таблице
          </button>
        </div>

        {/* Переключатель неделя/месяц */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setBundlesViewMode('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                bundlesViewMode === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              За неделю
            </button>
            <button
              onClick={() => setBundlesViewMode('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                bundlesViewMode === 'month'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              За месяц (Топ-15)
            </button>
          </div>

          {/* Переключатель недель (только в режиме недели) */}
          {bundlesViewMode === 'week' && (
            <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 p-1">
              <button 
                onClick={() => setBundlesWeekIndex(Math.max(0, bundlesWeekIndex - 1))}
                disabled={bundlesWeekIndex === 0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 text-sm font-bold text-white min-w-[140px] text-center">
                {bundlesWeek.label}
              </div>
              <button 
                onClick={() => setBundlesWeekIndex(Math.min(WEEKS_LIST.length - 1, bundlesWeekIndex + 1))}
                disabled={bundlesWeekIndex === WEEKS_LIST.length - 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {bundlesViewMode === 'month' && (
            <div className="flex items-center gap-2 bg-amber-900/30 rounded-lg border border-amber-500/30 p-1">
              <button 
                onClick={() => setBundlesMonthIndex(Math.max(0, bundlesMonthIndex - 1))}
                disabled={bundlesMonthIndex === 0}
                className="p-2 text-amber-400 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 text-sm font-bold text-amber-300 min-w-[140px] text-center capitalize">
                {monthlyBundlesSummaryForTargetologist.monthLabel}
              </div>
              <button 
                onClick={() => setBundlesMonthIndex(Math.min(MONTHS_LIST.length - 1, bundlesMonthIndex + 1))}
                disabled={bundlesMonthIndex === MONTHS_LIST.length - 1}
                className="p-2 text-amber-400 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        <GlassCard className="overflow-hidden">
          <div className="table-scroll-container overflow-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-white/5 sticky top-0 z-10 text-gray-400 font-medium uppercase text-xs">
                <tr>
                  <th className="p-3 md:p-4 border-b border-white/10 min-w-[120px] sticky-col bg-slate-900/95 backdrop-blur-sm">Связка</th>
                  {currentBundlesSummary.targetologists.map(t => (
                    <th key={t} className={`p-3 md:p-4 text-center border-b border-white/10 min-w-[80px] ${t === name ? 'bg-indigo-900/30 text-indigo-300' : ''}`}>
                      {t}
                    </th>
                  ))}
                  <th className="p-3 md:p-4 text-center border-b border-white/10 bg-emerald-900/20 text-emerald-400 font-bold min-w-[100px]">ИТОГО</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentBundlesSummary.rows.length === 0 ? (
                  <tr>
                    <td colSpan={currentBundlesSummary.targetologists.length + 2} className="p-8 text-center text-gray-500">
                      Нет данных по связкам за этот период
                    </td>
                  </tr>
                ) : (
                  currentBundlesSummary.rows.map(({ bundleName, values, total }, rowIdx) => (
                    <tr key={bundleName} className={`${rowIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'} hover:bg-white/[0.05] transition-colors`}>
                      <td className={`p-3 md:p-4 font-bold text-white sticky-col ${rowIdx % 2 === 0 ? 'bg-slate-900/95' : 'bg-slate-800/95'} backdrop-blur-sm`}>
                        {bundlesViewMode === 'month' && <span className="text-amber-400 mr-2">#{rowIdx + 1}</span>}
                        {bundleName}
                      </td>
                      {currentBundlesSummary.targetologists.map(t => (
                        <td key={t} className={`p-3 md:p-4 text-center ${values[t] > 0 ? 'text-white' : 'text-gray-600'} ${t === name ? 'bg-indigo-900/20 font-bold text-indigo-300' : ''}`}>
                          {values[t] > 0 ? values[t].toLocaleString() + ' ₽' : '0'}
                        </td>
                      ))}
                      <td className="p-3 md:p-4 text-center font-bold text-emerald-400 bg-emerald-900/10">{total.toLocaleString()} ₽</td>
                    </tr>
                  ))
                )}
              </tbody>
              {currentBundlesSummary.rows.length > 0 && (
                <tfoot className="bg-indigo-900/30 font-bold text-white border-t-2 border-indigo-500/50 sticky bottom-0">
                  <tr>
                    <td className="p-3 md:p-4 sticky-col bg-indigo-900/80 backdrop-blur-sm">ИТОГО</td>
                    {currentBundlesSummary.targetologists.map(t => {
                      const userTotal = currentBundlesSummary.rows.reduce((sum, row) => sum + (row.values[t] || 0), 0);
                      return (
                        <td key={t} className={`p-3 md:p-4 text-center ${t === name ? 'bg-indigo-900/40 text-indigo-200' : ''}`}>
                          {userTotal.toLocaleString()} ₽
                        </td>
                      );
                    })}
                    <td className="p-3 md:p-4 text-center text-emerald-300 bg-emerald-900/30">
                      {currentBundlesSummary.rows.reduce((sum, row) => sum + row.total, 0).toLocaleString()} ₽
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          title="Мой план" 
          value={`${personalStats.percent.toFixed(0)}%`} 
          subtext={`${personalStats.totalLeads} из ${personalStats.totalGoal} лидов`} 
          icon={Target} 
          color={personalStats.percent >= 100 ? 'text-emerald-400' : personalStats.percent >= 80 ? 'text-amber-400' : 'text-indigo-400'} 
        />
        <StatCard 
          title="План команды" 
          value={`${teamStats.percent.toFixed(0)}%`} 
          subtext={`${teamStats.teamLeads} из ${teamStats.teamGoal} лидов`} 
          icon={Users} 
          color={teamStats.percent >= 100 ? 'text-emerald-400' : teamStats.percent >= 80 ? 'text-amber-400' : 'text-indigo-400'} 
        />
      </div>

      <GlassCard className="overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-400" size={18} />
            Мои проекты
          </h3>
          <div className="flex items-center gap-6">
            <button onClick={handleAddProject} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Добавить
            </button>
          </div>
        </div>
        <div className="table-scroll-container overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse mobile-table">
            <thead>
              <tr className="bg-white/5 text-gray-500 font-medium text-xs uppercase">
                <th className="p-2 border-b border-white/10 min-w-[120px] md:min-w-[150px] sticky-col bg-slate-900/95 backdrop-blur-sm border-r-2 border-r-white/20 text-gray-400">Проект</th>
                {displayDays.map(d => (
                  <th key={d.iso} className="p-2 text-center border-b border-white/10 min-w-[50px]">
                    <div className="text-gray-500">{d.name}</div>
                    <div className="text-[10px] text-gray-600 font-normal">{d.display}</div>
                  </th>
                ))}
                <th className="p-2 text-center border-b border-white/10 text-emerald-400/80 font-bold min-w-[60px] border-r-2 border-r-white/20 bg-emerald-900/30 text-sm">Итого</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[60px]">План</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px]">%</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px]">Бюджет</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px]">Открут</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[60px]">CPL</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[60px] border-r-2 border-r-white/20">KPI</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px] text-indigo-500/70">Связка</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[70px] text-indigo-500/70">Открут</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px] text-indigo-500/70">Связка</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[70px] text-indigo-500/70">Открут</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px] text-indigo-500/70">Связка</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[70px] text-indigo-500/70">Открут</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[80px] text-indigo-500/70">Связка</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[70px] text-indigo-500/70 border-r-2 border-r-white/20">Открут</th>
                <th className="p-2 text-center border-b border-white/10 min-w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, index) => (
                <ProjectRow 
                  key={p.id} 
                  project={p} 
                  weekStart={weekStart} 
                  days={days} 
                  onUpdate={handleUpdate} 
                  onDelete={handleDelete}
                  rowIndex={index}
                  isPlanEditable={false}
                />
              ))}
            </tbody>
            {/* Строка ИТОГО */}
            <tfoot className="bg-indigo-900/30 border-t-2 border-indigo-500/50">
              {(() => {
                // Подсчёт итогов
                const dailyTotals = days.map(date => 
                  projects.reduce((sum, p) => {
                    const val = p.leads[date];
                    if (val === NO_BUDGET_VALUE || val === undefined) return sum;
                    return sum + val;
                  }, 0)
                );
                const weeklyTotal = dailyTotals.reduce((a, b) => a + b, 0);
                const totalGoal = projects.reduce((sum, p) => {
                  const wStats = p.weeks[weekStart] || { goal: p.defaultGoal };
                  return sum + (wStats.goal || 0);
                }, 0);
                const totalBudget = projects.reduce((sum, p) => {
                  const wStats = p.weeks[weekStart] || {};
                  return sum + (wStats.budget || 0);
                }, 0);
                const totalSpend = projects.reduce((sum, p) => {
                  const wStats = p.weeks[weekStart] || {};
                  return sum + (wStats.spend || 0);
                }, 0);
                const planPercent = totalGoal > 0 ? (weeklyTotal / totalGoal) * 100 : 0;
                const avgCpl = weeklyTotal > 0 ? totalSpend / weeklyTotal : 0;

                return (
                  <tr className="text-white font-bold">
                    <td className="p-2 sticky-col bg-indigo-900/80 backdrop-blur-sm border-r-2 border-r-white/20 text-indigo-200">
                      Итого
                    </td>
                    {dailyTotals.map((total, i) => (
                      <td key={i} className="p-2 text-center text-indigo-100">{total}</td>
                    ))}
                    <td className="p-2 text-center text-emerald-300 bg-emerald-900/30 border-r-2 border-r-white/20 text-lg">
                      {weeklyTotal}
                    </td>
                    <td className="p-2 text-center text-gray-400">{totalGoal}</td>
                    <td className="p-2 text-center">
                      <span className={planPercent >= 100 ? 'text-emerald-400' : planPercent >= 70 ? 'text-blue-400' : 'text-amber-400'}>
                        {planPercent.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-2 text-center text-gray-400">
                      {totalBudget > 0 ? `${totalBudget.toLocaleString()} ₽` : ''}
                    </td>
                    <td className="p-2 text-center text-white">
                      {totalSpend > 0 ? `${totalSpend.toLocaleString()} ₽` : ''}
                    </td>
                    <td className="p-2 text-center text-indigo-300">
                      {avgCpl > 0 ? avgCpl.toFixed(0) : '0'}
                    </td>
                    <td className="p-2 text-center border-r-2 border-r-white/20"></td>
                    {/* Пустые ячейки для связок */}
                    <td colSpan={8} className="p-2 border-r-2 border-r-white/20"></td>
                    <td className="p-2"></td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* Кнопка перехода к сводной таблице связок */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowBundlesSummary(true)}
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <BarChart3 size={20} />
          Открыть сводную таблицу связок
        </button>
      </div>

    </div>
  );
};

// --- App Entry ---

const App: React.FC = () => {
  // Используем функцию-инициализатор, чтобы пустой объект создавался только один раз
  // и не вызывал лишних срабатываний useEffect при первом рендере
  const [data, setData] = useState<AppData>(() => ({}));
  const [currentUser, setCurrentUser] = useState<{ role: Role; name?: string } | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState(WEEKS_LIST[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Login state - должны быть вверху компонента
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Admin view state - какую таблицу смотрит админ
  const [adminView, setAdminView] = useState<'dashboard' | string>('dashboard');

  // 1. Загрузка данных (без изменений, она у тебя хорошая)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const initialData = await getInitialData();
        
        // Миграция: переносим старые связки из project.bundles в weeks[currentWeek].bundles
        let needsMigration = false;
        const migratedData = { ...initialData };
        const currentWeek = WEEKS_LIST[0].id; // Текущая неделя для миграции
        
        Object.entries(migratedData).forEach(([userName, userData]) => {
          const user = userData as UserData;
          user.projects?.forEach(project => {
            // Если есть старые связки в project.bundles, но нет в текущей неделе
            if (project.bundles && project.bundles.length > 0) {
              const hasWeekBundles = project.weeks[currentWeek]?.bundles?.length > 0;
              if (!hasWeekBundles) {
                // Мигрируем в текущую неделю
                if (!project.weeks[currentWeek]) {
                  project.weeks[currentWeek] = {
                    budget: project.defaultBudget,
                    spend: 0,
                    goal: project.defaultGoal,
                    targetCpa: project.defaultTargetCpa,
                    bundles: []
                  };
                }
                project.weeks[currentWeek].bundles = [...project.bundles];
                console.log(`📦 Мигрированы связки для ${userName} - ${project.name}`);
                needsMigration = true;
              }
            }
          });
        });
        
        setData(migratedData);
        setHasLoadedFromServer(true);
        
        // Если была миграция, сохраняем
        if (needsMigration) {
          console.log('💾 Сохраняем мигрированные данные...');
          await saveData(migratedData);
        }
        
        console.log('📥 Первичная загрузка завершена');
      } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. УМНЫЙ МЕРЖИНГ (Self-Healing Merge)
  useEffect(() => {
    if (!hasLoadedFromServer) return;
    
    const unsubscribe = subscribeToDataChanges(
      (newData) => {
        // Игнорируем эхо от сервера только если мы сейчас отправляем
        if (isSyncing) {
          console.log('⏭️ Игнорируем эхо от сервера (isSyncing=true)');
          return;
        }

        setData(prev => {
          const next: AppData = JSON.parse(JSON.stringify(prev)); // Глубокая копия

          Object.entries(newData).forEach(([user, serverUser]) => {
            if (!next[user]) {
              next[user] = serverUser as UserData;
              return;
            }

            next[user].projects = next[user].projects.map(localProj => {
              const serverProj = (serverUser as UserData).projects.find(p => p.id === localProj.id);
              if (!serverProj) return localProj;

              // Сливаем лиды: если в локальном стейте значение есть, оно ВАЖНЕЕ серверного
              const mergedLeads = { ...serverProj.leads, ...localProj.leads };
              
              return { 
                ...serverProj, 
                leads: mergedLeads,
                weeks: { ...serverProj.weeks, ...localProj.weeks }
              };
            });
          });

          return next;
        });
      },
      (connected) => {
        setRealtimeConnected(connected);
      }
    );

    return () => unsubscribe();
  }, [hasLoadedFromServer, isSyncing]);

  // 3. САМОВОССТАНАВЛИВАЮЩЕЕСЯ СОХРАНЕНИЕ
  useEffect(() => {
    if (!hasLoadedFromServer || isLoading || isSyncing) return;

    // 🛡️ Считаем реальные данные (лиды) - СУММУ, а не количество ключей!
    let leadsCount = 0;
    Object.values(data).forEach(u => {
      const userData = u as UserData;
      userData.projects?.forEach(p => {
        // ✅ Считаем СУММУ всех значений лидов
        Object.values(p.leads || {}).forEach(leadValue => {
          leadsCount += Number(leadValue) || 0;
        });
      });
    });

    // Если лидов 0, а мы пытаемся сохранить — значит это пустой старт. 
    // Но если лиды ПОЯВИЛИСЬ, мы обязаны их отправить.
    if (leadsCount === 0) return;

    const timeoutId = setTimeout(async () => {
      console.log(`🚀 ОБНАРУЖЕНО ЛИДОВ: ${leadsCount}. ОТПРАВЛЯЮ В SUPABASE...`);
      try {
        setIsSyncing(true);
        await saveData(data);
        console.log('✅ УСПЕШНО СОХРАНЕНО');
      } catch (err) {
        console.error('❌ ОШИБКА СОХРАНЕНИЯ:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); // 1.5 секунды задержки

    return () => clearTimeout(timeoutId);
  }, [data, hasLoadedFromServer, isLoading, isSyncing]);

  const handleLogout = () => setCurrentUser(null);
  const handleUpdate = (updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      
      // Для дебага: проверяем, что лиды реально попали в новый стейт
      const firstUser = Object.keys(next)[0];
      if (firstUser && next[firstUser]?.projects?.[0]) {
        const leadsCount = Object.keys(next[firstUser].projects[0].leads || {}).length;
        console.log(`📝 Стейт обновлен локально. Лидов у ${firstUser}: ${leadsCount}`);
      }
      
      return next;
    });
  };

  const updateSingle = (owner: string, pId: string, updated: Project) => {
    console.log('🔄 updateSingle вызван:', { owner, pId, updatedName: updated.name });
    console.log('📝 Обновляемый проект (детали):', {
      id: updated.id,
      name: updated.name,
      leadsCount: Object.keys(updated.leads || {}).length,
      leads: updated.leads,
      weeksCount: Object.keys(updated.weeks || {}).length,
      weeks: updated.weeks
    });
    
    handleUpdate(prev => {
      const userData = prev[owner] || { projects: [] };
      const projectExists = userData.projects.some(p => p.id === pId);
      const newProjects = projectExists 
        ? userData.projects.map(p => p.id === pId ? updated : p)
        : [...userData.projects, updated];
      const newData = { ...prev, [owner]: { projects: newProjects } };
      
      // Проверяем, что leads и weeks сохранились
      const updatedProject = newProjects.find(p => p.id === pId);
      if (updatedProject) {
        console.log('✅ Проект обновлен в стейте:', {
          id: updatedProject.id,
          name: updatedProject.name,
          leadsCount: Object.keys(updatedProject.leads || {}).length,
          weeksCount: Object.keys(updatedProject.weeks || {}).length,
          sampleLeads: Object.entries(updatedProject.leads || {}).slice(0, 3),
          sampleWeeks: Object.keys(updatedProject.weeks || {}).slice(0, 3)
        });
      }
      
      console.log('📝 Данные готовы к отправке:', newProjects);
      console.log('📝 Новое значение в стейте (updateSingle):', newData);
      console.log('📋 Проектов у пользователя:', newProjects.length);
      return newData;
    });
  };
  
  const deleteSingle = (owner: string, pId: string) => {
    console.log('🗑️ deleteSingle вызван:', { owner, pId });
    handleUpdate(prev => ({ ...prev, [owner]: { projects: prev[owner].projects.filter(p => p.id !== pId) } }));
  };

  const updateUserProjects = (owner: string, updatedProjects: Project[]) => {
    console.log('🚨🚨🚨 updateUserProjects ВЫЗВАН!', { 
      owner, 
      projectsCount: updatedProjects.length
    });
    
    handleUpdate(prev => {
      const newData = { ...prev };
      newData[owner] = {
        ...newData[owner],
        projects: updatedProjects.map(p => {
          // Глубокое копирование weeks с bundles
          const weeksCopy: Record<string, WeeklyStats> = {};
          Object.entries(p.weeks || {}).forEach(([weekId, stats]) => {
            weeksCopy[weekId] = {
              ...stats,
              bundles: stats.bundles ? [...stats.bundles] : undefined
            };
          });
          
          return {
            ...p,
            leads: { ...(p.leads || {}) },
            weeks: weeksCopy,
            bundles: p.bundles ? [...p.bundles] : undefined // Также сохраняем старые bundles
          };
        })
      };
      
      console.log('✅ updateUserProjects: данные подготовлены для', owner);
      return newData;
    });
  };

  const updateUserBundles = (owner: string, bundles: BundleEntry[]) => {
    handleUpdate(prev => {
      const newData = { ...prev };
      newData[owner] = {
        ...newData[owner],
        bundles: bundles
      };
      return newData;
    });
  };

  // Показываем индикатор загрузки, пока данные загружаются
  if (isLoading && Object.keys(data).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  // --- Login View ---
  // Учётные данные пользователей
  const CREDENTIALS: Record<string, { password: string; role: Role; displayName: string }> = {
    'admin': { password: 'fromi2024', role: 'Admin', displayName: 'Admin' },
    'alena': { password: 'target_a1', role: 'Targetologist', displayName: 'Алена' },
    'denis': { password: 'target_d2', role: 'Targetologist', displayName: 'Денис' },
    'alexey': { password: 'target_x3', role: 'Targetologist', displayName: 'Алексей' },
    'sergey': { password: 'target_s4', role: 'Targetologist', displayName: 'Сергей' },
    'anastasia': { password: 'target_n5', role: 'Targetologist', displayName: 'Анастасия' },
    'ivan': { password: 'target_i6', role: 'Targetologist', displayName: 'Иван' },
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const username = loginUsername.toLowerCase().trim();
    const user = CREDENTIALS[username];
    
    if (!user) {
      setLoginError('Пользователь не найден');
      return;
    }
    
    if (user.password !== loginPassword) {
      setLoginError('Неверный пароль');
      return;
    }
    
    setLoginError('');
    setCurrentUser({ role: user.role, name: user.displayName });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black animate-pulse" />
        <GlassCard className="w-full max-w-md p-10 bg-black/60 border-white/10 relative z-10 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(79,70,229,0.3)]">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
              <TrendingUp className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">FROMI CRM</h1>
            <p className="text-indigo-300 font-medium">Маркетинговая экосистема 2.0</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Логин</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                placeholder="Введите логин"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Пароль</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
            </div>
            
            {loginError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-sm text-center">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full p-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            >
              Войти
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-xs text-gray-600 text-center">
              Введите логин и пароль для входа в систему
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  // --- Main Layout ---
  console.log('🏠 App рендерится:', { 
    currentUser: currentUser ? { role: currentUser.role, name: currentUser.name } : null,
    dataKeys: Object.keys(data),
    ivanProjects: data['Иван']?.projects?.length || 0
  });
  
  // Вычисляем количество лидов для детектора
  let totalLeads = 0;
  let totalProjects = 0;
  try {
    Object.values(data).forEach(user => {
      const userData = user as UserData;
      if (userData.projects) {
        totalProjects += userData.projects.length;
        userData.projects.forEach(p => {
          // ✅ Считаем СУММУ всех значений лидов, а не количество ключей
          Object.values(p.leads || {}).forEach(leadValue => {
            totalLeads += Number(leadValue) || 0;
          });
        });
      }
    });
  } catch (e) {
    console.error('Ошибка при вычислении детектора:', e);
  }
  
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black pointer-events-none" />
      
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-3 md:px-6 h-14 md:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4">
             <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="text-white w-4 h-4 md:w-6 md:h-6" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-white tracking-tight hidden sm:block">FROMI</span>
          </div>

          <div className="flex items-center bg-white/5 rounded-lg md:rounded-xl border border-white/10 p-1 md:p-1.5 shadow-inner shadow-black/50">
             <button onClick={() => { const idx = WEEKS_LIST.findIndex(w => w.id === currentWeekId); if (idx > 0) setCurrentWeekId(WEEKS_LIST[idx - 1].id); }} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
             <div className="px-2 md:px-6 flex items-center gap-1 md:gap-3 text-xs md:text-sm font-bold text-white min-w-[100px] md:min-w-[180px] justify-center">
               <Calendar size={14} className="text-indigo-400 hidden sm:block" />
               {WEEKS_LIST.find(w => w.id === currentWeekId)?.label}
             </div>
             <button onClick={() => { const idx = WEEKS_LIST.findIndex(w => w.id === currentWeekId); if (idx < WEEKS_LIST.length - 1) setCurrentWeekId(WEEKS_LIST[idx + 1].id); }} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
             {/* Индикатор Realtime подключения - только точка */}
             <div className={`w-2.5 h-2.5 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} title={realtimeConnected ? 'Синхронизация активна' : 'Нет связи'} />
             <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white">{currentUser.name}</p>
                <div className="flex items-center gap-1 justify-end">
                  <div className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'Admin' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{currentUser.role === 'Admin' ? 'Admin' : 'Targetologist'}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="p-2 md:p-3 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 md:px-6 py-4 md:py-10 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentUser.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {(() => {
              console.log('🔍 Проверка роли пользователя:', { 
                role: currentUser.role, 
                name: currentUser.name,
                isAdmin: currentUser.role === 'Admin',
                isTargetologist: currentUser.role === 'Targetologist'
              });
              return currentUser.role === 'Admin' ? (
              <div>
                {/* Навигация для админа */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setAdminView('dashboard')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      adminView === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    📊 Общая статистика
                  </button>
                  {TARGETOLOGISTS.map(name => (
                    <button
                      key={name}
                      onClick={() => setAdminView(name)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        adminView === name
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                
                {/* Контент в зависимости от выбора */}
                {adminView === 'dashboard' ? (
                  <AdminDashboard 
                    data={data} weekStart={currentWeekId}
                    onUpdateProject={updateSingle} onDeleteProject={deleteSingle}
                  />
                ) : (
                  <TargetologistWorkspace 
                    name={adminView} 
                    projects={data[adminView]?.projects || []}
                    weekStart={currentWeekId} 
                    allData={data}
                    onUpdateProjects={(p) => updateUserProjects(adminView, p)}
                    onUpdateBundles={(bundles) => updateUserBundles(adminView, bundles)}
                  />
                )}
              </div>
            ) : (
              <>
                {console.log('🚨🚨🚨 РЕНДЕРИМ TargetologistWorkspace! 🚨🚨🚨', {
                  userName: currentUser.name,
                  projectsCount: data[currentUser.name!]?.projects?.length || 0,
                  hasData: !!data[currentUser.name!]
                })}
                <TargetologistWorkspace 
                  name={currentUser.name!} 
                  projects={data[currentUser.name!]?.projects || []}
                  weekStart={currentWeekId} 
                  allData={data}
                  onUpdateProjects={(p) => {
                    console.log('🚨🚨🚨 onUpdateProjects вызван из App! 🚨🚨🚨', { 
                      userName: currentUser.name, 
                      projectsCount: p.length,
                      projects: p 
                    });
                    updateUserProjects(currentUser.name!, p);
                  }}
                  onUpdateBundles={(bundles) => {
                    updateUserBundles(currentUser.name!, bundles);
                  }}
                />
              </>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;