import { redirect } from 'next/navigation';

export default function LegacyRegisterPage() {
  redirect('/admin/login');
}
