'use client';

import { updateHouseParticipationAction } from '@/app/lib/actions';
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import { DinnerEvent } from '@/app/lib/googlesheets';

export default function Form({ event, house }: { event: DinnerEvent, house: string }) {

  return (
    <form action={updateHouseParticipationAction}>
        <Input name="adults" label="Voksne" type="number" />
        <Input name="children" label="Børn" type="number" />
        <Checkbox name="takeaway">Takeaway</Checkbox>

        <div className="border rounded-md p-4">
          <div className="grid grid-cols-2 gap-4">
            <Checkbox name="meat">Meat</Checkbox>
            <Checkbox name="gluten">Gluten</Checkbox>
            <Checkbox name="lactose">Lactose</Checkbox>
            <Checkbox name="milk">Milk</Checkbox>
            <Checkbox name="nuts">Nuts</Checkbox>
            <Checkbox name="freshFruit">Fresh Fruit</Checkbox>
            <Checkbox name="onions">Onions</Checkbox>
            <Checkbox name="carrots">Carrots</Checkbox>
          </div>
        </div>

        <input name="rownumber" type="hidden" value={event.index} />
        <input name="house" type="hidden" value={house} />
        <Button type="submit">Tilmeld</Button>
    </form>
  );
}