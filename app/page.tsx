import { cookies } from 'next/headers'
import { HouseSelect } from "@/components/house-select";
import { Suspense } from 'react';
import { CardsSkeleton } from '@/app/ui/skeletons';
import { DinnerCardList } from '@/app/ui/dinner-card-list';
import { Title } from '@/components/title';

export default async function Home() {

  const cookieStore = await cookies();
  const house = cookieStore.get('house')?.value;
  
  if (house != null && house != "")
  {
    return (
      <section className="grid gap-2">
        <Title/>
        <Suspense fallback={<CardsSkeleton />}>
          <DinnerCardList house={house}/>
        </Suspense>
      </section>
    );
  } else {
    return (
      <section className="grid gap-2">
        <Title/>
        <HouseSelect/>
      </section>
    );
  }
}
