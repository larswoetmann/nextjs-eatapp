'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { updateHouseParticipation } from '@/app/lib/googlesheets';

export async function updateHouseParticipationAction(formData: FormData) {
  const rawFormData = {
    adults: formData.get('adults')!.toString(),
    children: formData.get('children')!.toString(),
    rownumber: formData.get('rownumber')!.toString(),
    house: formData.get('house')!.toString(),
  };

  console.log(`updateHouseParticipation called with ${rawFormData}`);

  const values: string[] = [rawFormData.adults, rawFormData.children, '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE'];

  await updateHouseParticipation(rawFormData.house, '1xDN0cD_-LM6DRp7qqW9vNfHd6kxsj9W_BjZD2aPFTPY', rawFormData.rownumber, values);

  revalidateTag('sheet_data');
  redirect('/');
}