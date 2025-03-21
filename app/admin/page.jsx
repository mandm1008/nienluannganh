import { redirect } from 'next/navigation';

export default function HomeAdmin() {
  redirect('/admin/login');
}
