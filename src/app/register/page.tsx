import prisma from '@/lib/prisma';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  // Query all rooms ordered by their names to display in the registration dropdown
  const rooms = await prisma.kamar.findMany({
    orderBy: { nomorKamar: 'asc' },
  });

  return <RegisterForm rooms={rooms} />;
}
