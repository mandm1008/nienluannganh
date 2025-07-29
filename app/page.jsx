import { redirect } from 'next/navigation';

export default async function Home({ searchParams }) {
  const queryString = new URLSearchParams(await searchParams).toString();
  const target = queryString ? `/exam-rooms?${queryString}` : '/exam-rooms';

  redirect(target);
}
