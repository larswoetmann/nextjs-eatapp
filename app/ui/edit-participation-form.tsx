'use client';

import { updateHouseParticipationAction } from '@/app/lib/actions';
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import { DinnerEvent } from '@/app/lib/googlesheets';

export default function Form({ event, house }: { event: DinnerEvent, house: string }) {

  return (
    <form action={updateHouseParticipationAction}>
        <Input name="adults" label="Voksne" type="number" />
        <Input name="children" label="Børn" type="number" />
        <input name="rownumber" type="hidden" value={event.index} />
        <input name="house" type="hidden" value={house} />
        <Button type="submit">Tilmeld</Button>
    </form>
  );
}