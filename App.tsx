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
  UserData
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
  const days = useMemo(() => getWeekDays(new Date(weekStart)).map(d => d.iso), [weekStart]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'leads', direction: 'desc' });

  // --- Statistics Logic ---
  const stats = useMemo(() => {
    let totalLeads = 0, totalSpend = 0, totalGoal = 0;
    const memberPerformance = Object.entries(data).map(([name, userData]) => {
      const user = userData as UserData;
      let mLeads = 0, mSpend = 0, mGoal = 0;
      user.projects.forEach(p => {
        const pLeads = days.reduce((acc, date) => acc + (p.leads[date] || 0), 0);
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

  // --- Dynamics Table Logic ---
  const dynamicsData = useMemo(() => {
    const prevWeekIndex = WEEKS_LIST.findIndex(w => w.id === weekStart) - 1;
    const prevWeekStart = prevWeekIndex >= 0 ? WEEKS_LIST[prevWeekIndex].id : null;
    const prevDays = prevWeekStart ? getWeekDays(new Date(prevWeekStart)).map(d => d.iso) : [];

    const rows = Object.entries(data).map(([name, userData]) => {
      let currentFact = 0, currentPlan = 0, currentBudget = 0;
      const dailyFacts: number[] = days.map(() => 0);

      let prevFact = 0, prevBudget = 0;

      (userData as UserData).projects.forEach(p => {
        // Current Week Stats
        days.forEach((d, idx) => {
          const val = (p.leads[d] || 0);
          dailyFacts[idx] += val;
          currentFact += val;
        });
        const wStats = p.weeks[weekStart] || { goal: p.defaultGoal, spend: 0 };
        currentPlan += (wStats.goal || 0);
        currentBudget += (wStats.spend || 0);

        // Previous Week Stats (for Delta)
        if (prevWeekStart) {
          prevDays.forEach(d => prevFact += (p.leads[d] || 0));
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

    // Totals for footer
    const totals = rows.reduce((acc: { dailyFacts: number[]; currentFact: number; currentPlan: number; currentBudget: number }, row) => ({
      dailyFacts: acc.dailyFacts.map((v, i) => v + row.dailyFacts[i]),
      currentFact: acc.currentFact + row.currentFact,
      currentPlan: acc.currentPlan + row.currentPlan,
      currentBudget: acc.currentBudget + row.currentBudget,
    }), { 
      dailyFacts: [0,0,0,0,0,0,0] as number[], 
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
    const list: { owner: string; project: Project; leads: number; goal: number; budget: number; spend: number; actualCpa: number; avgTargetCpa: number; percent: number }[] = [];
    Object.entries(data).forEach(([owner, userData]) => {
      (userData as UserData).projects.forEach(project => {
        let leads = 0, goal = 0, budget = 0, spend = 0, targetCpaSum = 0, weeksCount = 0;
        
        Object.entries(project.leads).forEach(([date, count]) => {
            const d = new Date(date);
            if (d.getMonth() === currentMonth.id && d.getFullYear() === currentMonth.year) leads += Number(count);
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

  const handleUpdateMonthlyGoal = (owner: string, project: Project, newMonthlyGoal: number) => {
    const mondays = getMondaysInMonth(currentMonth.year, currentMonth.id);
    if (mondays.length === 0) return;
    const weeklyGoal = Math.round(newMonthlyGoal / mondays.length);
    const updated = { ...project, weeks: { ...project.weeks }, defaultGoal: weeklyGoal };
    mondays.forEach(m => {
        updated.weeks[m] = { ...(updated.weeks[m] || { budget: project.defaultBudget, spend: 0, targetCpa: project.defaultTargetCpa }), goal: weeklyGoal };
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
          value={Object.values(data).reduce((acc, u) => acc + (u as UserData).projects.length, 0)} 
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
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-white/5 sticky top-0 z-10 text-gray-400 font-medium">
                <tr>
                  <th className="p-2 min-w-[100px] border-b border-white/10">Таргетолог</th>
                  {['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => <th key={d} className="p-2 text-center border-b border-white/10 w-[40px]">{d}</th>)}
                  <th className="p-2 text-center border-b border-white/10 bg-emerald-900/10 text-emerald-400 font-bold">Факт</th>
                  <th className="p-2 text-center border-b border-white/10">План</th>
                  <th className="p-2 text-center border-b border-white/10 bg-gray-800/50">Бюджет</th>
                  <th className="p-2 text-center border-b border-white/10">CPL</th>
                  <th className="p-2 text-center border-b border-white/10" title="Динамика CPL">Δ CPL</th>
                  <th className="p-2 text-center border-b border-white/10" title="Динамика Бюджета">Δ Бдж</th>
                  <th className="p-2 text-center border-b border-white/10" title="Динамика Факта">Δ Факт</th>
                  <th className="p-2 text-center border-b border-white/10">План %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dynamicsData.rows.map(row => (
                  <tr key={row.name} className="hover:bg-white/5 transition-colors">
                    <td className="p-2 font-medium text-white">{row.name}</td>
                    {row.dailyFacts.map((v, i) => <td key={i} className="p-2 text-center text-gray-400">{v}</td>)}
                    <td className="p-2 text-center font-bold text-emerald-400 bg-emerald-900/10 border-l border-r border-white/5">{row.currentFact}</td>
                    <td className="p-2 text-center text-gray-400">{row.currentPlan}</td>
                    <td className="p-2 text-center text-gray-300 bg-gray-800/30">{row.currentBudget.toLocaleString()}</td>
                    <td className="p-2 text-center font-medium">{row.currentCPL.toFixed(0)}</td>
                    <td className={`p-2 text-center ${row.deltaCPL > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{row.deltaCPL.toFixed(0)}%</td>
                    <td className={`p-2 text-center ${row.deltaBudget > 0 ? 'text-gray-200' : 'text-gray-500'}`}>{row.deltaBudget.toFixed(0)}%</td>
                    <td className={`p-2 text-center ${row.deltaFact > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.deltaFact.toFixed(0)}%</td>
                    <td className="p-2 text-center font-bold text-white relative">
                      <div className="absolute inset-0 bg-indigo-500/10 z-0" style={{ width: `${Math.min(row.planPercent, 100)}%` }} />
                      <span className="relative z-10">{row.planPercent.toFixed(0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-900/20 font-bold text-white border-t border-indigo-500/30 sticky bottom-0">
                <tr>
                  <td className="p-2">ИТОГО</td>
                  {dynamicsData.totals.dailyFacts.map((v, i) => <td key={i} className="p-2 text-center">{v}</td>)}
                  <td className="p-2 text-center text-emerald-300 bg-emerald-900/20 border-x border-indigo-500/30">{dynamicsData.totals.currentFact}</td>
                  <td className="p-2 text-center">{dynamicsData.totals.currentPlan}</td>
                  <td className="p-2 text-center">{dynamicsData.totals.currentBudget.toLocaleString()}</td>
                  <td className="p-2 text-center">{dynamicsData.totalCPL.toFixed(0)}</td>
                  <td colSpan={3}></td>
                  <td className="p-2 text-center text-indigo-300">{dynamicsData.totalPlanPercent.toFixed(0)}%</td>
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs font-semibold uppercase bg-black/20 border-b border-white/5 tracking-wider">
                {[
                  { id: 'owner', label: 'Таргетолог' },
                  { id: 'projectName', label: 'Проект' },
                  { id: 'leads', label: 'Лиды' },
                  { id: 'goal', label: 'План (Мес)' },
                  { id: 'percent', label: 'Выполнение' },
                  { id: 'budget', label: 'Бюджет' },
                  { id: 'spend', label: 'Открут' },
                  { id: 'actualCpa', label: 'CPA' },
                  { id: 'avgTargetCpa', label: 'KPI CPA' },
                ].map(h => (
                  <th key={h.id} className="p-4 cursor-pointer group/th hover:text-white transition-colors" onClick={() => setSortConfig({ key: h.id, direction: sortConfig.key === h.id && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}>
                    <div className="flex items-center gap-1 justify-center first:justify-start">
                      {h.label}
                      {sortIcon(h.id)}
                    </div>
                  </th>
                ))}
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {monthlyProjects.map(({ owner, project, leads, goal, budget, spend, actualCpa, avgTargetCpa, percent }) => (
                  <tr key={project.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-indigo-300 font-medium">{owner}</td>
                    <td className="p-4">
                      <input 
                        className="bg-transparent w-full text-gray-200 focus:text-white focus:outline-none" 
                        value={project.name} 
                        onChange={(e) => onUpdateProject(owner, project.id, { ...project, name: e.target.value })} 
                      />
                    </td>
                    <td className="p-4 text-center text-white font-bold">{leads}</td>
                    <td className="p-4 text-center">
                      <input 
                        type="number"
                        className="bg-black/20 text-center rounded py-1 px-2 text-gray-300 focus:text-white w-20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={goal || ''}
                        onChange={(e) => handleUpdateMonthlyGoal(owner, project, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-4 w-[150px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={percent >= 100 ? 'text-emerald-400' : 'text-gray-400'}>{percent.toFixed(0)}%</span>
                        </div>
                        <ProgressBar percent={percent} />
                      </div>
                    </td>
                    <td className="p-4 text-center text-gray-500">{budget.toLocaleString()}</td>
                    <td className="p-4 text-center text-white">{spend.toLocaleString()}</td>
                    <td className={`p-4 text-center font-bold ${actualCpa <= avgTargetCpa ? 'text-emerald-400' : 'text-rose-400'}`}>{actualCpa.toFixed(0)}</td>
                    <td className="p-4 text-center text-gray-500">{avgTargetCpa.toFixed(0)}</td>
                    <td className="p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onDeleteProject(owner, project.id)} className="text-gray-600 hover:text-rose-400"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
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
}> = ({ name, projects, weekStart, onUpdateProjects }) => {
  const days = useMemo(() => getWeekDays(new Date(weekStart)).map(d => d.iso), [weekStart]);
  const displayDays = useMemo(() => getWeekDays(new Date(weekStart)), [weekStart]);

  const stats = useMemo(() => {
    let totalLeads = 0, totalSpend = 0, totalGoal = 0;
    projects.forEach(p => {
      const weeklyLeads = days.reduce((acc, date) => acc + (p.leads[date] || 0), 0);
      const wStats = p.weeks[weekStart] || { spend: 0, goal: p.defaultGoal };
      totalLeads += weeklyLeads;
      totalSpend += (wStats.spend || 0);
      totalGoal += (wStats.goal || 0);
    });
    return { totalLeads, totalSpend, totalGoal, avgCpa: totalLeads > 0 ? totalSpend / totalLeads : 0 };
  }, [projects, days, weekStart]);

  const handleAddProject = () => {
    onUpdateProjects([...projects, { ...NEW_PROJECT_TEMPLATE, id: generateId(), name: 'Новый проект' }]);
  };

  const handleUpdate = (id: string, updated: Project) => {
    onUpdateProjects(projects.map(p => p.id === id ? updated : p));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить проект?')) {
      onUpdateProjects(projects.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Мои лиды" value={stats.totalLeads} subtext={`${stats.totalGoal > 0 ? ((stats.totalLeads / stats.totalGoal) * 100).toFixed(0) : 0}% от плана`} icon={Users} color="text-indigo-400" />
        <StatCard title="Мой расход" value={`${stats.totalSpend.toLocaleString()} ₽`} subtext="За неделю" icon={DollarSign} color="text-emerald-400" />
        <StatCard title="CPL" value={`${stats.avgCpa.toFixed(0)} ₽`} subtext="Средняя цена" icon={Target} color="text-rose-400" />
      </div>

      <GlassCard className="overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-indigo-400" size={18} />
            Мои проекты
          </h3>
          <button onClick={handleAddProject} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Добавить
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white/5 text-gray-400 font-medium text-xs uppercase">
               <tr>
                  <th className="p-2 border-b border-white/10 min-w-[150px]">Проект</th>
                  {displayDays.map(d => (
                    <th key={d.iso} className="p-2 text-center border-b border-white/10 w-[60px]">
                      <div>{d.name}</div><div className="text-[10px] opacity-50">{d.display}</div>
                    </th>
                  ))}
                  <th className="p-2 text-center border-b border-white/10 text-white">Итого</th>
                  <th className="p-2 text-center border-b border-white/10">План</th>
                  <th className="p-2 text-center border-b border-white/10">%</th>
                  <th className="p-2 text-center border-b border-white/10">Бюджет</th>
                  <th className="p-2 text-center border-b border-white/10">Открут</th>
                  <th className="p-2 text-center border-b border-white/10">CPL</th>
                  <th className="p-2 text-center border-b border-white/10">KPI</th>
                  <th className="p-2 text-center border-b border-white/10"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.map(p => (
                <ProjectRow 
                  key={p.id} project={p} weekStart={weekStart} days={days} 
                  onUpdate={handleUpdate} onDelete={handleDelete} 
                />
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// --- App Entry ---

const App: React.FC = () => {
  const [data, setData] = useState<AppData>({});
  const [currentUser, setCurrentUser] = useState<{ role: Role; name?: string } | null>(null);
  const [currentWeekId, setCurrentWeekId] = useState(WEEKS_LIST[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // Флаг для предотвращения циклических обновлений
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false); // Флаг для защиты от перезаписи пустым объектом

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('📥 Загрузка данных из Supabase...');
        const initialData = await getInitialData();
        console.log('✅ Данные успешно загружены из Supabase');
        console.log('📋 Загруженные пользователи:', Object.keys(initialData));
        
        // Проверяем структуру данных для текущего пользователя (если он уже выбран)
        if (currentUser?.name && initialData[currentUser.name]) {
          console.log(`👤 Данные для ${currentUser.name}:`, initialData[currentUser.name]);
        }
        
        setData(initialData);
        setHasLoadedFromServer(true); // Устанавливаем флаг после успешной загрузки
      } catch (error) {
        console.error('❌ Ошибка при загрузке данных:', error);
        // При ошибке показываем сообщение пользователю
        alert('Ошибка при загрузке данных. Убедитесь, что Supabase настроен правильно (проверьте .env файл)');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Подписка на изменения в реальном времени
  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((newData) => {
      console.log('📡 Получены обновленные данные через real-time синхронизацию');
      setIsSyncing(true); // Устанавливаем флаг, чтобы не сохранять данные обратно
      setData(newData);
      // Сбрасываем флаг через небольшую задержку
      setTimeout(() => setIsSyncing(false), 100);
    });

    // Отписка при размонтировании
    return () => {
      unsubscribe();
    };
  }, []);

  // Сохранение данных при изменении (с дебаунсом для оптимизации)
  useEffect(() => {
    // Защита от перезаписи: не сохраняем, если данные еще не загрузились с сервера
    if (!hasLoadedFromServer) {
      console.log('⏸️ Сохранение отложено: данные еще не загружены с сервера');
      return;
    }
    
    // Не сохраняем, если данные пришли через real-time синхронизацию или если идет загрузка
    if (isSyncing || isLoading) {
      return;
    }
    
    // Не сохраняем пустой объект
    if (Object.keys(data).length === 0) {
      console.log('⏸️ Сохранение отменено: данные пусты');
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('💾 Сохранение данных в Supabase...', Object.keys(data));
      saveData(data).catch(error => {
        console.error('❌ Ошибка при сохранении данных в Supabase:', error);
      });
    }, 500); // Дебаунс 500мс

    return () => clearTimeout(timeoutId);
  }, [data, isLoading, isSyncing, hasLoadedFromServer]);

  const handleLogout = () => setCurrentUser(null);
  const handleUpdate = (updater: (prev: AppData) => AppData) => setData(updater);

  const updateSingle = (owner: string, pId: string, updated: Project) => 
    handleUpdate(prev => ({ ...prev, [owner]: { projects: prev[owner].projects.map(p => p.id === pId ? updated : p) } }));
  
  const deleteSingle = (owner: string, pId: string) => 
    handleUpdate(prev => ({ ...prev, [owner]: { projects: prev[owner].projects.filter(p => p.id !== pId) } }));

  const updateUserProjects = (owner: string, projects: Project[]) => 
    handleUpdate(prev => ({ ...prev, [owner]: { projects } }));

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
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black animate-pulse" />
        <GlassCard className="w-full max-w-md p-10 bg-black/60 border-white/10 relative z-10 backdrop-blur-2xl shadow-[0_0_50px_-10px_rgba(79,70,229,0.3)]">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
              <TrendingUp className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">FROMI CRM</h1>
            <p className="text-indigo-300 font-medium">Маркетинговая экосистема 2.0</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => setCurrentUser({ role: 'Admin', name: 'Admin' })} className="w-full p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-indigo-600/20 hover:border-indigo-500 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300"><LayoutDashboard size={24} /></div>
                <div className="text-left"><p className="text-white font-bold">Администратор</p><p className="text-xs text-gray-500">Полный доступ к статистике</p></div>
              </div>
              <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
            </button>
            <div className="pt-6">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Команда</p>
              <div className="grid grid-cols-2 gap-3">
                {TARGETOLOGISTS.map((name) => (
                  <button key={name} onClick={() => setCurrentUser({ role: 'Targetologist', name })} className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-gray-300 hover:text-white hover:shadow-[0_0_15px_-5px_rgba(255,255,255,0.1)]">
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black pointer-events-none" />
      
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight hidden md:block">FROMI</span>
          </div>

          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1.5 shadow-inner shadow-black/50">
             <button onClick={() => { const idx = WEEKS_LIST.findIndex(w => w.id === currentWeekId); if (idx > 0) setCurrentWeekId(WEEKS_LIST[idx - 1].id); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
             <div className="px-6 flex items-center gap-3 text-sm font-bold text-white min-w-[180px] justify-center">
               <Calendar size={16} className="text-indigo-400" />
               {WEEKS_LIST.find(w => w.id === currentWeekId)?.label}
             </div>
             <button onClick={() => { const idx = WEEKS_LIST.findIndex(w => w.id === currentWeekId); if (idx < WEEKS_LIST.length - 1) setCurrentWeekId(WEEKS_LIST[idx + 1].id); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronRight size={18} /></button>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-white">{currentUser.name}</p>
                <div className="flex items-center gap-1 justify-end">
                  <div className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'Admin' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{currentUser.role === 'Admin' ? 'Admin' : 'Targetologist'}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentUser.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentUser.role === 'Admin' ? (
              <AdminDashboard 
                data={data} weekStart={currentWeekId}
                onUpdateProject={updateSingle} onDeleteProject={deleteSingle}
              />
            ) : (
              <TargetologistWorkspace 
                name={currentUser.name!} projects={data[currentUser.name!]?.projects || []}
                weekStart={currentWeekId} allData={data}
                onUpdateProjects={(p) => updateUserProjects(currentUser.name!, p)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;