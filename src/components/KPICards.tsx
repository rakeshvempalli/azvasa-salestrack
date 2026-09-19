import React from 'react';
import {
  Users,
  UserCheck,
  CalendarCheck,
  CalendarClock,
  AlertTriangle,
  Building2,
  Tv,
  FileText,
  FileCheck2,
  Briefcase
} from 'lucide-react';

import { KPIData } from '../types';

export type { KPIData };

interface KPICardsProps {
  data: KPIData;
  isSuperAdmin: boolean;
  onFilterClick?: (type: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ data, isSuperAdmin, onFilterClick }) => {
  const cards = [
    {
      id: 'total',
      label: 'Total Leads',
      value: data.totalLeads,
      icon: Users,
      color: 'blue',
      subtitle: 'All tracked accounts'
    },
    {
      id: 'active',
      label: 'Active Leads',
      value: data.activeLeads,
      icon: UserCheck,
      color: 'blue',
      subtitle: 'In active pipeline'
    },
    ...(isSuperAdmin && data.salesRepsCount !== undefined
      ? [
          {
            id: 'reps',
            label: 'Sales Reps',
            value: data.salesRepsCount,
            icon: Briefcase,
            color: 'blue',
            subtitle: 'Field executive team'
          }
        ]
      : []),
    {
      id: 'today',
      label: 'Follow-ups Today',
      value: data.followupsToday,
      icon: CalendarCheck,
      color: 'orange',
      subtitle: 'Priority calls/meetings'
    },
    {
      id: 'upcoming',
      label: 'Upcoming Follow-ups',
      value: data.upcomingFollowups,
      icon: CalendarClock,
      color: 'blue',
      subtitle: 'Scheduled next 7 days'
    },
    {
      id: 'overdue',
      label: 'Overdue Follow-ups',
      value: data.overdueFollowups,
      icon: AlertTriangle,
      color: 'attention', // darker AZVASA orange/gray treatment
      subtitle: 'Pending action required'
    },
    {
      id: 'visits',
      label: 'Visits',
      value: data.visits,
      icon: Building2,
      color: 'blue',
      subtitle: 'Campus walkthroughs'
    },
    {
      id: 'demos',
      label: 'Demos',
      value: data.demos,
      icon: Tv,
      color: 'orange',
      subtitle: 'IntelliRead/LMS demos'
    },
    {
      id: 'proposals',
      label: 'Proposals',
      value: data.proposals,
      icon: FileText,
      color: 'blue',
      subtitle: 'Commercial shared'
    },
    {
      id: 'agreements',
      label: 'Agreements',
      value: data.agreements,
      icon: FileCheck2,
      color: 'orange',
      subtitle: 'Signed partnerships'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {cards.map(card => {
        const Icon = card.icon;

        // Visual treatment strictly within AZVASA palette
        let bgStyle = 'bg-white border-[#e8e7e5] hover:border-[#084ab8]/40';
        let iconBg = 'bg-[#eef4ff] text-[#084ab8]';
        let valColor = 'text-[#084ab8]';

        if (card.color === 'orange') {
          iconBg = 'bg-[#fff4e6] text-[#f28705]';
          valColor = 'text-[#f28705]';
        } else if (card.color === 'attention') {
          // Overdue: darker AZVASA orange/gray styling per requirements
          bgStyle = 'bg-[#fffbf7] border-[#f28705]/40 hover:border-[#b85c00]';
          iconBg = 'bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/30';
          valColor = 'text-[#b85c00]';
        }

        return (
          <div
            key={card.id}
            onClick={() => onFilterClick && onFilterClick(card.id)}
            className={`p-3.5 rounded-2xl border ${bgStyle} transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#646260] line-clamp-1" title={card.label}>
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className={`text-2xl font-extrabold tracking-tight ${valColor}`}>
                {card.value}
              </div>
              <span className="text-[10px] text-[#8e8b88] mt-0.5 block line-clamp-1">
                {card.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
