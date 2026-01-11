import React from 'react';
import { Project, WeeklyStats } from '../types';
import { Trash2 } from 'lucide-react';

interface ProjectRowProps {
  project: Project;
  weekStart: string; // YYYY-MM-DD of Monday
  days: string[]; // Array of 7 YYYY-MM-DD strings
  onUpdate: (id: string, updated: Project) => void;
  onDelete: (id: string) => void;
  ownerName?: string;
  isPlanEditable?: boolean;
}

export const ProjectRow: React.FC<ProjectRowProps> = React.memo(({ 
  project, 
  weekStart, 
  days, 
  onUpdate, 
  onDelete, 
  ownerName,
  isPlanEditable = true 
}) => {
  // Get stats for current week or use defaults
  const currentStats: WeeklyStats = project.weeks[weekStart] || {
    budget: project.defaultBudget,
    spend: 0,
    goal: project.defaultGoal,
    targetCpa: project.defaultTargetCpa
  };

  const weeklyLeadsCount = days.reduce((acc, date) => acc + (project.leads[date] || 0), 0);
  
  const actualCpa = weeklyLeadsCount > 0 ? currentStats.spend / weeklyLeadsCount : 0;
  const planPercent = currentStats.goal > 0 ? (weeklyLeadsCount / currentStats.goal) * 100 : 0;

  // Status logic
  const isCpaGood = actualCpa > 0 && currentStats.targetCpa > 0 ? actualCpa <= currentStats.targetCpa : true;
  const cpaColor = currentStats.spend > 0 ? (isCpaGood ? 'text-emerald-400' : 'text-rose-400 font-bold') : 'text-gray-400';
  const cpaBg = currentStats.spend > 0 ? (isCpaGood ? 'bg-emerald-500/10' : 'bg-rose-500/10') : '';

  const handleNameChange = (val: string) => {
    onUpdate(project.id, { ...project, name: val });
  };

  const handleLeadChange = (date: string, val: string) => {
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

  const inputClass = "w-full bg-transparent text-center focus:bg-white/10 focus:outline-none rounded py-1 transition-colors";
  const cellClass = "p-2 border-r border-white/5 last:border-r-0";

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      {ownerName && (
        <td className={`${cellClass} min-w-[100px] text-indigo-300 font-medium`}>
          {ownerName}
        </td>
      )}

      {/* Project Name */}
      <td className={`${cellClass} min-w-[150px]`}>
        <input
          type="text"
          value={project.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full bg-transparent text-left font-medium focus:outline-none py-1 px-2 text-white"
          placeholder="Город/Проект"
        />
      </td>

      {/* Daily Inputs */}
      {days.map((date) => (
        <td key={date} className={`${cellClass} w-[60px]`}>
          <input
            type="number"
            min="0"
            value={project.leads[date] === 0 ? '' : project.leads[date]?.toString() || ''}
            onChange={(e) => handleLeadChange(date, e.target.value)}
            className={`${inputClass} text-gray-300`}
            placeholder="0"
          />
        </td>
      ))}

      {/* Weekly Total */}
      <td className={`${cellClass} text-center font-bold text-white bg-white/5 w-[80px]`}>
        {weeklyLeadsCount}
      </td>

      {/* Plan (Goal) */}
      <td className={`${cellClass} w-[70px]`}>
        <input 
          type="number" 
          value={currentStats.goal || ''} 
          onChange={(e) => handleStatChange('goal', parseFloat(e.target.value))}
          disabled={!isPlanEditable}
          className={`${inputClass} ${!isPlanEditable ? 'text-gray-500 cursor-not-allowed' : 'text-gray-400'}`}
          placeholder="План"
        />
      </td>

      {/* % Plan (D) */}
      <td className={`${cellClass} text-center w-[70px]`}>
        <span className={planPercent >= 100 ? 'text-emerald-400 font-bold' : 'text-blue-400'}>
          {planPercent.toFixed(0)}%
        </span>
      </td>

      {/* Budget */}
      <td className={`${cellClass} w-[90px]`}>
        <input 
          type="number" 
          value={currentStats.budget || ''} 
          onChange={(e) => handleStatChange('budget', parseFloat(e.target.value))}
          className={`${inputClass} text-white`}
          placeholder="₽"
        />
      </td>

      {/* Total Spend */}
      <td className={`${cellClass} w-[90px]`}>
        <input 
          type="number" 
          value={currentStats.spend || ''} 
          onChange={(e) => handleStatChange('spend', parseFloat(e.target.value))}
          className={`${inputClass} text-white`}
          placeholder="₽"
        />
      </td>

      {/* Actual CPA */}
      <td className={`${cellClass} text-center w-[90px] ${cpaBg}`}>
        <span className={`font-medium ${cpaColor}`}>
           {currentStats.spend > 0 && weeklyLeadsCount === 0 ? 'INF' : `${actualCpa.toFixed(0)}`}
        </span>
      </td>

      {/* Target CPA */}
      <td className={`${cellClass} w-[90px]`}>
        <input 
          type="number" 
          value={currentStats.targetCpa || ''} 
          onChange={(e) => handleStatChange('targetCpa', parseFloat(e.target.value))}
          className={`${inputClass} text-gray-400`}
          placeholder="₽"
        />
      </td>

      {/* Actions */}
      <td className={`${cellClass} w-[50px] text-center`}>
        <button 
          onClick={() => onDelete(project.id)}
          className="p-1.5 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors opacity-40 hover:opacity-100"
          title="Удалить проект"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
});