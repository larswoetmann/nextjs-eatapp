'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { updateHouseParticipation } from '@/app/lib/googlesheets';
import { spreadSheedId } from '@/app/lib/data';

export async function updateHouseParticipationAction(formData: FormData) {
  const rawFormData = {
    adults: formData.get('adults')!.toString(),
    children: formData.get('children')!.toString(),
    takeaway: formData.get('takeaway') != null ? 'TRUE' : 'FALSE',
    meat: formData.get('meat') != null ? 'TRUE' : 'FALSE',
    gluten: formData.get('gluten') != null ? 'TRUE' : 'FALSE',
    lactose: formData.get('lactose') != null ? 'TRUE' : 'FALSE',
    milk: formData.get('milk') != null ? 'TRUE' : 'FALSE',
    nuts: formData.get('nuts') != null ? 'TRUE' : 'FALSE',
    freshFruit: formData.get('freshFruit') != null ? 'TRUE' : 'FALSE',
    onions: formData.get('onions') != null ? 'TRUE' : 'FALSE',
    carrots: formData.get('carrots') != null ? 'TRUE' : 'FALSE',
    rownumber: formData.get('rownumber')!.toString(),
    house: formData.get('house')!.toString(),
  };

  console.log(`updateHouseParticipation called with ${JSON.stringify(rawFormData)}`);

  const values: string[] = [rawFormData.adults, rawFormData.children, rawFormData.takeaway, rawFormData.meat, rawFormData.gluten, rawFormData.lactose, rawFormData.milk, rawFormData.nuts, rawFormData.freshFruit, rawFormData.onions, rawFormData.carrots];

  await updateHouseParticipation(rawFormData.house, spreadSheedId, rawFormData.rownumber, values);

  revalidateTag('sheet_data');
  redirect('/');
}