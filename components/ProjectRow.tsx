import React from 'react';
import { Project, WeeklyStats } from '../types';
import { Trash2 } from 'lucide-react';

interface ProjectRowProps {
  project: Project;
  weekStart: string;
  days: string[];
  onUpdate: (id: string, updated: Project) => void;
  onDelete: (id: string) => void;
  ownerName?: string;
  isPlanEditable?: boolean;
  rowIndex?: number;
}

const NO_BUDGET_VALUE = -1;

export const ProjectRow: React.FC<ProjectRowProps> = ({ 
  project, 
  weekStart, 
  days, 
  onUpdate, 
  onDelete, 
  ownerName,
  isPlanEditable = true,
  rowIndex = 0
}) => {
  const currentStats: WeeklyStats = project.weeks[weekStart] || {
    budget: project.defaultBudget,
    spend: 0,
    goal: project.defaultGoal,
    targetCpa: project.defaultTargetCpa
  };

  const weeklyLeadsCount = days.reduce((acc, date) => {
    const val = project.leads[date];
    if (val === NO_BUDGET_VALUE || val === undefined) return acc;
    return acc + val;
  }, 0);
  
  const actualCpa = weeklyLeadsCount > 0 ? currentStats.spend / weeklyLeadsCount : 0;
  const planPercent = currentStats.goal > 0 ? (weeklyLeadsCount / currentStats.goal) * 100 : 0;

  const isCpaGood = actualCpa > 0 && currentStats.targetCpa > 0 ? actualCpa <= currentStats.targetCpa : true;
  const cpaColor = currentStats.spend > 0 ? (isCpaGood ? 'text-emerald-400' : 'text-rose-400 font-bold') : 'text-gray-500';

  const handleNameChange = (val: string) => {
    onUpdate(project.id, { ...project, name: val });
  };

  const handleLeadChange = (date: string, val: string) => {
    const lowerVal = val.toLowerCase();
    if (lowerVal === 'н' || lowerVal === 'n') {
      onUpdate(project.id, {
        ...project,
        leads: { ...project.leads, [date]: NO_BUDGET_VALUE }
      });
      return;
    }
    const num = parseFloat(val) || 0;
    onUpdate(project.id, {
      ...project,
      leads: { ...project.leads, [date]: num }
    });
  };

  const handleStatChange = <K extends keyof WeeklyStats>(field: K, value: number) => {
    onUpdate(project.id, {
      ...project,
      weeks: {
        ...project.weeks,
        [weekStart]: { ...currentStats, [field]: value }
      }
    });
  };

  const inputClass = "bg-transparent text-center focus:bg-white/10 focus:outline-none rounded py-1 transition-colors";
  const cellClass = "p-2";
  
  // Чередование цвета строк
  const isEvenRow = rowIndex % 2 === 0;
  const rowBgClass = isEvenRow ? 'bg-slate-900/40' : 'bg-slate-800/40';
  const stickyCellBg = isEvenRow ? 'bg-slate-900/95' : 'bg-slate-800/95';
  
  const getInputWidth = (value: string | number | undefined, minChars = 3) => {
    const len = String(value ?? '').length || minChars;
    const chars = Math.max(len, minChars);
    return { width: `${chars * 0.65 + 1.2}em` };
  };

  const getTextInputWidth = (value: string | undefined, minChars = 6) => {
    const len = (value || '').length || minChars;
    const chars = Math.max(len, minChars);
    return { width: `${chars * 0.6 + 1.5}em` };
  };

  const getLeadDisplayValue = (date: string): string => {
    const val = project.leads[date];
    if (val === NO_BUDGET_VALUE) return 'Н';
    if (val === 0) return '';
    return val?.toString() || '';
  };

  const isNoBudget = (date: string): boolean => {
    return project.leads[date] === NO_BUDGET_VALUE;
  };

  const getProgressColor = () => {
    if (planPercent >= 100) return 'bg-emerald-500';
    if (planPercent >= 70) return 'bg-blue-500';
    if (planPercent >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <tr className={`${rowBgClass} hover:bg-white/[0.05] transition-colors group`}>
      {ownerName && (
        <td className={`${cellClass} min-w-[100px] text-indigo-300 font-medium sticky-col ${stickyCellBg} backdrop-blur-sm border-r-2 border-r-white/20`}>
          {ownerName}
        </td>
      )}

      {/* Проект - с жирным разделителем справа */}
      <td className={`${cellClass} min-w-[120px] md:min-w-[150px] ${!ownerName ? `sticky-col ${stickyCellBg} backdrop-blur-sm border-r-2 border-r-white/20` : ''}`}>
        <input
          type="text"
          value={project.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full bg-transparent text-left font-bold focus:outline-none py-1 px-1 text-white text-base"
          placeholder="Город/Проект"
        />
      </td>

      {/* Дни недели */}
      {days.map((date) => {
        const displayValue = getLeadDisplayValue(date);
        const noBudget = isNoBudget(date);
        return (
          <td key={date} className={`${cellClass} ${noBudget ? 'bg-rose-500/30' : ''}`}>
            <input
              type="text"
              value={displayValue}
              onChange={(e) => handleLeadChange(date, e.target.value)}
              style={getInputWidth(displayValue || '0', 2)}
              className={`${inputClass} text-sm ${noBudget ? 'text-rose-300 font-bold' : 'text-gray-300'}`}
              placeholder="0"
            />
          </td>
        );
      })}

      {/* Итого - с жирным разделителем справа */}
      <td className={`${cellClass} text-center font-bold text-emerald-300 border-r-2 border-r-white/20 bg-emerald-900/20`}>
        <span className="text-base">{weeklyLeadsCount}</span>
      </td>

      {/* План */}
      <td className={`${cellClass}`}>
        <input 
          type="number" 
          value={currentStats.goal || ''} 
          onChange={(e) => handleStatChange('goal', parseFloat(e.target.value))}
          disabled={!isPlanEditable}
          style={getInputWidth(currentStats.goal, 3)}
          className={`${inputClass} text-sm ${!isPlanEditable ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400'}`}
          placeholder="0"
        />
      </td>

      {/* % с прогресс-баром */}
      <td className={`${cellClass} min-w-[80px]`}>
        <div className="flex flex-col items-center gap-1">
          <span className={`text-xs font-bold ${planPercent >= 100 ? 'text-emerald-400' : planPercent >= 70 ? 'text-blue-400' : 'text-gray-400'}`}>
            {planPercent.toFixed(0)}%
          </span>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(planPercent, 100)}%` }}
            />
          </div>
        </div>
      </td>

      {/* Бюджет */}
      <td className={`${cellClass}`}>
        <input 
          type="number" 
          value={currentStats.budget || ''} 
          onChange={(e) => handleStatChange('budget', parseFloat(e.target.value))}
          style={getInputWidth(currentStats.budget, 4)}
          className={`${inputClass} text-gray-400 text-sm`}
          placeholder="₽"
        />
      </td>

      {/* Открут */}
      <td className={`${cellClass}`}>
        <input 
          type="number" 
          value={currentStats.spend || ''} 
          onChange={(e) => handleStatChange('spend', parseFloat(e.target.value))}
          style={getInputWidth(currentStats.spend, 4)}
          className={`${inputClass} text-white text-sm`}
          placeholder="₽"
        />
      </td>

      {/* CPL */}
      <td className={`${cellClass} text-center`}>
        <span className={`font-medium text-sm ${cpaColor}`}>
          {currentStats.spend > 0 && weeklyLeadsCount === 0 ? '∞' : weeklyLeadsCount > 0 ? actualCpa.toFixed(0) : '0'}
        </span>
      </td>

      {/* KPI - с жирным разделителем справа */}
      <td className={`${cellClass} border-r-2 border-r-white/20`}>
        <input 
          type="number" 
          value={currentStats.targetCpa || ''} 
          onChange={(e) => handleStatChange('targetCpa', parseFloat(e.target.value))}
          style={getInputWidth(currentStats.targetCpa, 3)}
          className={`${inputClass} text-gray-400 text-sm`}
          placeholder="₽"
        />
      </td>

      {/* Связки - 4 пары */}
      {[0, 1, 2, 3].map((index) => {
        const bundle = project.bundles?.[index];
        const isLastBundle = index === 3;
        return (
          <React.Fragment key={`bundle-${index}`}>
            <td className={`${cellClass}`}>
              <input
                type="text"
                value={bundle?.bundle || ''}
                onChange={(e) => {
                  const newBundles = [...(project.bundles || [])];
                  newBundles[index] = { bundle: e.target.value, unscrew: bundle?.unscrew || 0 };
                  onUpdate(project.id, { ...project, bundles: newBundles });
                }}
                style={getTextInputWidth(bundle?.bundle, 5)}
                className={`${inputClass} text-indigo-300 text-sm`}
                placeholder="Связка"
              />
            </td>
            <td className={`${cellClass} ${isLastBundle ? 'border-r-2 border-r-white/20' : ''}`}>
              <input
                type="number"
                value={bundle?.unscrew || ''}
                onChange={(e) => {
                  const newBundles = [...(project.bundles || [])];
                  newBundles[index] = { bundle: bundle?.bundle || '', unscrew: parseFloat(e.target.value) || 0 };
                  onUpdate(project.id, { ...project, bundles: newBundles });
                }}
                style={getInputWidth(bundle?.unscrew, 3)}
                className={`${inputClass} text-indigo-300 text-sm`}
                placeholder="₽"
              />
            </td>
          </React.Fragment>
        );
      })}

      {/* Кнопка удаления */}
      <td className={`${cellClass} text-center`}>
        <button 
          onClick={() => onDelete(project.id)}
          className="p-1.5 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Удалить проект"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
};
