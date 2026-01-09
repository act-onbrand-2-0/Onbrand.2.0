'use client';

import { BudgetForm } from '@/components/agents/budget/budget-form';
import { Toaster } from 'sonner';

export default function BudgetPage() {
  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 max-w-4xl mx-auto">
        <BudgetForm />
      </div>
    </>
  );
}
