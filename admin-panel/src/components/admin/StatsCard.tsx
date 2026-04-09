'use client';
import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  loading?: boolean;
}

export function StatsCard({ title, value, change, icon, loading = false }: StatsCardProps) {
  const isPositive = change && change.value >= 0;

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {value}
            </p>
            {change && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isPositive ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {change.value}%
                </span>
                <span className="text-gray-400 font-normal">{change.label}</span>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-lg bg-[#C9A4A0]/10 text-[#C9A4A0]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
