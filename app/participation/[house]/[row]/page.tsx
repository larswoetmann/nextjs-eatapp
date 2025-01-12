import { Metadata } from 'next';
import { getCachedHouseAndCookSheetRows } from '@/app/lib/googlesheets';
import Form from '@/app/ui/edit-participation-form';

export const metadata: Metadata = {
  title: 'Deltagelse',
};

export default async function Page(props: { params: Promise<{ house: string, row: number }> }) {
  const params = await props.params;
  const house = params.house;
  const id = params.row;

  const info = await getCachedHouseAndCookSheetRows(house);
  const event = info.events.find((e) => e.index == id)!;

  return (
    <main>
      {event?.menu}
      <Form event={event} house={house}/>
    </main>
  );
}
