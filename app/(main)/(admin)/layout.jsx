import Auth from '@/components/Auth';

export default function AdminLayout({ children }) {
  return (
    <Auth>
      {children}
    </Auth>
  );
}
