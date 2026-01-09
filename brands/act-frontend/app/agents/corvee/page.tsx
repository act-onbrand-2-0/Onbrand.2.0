'use client';

import { CorveeForm } from '@/components/agents/corvee/corvee-form';
import { Toaster } from 'sonner';

export default function CorveePage() {
  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 max-w-4xl mx-auto">
        <CorveeForm />
      </div>
    </>
  );
}
