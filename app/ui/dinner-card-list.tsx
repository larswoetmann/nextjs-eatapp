import { getCachedHouseAndCookSheetRows, DinnerEvent } from '@/app/lib/googlesheets';
import { DinnerCard } from "@/components/dinner-card";
import Link from 'next/link';
import { Button } from "@nextui-org/button";

function getWeekNumber(d: number): number {
  var date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
}

function showWeekText(events: DinnerEvent[], index: number): boolean {
  if (getWeekNumber(Date.now()) == getWeekNumber(events[index].dateAsNumber)) {
    return false;
  }

  return index == 0 || getWeekNumber(events[index].dateAsNumber) != getWeekNumber(events[index-1].dateAsNumber);
}

function getWeekText(event: DinnerEvent): string {
  if(getWeekNumber(Date.now()) + 1 == getWeekNumber(event.dateAsNumber)) {
    return "Næste uge:";
  } else {
    return `Uge ${getWeekNumber(event.dateAsNumber)}:`;
  }
}

export async function DinnerCardList({house}: {house: string}) {
  const info = await getCachedHouseAndCookSheetRows(house);
  const hasEvents = info.events.length > 0;

  return (
    <>
    <ul className="grid gap-2">
      {hasEvents ? 
        info.events.map((event, index) => getCard(info.events, index, house)) 
        : 
        <span>Der er ikke nogen fremtidige middage planlagt</span>
      }
    </ul>
    <div className="inline-block text-center justify-center">
      <Link href={`/edit/${house}/0`}>
        <Button color="primary">Tilføj ny fællesspisning</Button>
      </Link>
    </div>
    </>
  );
}

function getCard(events: DinnerEvent[], index: number, house: string): JSX.Element {
  if (showWeekText(events, index)) {
    return (
      <li key={index} className="grid gap-2">
        <div>{getWeekText(events[index])}</div>
        <DinnerCard event={events[index]} house={house}/>
      </li>
    );
  } else {
    return (
      <li key={index}>
        <DinnerCard event={events[index]} house={house}/>
      </li>
    )
  }
}
