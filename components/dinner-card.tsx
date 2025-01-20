import { DinnerEvent } from '@/app/lib/googlesheets';
import Link from 'next/link';

import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter } from "@heroui/card";

export const DinnerCard = ({event, house}: {event: DinnerEvent, house: string} ) => 
  <Card>
    <CardBody>
      <Link href={`/participation/${house}/${event.index}`}>
        <div className="flex items-center justify-between">  
          <div>
            <p>{event.date}: {participationText(event)}</p>
            <p className="font-bold">{event.menu}</p>
            {event.editable && <p className="text-rose-500 text-sm">Tilmelding før {event.extraInfo.deadline}</p>}
          </div> 
        </div>
      </Link>
    </CardBody>
    {editButton(event, house)}
  </Card>

function participationText(event: DinnerEvent): string {
  if (event.participation != null) {
    return `${event.participation.takeaway ? "Takeaway" : "Deltager"} (${event.participation.adults} ${event.participation.adults == 1 ? 'voksen' : 'voksne'}, ${event.participation.children} ${event.participation.children == 1 ? 'barn' : 'børn'})`;
  } else if (event.editable) {
    return 'Tilmeld';
  } else {
    return 'Tilmelding lukket';
  }
}

function editButton(event: DinnerEvent, house: string): JSX.Element {
  if (event.extraInfo.expenseHouse == house) {
    return (
      <CardFooter>
        <Link href={`/edit/${house}/${event.index}`}>
          <Button color="primary">Rediger fællesspisningsinfo</Button>
        </Link>
      </CardFooter>
    );
  } else {
    return (<></>);
  }
}