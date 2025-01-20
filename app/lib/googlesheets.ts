import { google } from 'googleapis';
import { JWT } from "google-auth-library";
import { unstable_cache, revalidateTag } from 'next/cache';
import { spreadSheedId } from '@/app/lib/data';

export async function getCachedHouseAndCookSheetRows(house: string): Promise<DinnerInformation> {
  const cached = unstable_cache(
    async (house: string) => getHouseAndCookSheetRows(house, spreadSheedId),
    [],
    {
      revalidate: 600,
      tags: ['sheet_data']
    }
  )

  return cached(house);
}

async function getHouseAndCookSheetRows(houseNumber: string, spreadSheetId: string, todaysRowNumber?: number): Promise<DinnerInformation> {
  const sheets = google.sheets("v4");
  const startRow = getStartRow(todaysRowNumber);
  const ranges = [`${houseNumber}!D${startRow}:O${getEndRow(todaysRowNumber)}`, `KOK!A${startRow}:AI${getEndRow(todaysRowNumber)}`];
  console.log(`getting ranges ${ranges[0]} and ${ranges[1]} from ${spreadSheetId}`);
  const response = await sheets.spreadsheets.values.batchGet({auth: getAuth(), spreadsheetId: spreadSheetId, ranges: ranges});
  const houseSheetRows = response.data.valueRanges![0].values ?? [] as string[][];
  const cookSheetRows = response.data.valueRanges![1].values ?? [] as string[][];

  const [cookSheetRowDataList, availableDays] = mapCookSheetData(cookSheetRows, startRow);
  const houseSheetRowDataList = mapHouseSheetData(houseSheetRows, startRow, cookSheetRowDataList);

  const info = await mapDataToDinnerInformation(houseSheetRowDataList, cookSheetRowDataList, availableDays);
  return info;
}

//housenumber=P47
//spreadsheet=1RE2L1jjnzetcpIWl9DAOjkvK5JmmlgSY_ygLG7jxMMQ
//row=25
//values[]=2&values[]=2&values[]=&values[]=&values[]=TRUE&values[]=TRUE&values[]=TRUE&values[]=TRUE&values[]=TRUE&values[]=TRUE&values[]=TRUE&values[]=FALSE
export async function updateHouseParticipation(houseNumber: string, spreadSheetId: string, rowNumber: string, values: string[]): Promise<void> {
  const sheets = google.sheets("v4");
  const range = `${houseNumber}!D${rowNumber}:O${rowNumber}`;
  console.log(`updating ${range} with ${values} in ${spreadSheetId}`);
  const params = {auth: getAuth(), spreadsheetId: spreadSheetId, range: range, valueInputOption: "USER_ENTERED", requestBody: {values: [values]}};
  await sheets.spreadsheets.values.update(params);
  revalidateTag('sheet_data');
}

export async function updateDinnerEvent(houseNumber: string, spreadSheetId: string, rowNumber: string, valuesOne: string[], valuesTwo: string[]): Promise<void> {
  const sheets = google.sheets("v4");
  const valueRangeOne = {range: `KOK!D${rowNumber}:F${rowNumber}`, values: [valuesOne]};
  const valueRangeTwo = {range: `KOK!W${rowNumber}:AF${rowNumber}`, values: [valuesTwo]};
  console.log(`updating ${valueRangeOne.range} and ${valueRangeTwo.range} with ${valuesOne} and ${valuesTwo} in ${spreadSheetId}`);
  const params = {auth: getAuth(), spreadsheetId: spreadSheetId, requestBody: {data: [valueRangeOne, valueRangeTwo], valueInputOption: "USER_ENTERED"}};
  await sheets.spreadsheets.values.batchUpdate(params);
  revalidateTag('sheet_data');
}

export async function updateExpenseForDinnerEvent(houseNumber: string, spreadSheetId: string, rowNumber: string, expense: number): Promise<void> {
  const sheets = google.sheets("v4");
  const range = `KOK!G${rowNumber}:G${rowNumber}`;
  console.log(`updating ${range} with ${expense} in ${spreadSheetId}`);
  const params = {auth: getAuth(), spreadsheetId: spreadSheetId, range: range, valueInputOption: "USER_ENTERED", requestBody: {values: [[expense]]}};
  await sheets.spreadsheets.values.update(params);
  revalidateTag('sheet_data');
}

interface AvailablityData {
  rowNumber: number;

  date: number;
}

interface CookSheetRowData {
  rowNumber: number;

  date: number;
  deadlineDays: number;
  deadlineTimeOfDay: number;
  expenseHouse: string;
  expenses: string;

  eatingInSum: number;
  adultsEatingIn: number;
  childrenEatingIn: number;
  adultsTakeaway: number;
  childrenTakeaway: number;
  portionsSum: number;

  meatParticipants: number;
  glutenParticipants: number;
  lactoseParticipants: number;
  milkParticipants: number;
  nutsParticipants: number;
  freshFruitParticipants: number;
  onionsParticipants: number;
  carrotsParticipants: number;

  chefs: string;
  menu: string;

  meatPossible: boolean;
  glutenPossible: boolean;
  lactosePossible: boolean;
  milkPossible: boolean;
  nutsPossible: boolean;
  freshFruitPossible: boolean;
  onionsPossible: boolean;
  carrotsPossible: boolean;

  priceAdults: string;
  priceChildren: string;
}

interface HouseSheetRowData {
  rowNumber: number;

  adultsEatingIn: number;
  childrenEatingIn: number;
  adultsTakeaway: number;
  childrenTakeaway: number;

  meat: boolean;
  gluten: boolean;
  lactose: boolean;
  milk: boolean;
  nuts: boolean;
  freshFruit: boolean;
  onions: boolean;
  carrots: boolean;
}

const MAX_ROWS_TO_FETCH = 30;

function mapHouseSheetData(houseSheetRows: string[][], startRow: number, cookSheetRowDataList: CookSheetRowData[]): HouseSheetRowData[] {
  const houseSheetRowDataList: HouseSheetRowData[] = [];

  for (let i=0; i<cookSheetRowDataList.length; i++) {
    const houseRowIndex = cookSheetRowDataList[i].rowNumber - startRow;
    const row = houseSheetRows[houseRowIndex];
    if (row[0] != "" || row[1] != "" || row[2] != "" || row[3] != "") {
      const houseSheetRowData: HouseSheetRowData = {
        rowNumber: cookSheetRowDataList[i].rowNumber,

        adultsEatingIn: parseInt(row[0]) || 0,
        childrenEatingIn: parseInt(row[1]) || 0,
        adultsTakeaway: parseInt(row[2]) || 0,
        childrenTakeaway: parseInt(row[3]) || 0,

        meat: row[4] == "TRUE",
        gluten: row[5] == "TRUE",
        lactose: row[6] == "TRUE",
        milk: row[7] == "TRUE",
        nuts: row[8] == "TRUE",
        freshFruit: row[9] == "TRUE",
        onions: row[10] == "TRUE",
        carrots: row[11] == "TRUE",
      };
      houseSheetRowDataList.push(houseSheetRowData);
    }
  }

  return houseSheetRowDataList;
}

function mapCookSheetData(cookSheetRows: string[][], startRow: number): [cookSheetRows: CookSheetRowData[], availableDays: AvailablityData[]] {
  const cookSheetRowDataList: CookSheetRowData[] = [];
  const availableDays: AvailablityData[] = [];

  const todaysDate = new Date(Date.now());
  todaysDate.setHours(0, 0, 0, 0);
  for (let i=0; i<cookSheetRows.length; i++) {
    const row = cookSheetRows[i];
    if (row.length >= 32) {
      const date = new Date(row[0]);
      if (date.getTime() >= todaysDate.getTime()) {
        if (row[23] != "") {
          const cookSheetRowData: CookSheetRowData = {
            rowNumber: i + startRow,
            date: date.getTime(),
            deadlineDays: parseInt(row[3]) || 0,
            deadlineTimeOfDay: parseInt(row[4]) || 0,
            expenseHouse: row[5],
            expenses: row[6],

            eatingInSum: parseInt(row[8]) || 0,
            adultsEatingIn: parseInt(row[9]) || 0,
            childrenEatingIn: parseInt(row[10]) || 0,
            adultsTakeaway: parseInt(row[11]) || 0,
            childrenTakeaway: parseInt(row[12]) || 0,
            portionsSum: parseFloat(row[13].replaceAll(",", ".")) || 0,

            meatParticipants: parseInt(row[14]) || 0,
            glutenParticipants: parseInt(row[15]) || 0,
            lactoseParticipants: parseInt(row[16]) || 0,
            milkParticipants: parseInt(row[17]) || 0,
            nutsParticipants: parseInt(row[18]) || 0,
            freshFruitParticipants: parseInt(row[19]) || 0,
            onionsParticipants: parseInt(row[20]) || 0,
            carrotsParticipants: parseInt(row[21]) || 0,

            chefs: row[22],
            menu: row[23],

            meatPossible: row[24] == "TRUE",
            glutenPossible: row[25] == "TRUE",
            lactosePossible: row[26] == "TRUE",
            milkPossible: row[27] == "TRUE",
            nutsPossible: row[28] == "TRUE",
            freshFruitPossible: row[29] == "TRUE",
            onionsPossible: row[30] == "TRUE",
            carrotsPossible: row[31] == "TRUE",

            priceAdults: row.length >= 35 ? row[33] : "",
            priceChildren: row.length >= 35 ? row[34] : "",
          };
          cookSheetRowDataList.push(cookSheetRowData);
        } else {
          const availablityData: AvailablityData = {
            rowNumber: i + startRow,
            date: date.getTime(),
          };
          availableDays.push(availablityData);
        }
      }
    }
  }

  return [cookSheetRowDataList, availableDays];
}

/**
 * Calculates the end row.
 * If todaysRowNumber is undefined then we need to get all rows because we do not know what row today is on.
 */
function getEndRow(todaysRowNumber?: number): string {
  return todaysRowNumber !== undefined ? (todaysRowNumber+MAX_ROWS_TO_FETCH).toString() : "";
}

/**
 * Calculates the start row.
 * If todaysRowNumber is undefined then we need to get all rows because we do not know what row today is on.
 * We skip the first 2 rows since they are header rows.
 */
function getStartRow(todaysRowNumber?: number): number {
  return todaysRowNumber !== undefined ? todaysRowNumber : 3;
}

function getAuth(): JWT {
  return new JWT({
    email: keydata.client_email,
    key: keydata.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const keydata={
  "private_key":`-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCp75MIwYPuIdnh
Yg1G2UjVQHC/bb32LHtpoaywlNksuhivUAaS96K7TBHoWlzGz5B0awpcgCtHNC9Y
iOFXG8WElzcstqudy477VtDJgb4b/mJ3gmGGD0dJMbVMwJJaseA4dHDS24rgzW4o
R7VTpV7AgUCQDp5JHSte9cvuKcN0WZkTXiRXJu3SwJ9/AJfNy1W2kEVkY2mYWtRB
VJcv9vxyv7nuK0z0+mW8+lzjLWm80bUJamOeVYPUX6KZnUnbsEZFJ07zfpy698tK
vXdafr5T39jsajxIS3g7GYjOPiMw9Ewfcu0pwkx+DVlURc8pfIJ99yNgz8VoP/GO
lZaT+2jTAgMBAAECggEAGyf+3jJWi/J66AqMRpsoiXOf0OePqMxY+HtuplVTE1O1
6CYotsm+BqJUZkYyd07qLcCBSmDtCZbsTgCpygrVGKg1l/6lFDVYZw/rk5gZMk4H
nEOIpCzC3o6EA3zupnGwfDUXZorQ+bW6edNjxbcymh7Nm3fKkbKIoMc0zJ1975Sz
IFuPuNf62bujvLJpDG/Ezf4jDydzvsiIN5PtPb2DFbZFZmapvT18GO/A4kJoy2qx
ourxyf8qAcfDbRme2LmRGtQBORO4k61gkjeyvqDWmMXFHxTG01uvxAUEtowkAnXT
wS4PXryJGBm7Hly1u9Vw6OIYpsll6ZQimJ7QavDOsQKBgQDcFOVWwlf8xDBHSKBq
fUevzRtD6K/Z1w1ZT3aN5US2wzEVfhQqztux12viMu9Hg7B6t57mYTEtlEGmMY5S
gM13lmnxOUIAtt6z0Mx9+uSFPisPGQbpfVeGhee0QwJNxBCyt349QckdB6P2qkUr
lvnsHD2Wso849i9Fyu3FsBOvawKBgQDFq5DtWSw6B1dH/3imx49gDq+38vmFrbEj
PNt/oeS6f0viMOCMBHSQyPxCwr1QQU541PI3IquiIBnym5v73mIwLeTK8L9w77BF
RP1LcqFB3qAWSiN0OobAKtkU0ThM19WveomiXoc1Q75xyuI0Pe4lfgfUeZlV/D6r
gFoI6+SOOQKBgEeUGD8OeFWCbX1RtrLLyjv4Rozgqgj8s5+/g3yE+8NBWr51whNm
Mff2a2UnUcF9qDFRdUHSjI8Zb/ygk3xr3eeuKQjGqZvX3ji3iTrUFezsGk8PwbrB
BG2BMankPWSThybJHSrJMaLacE5ydIrH0MMlMDbKHmDVWOynIowwR0a/AoGBAIu+
qwrhS/8KSY5A8g8Wbio+t8OYJwd2sBB1achlr8qZTBBw9Y6HZ9EkBhM8kZI3WT7b
bRHFlQldIHr/v9rkcQ4Wo/VFFlLFYRzXlSrNs2tZ9FtNtpro9XLN2AJ7lw3cWNli
DAOaSIRDjFPuVtUQI1imLOrtvJWparTcXMqJ2l8hAoGAc7Q7zUAntxcGY/5OPFYt
UIViVlbAItIL7UXNI0jbsNeM1c+17BkdJ3aEnSSr8/uXUutq+pFc0d4EvCQt86nr
pe4WfH8bGPhjvGfF3gJ2Yy4S3fVIq50MvIpJAwOilPXTaWJ93h5/bVju3geIChTB
sGnwGWA2afjCxJxLoL4Q8SM=
-----END PRIVATE KEY-----`,
  "client_email":"staldhusene-eating-service-acc@staldhusene-eating.iam.gserviceaccount.com"
};

async function mapDataToDinnerInformation(houseSheetRows: HouseSheetRowData[], cookSheetRows: CookSheetRowData[], availableDays: AvailablityData[]): Promise<DinnerInformation> {

  const availableDatesForDinnerEvents: [index: number, date: string][] = [];
  for (let i=0; i<availableDays.length; i++) {
    const ourTuple: [number, string] = [availableDays[i].rowNumber, getDateAsString(new Date(availableDays[i].date))];
    availableDatesForDinnerEvents.push(ourTuple);
  }

  const list:DinnerEvent[] = [];
  for (let i=0; i<cookSheetRows.length; i++) {
    const participation = getParticipation(houseSheetRows.find((r) => r.rowNumber == cookSheetRows[i].rowNumber));
    const deadline = getDeadline(new Date(cookSheetRows[i].date), cookSheetRows[i].deadlineDays, cookSheetRows[i].deadlineTimeOfDay);
    const editable = Date.now() < deadline.getTime();
    const extraInfo = getExtraInfo(cookSheetRows[i], deadline);

    const event: DinnerEvent = {
      index: cookSheetRows[i].rowNumber, 
      date: getDateAsString(new Date(cookSheetRows[i].date)), 
      dateAsNumber: cookSheetRows[i].date, 
      menu: cookSheetRows[i].menu, 
      editable: editable, 
      chefCanAvoid: getAllergensCookSupport(cookSheetRows[i]), 
      participation: participation, 
      extraInfo: extraInfo
    };

    list.push(event);
  }

  const info: DinnerInformation = {
    events: list,
    availableDatesForDinnerEvents: availableDatesForDinnerEvents
  };
  return info;
  //return new DinnerInformation(list, availableDatesForDinnerEvents);
}

function getAllergensCookSupport(cookSheetRow:CookSheetRowData): Allergens {
  const allergens: Allergens = {
    meat: cookSheetRow.meatPossible, 
    gluten: cookSheetRow.glutenPossible, 
    lactose: cookSheetRow.lactosePossible, 
    milk: cookSheetRow.milkPossible, 
    nuts: cookSheetRow.nutsPossible, 
    freshFruit: cookSheetRow.freshFruitPossible, 
    onions: cookSheetRow.onionsPossible, 
    carrots: cookSheetRow.carrotsPossible
  };
  return allergens;
}

function getDeadline(dinnerEventDate:Date, daysBefore:number, hourOfDayBefore:number): Date {
  const lastDateToEdit = new Date(dinnerEventDate);
  lastDateToEdit.setDate(lastDateToEdit.getDate() - daysBefore);
  return new Date(lastDateToEdit.getFullYear(), lastDateToEdit.getMonth(), lastDateToEdit.getDate(), hourOfDayBefore);
}

function getParticipation(houseSheetRow:HouseSheetRowData | undefined): Participation | null {
  if (houseSheetRow === undefined || (houseSheetRow.adultsEatingIn + houseSheetRow.childrenEatingIn + houseSheetRow.adultsTakeaway + houseSheetRow.childrenTakeaway) == 0) {
    return null;
  }
  const isTakeaway = (houseSheetRow.adultsTakeaway + houseSheetRow.childrenTakeaway) > 0;
  const adults = isTakeaway ? houseSheetRow.adultsTakeaway : houseSheetRow.adultsEatingIn;
  const children = isTakeaway ? houseSheetRow.childrenTakeaway : houseSheetRow.childrenEatingIn;
  const participation: Participation = {
    adults: adults, 
    children: children, 
    takeaway: isTakeaway, 
    allergens: getAllergensOfParticipant(houseSheetRow)
  };
  return participation;
  //return new Participation(adults, children, isTakeaway, getAllergensOfParticipant(houseSheetRow));
}

function getAllergensOfParticipant(houseSheetRow:HouseSheetRowData): Allergens {
  const allergens: Allergens = {
    meat: houseSheetRow.meat, 
    gluten: houseSheetRow.gluten, 
    lactose: houseSheetRow.lactose, 
    milk: houseSheetRow.milk, 
    nuts: houseSheetRow.nuts, 
    freshFruit: houseSheetRow.freshFruit, 
    onions: houseSheetRow.onions, 
    carrots: houseSheetRow.carrots
  };
  return allergens;
}

function getExtraInfo(cookSheetRow:CookSheetRowData, deadline:Date): DinnerEventExtraInfo {
  const participantsInfo = getParticipantsInfo(cookSheetRow);
  const dinnerEventExtraInfo: DinnerEventExtraInfo = {
    deadline: getDateTimeAsString(deadline), 
    chefs: cookSheetRow.chefs, 
    priceAdults: cookSheetRow.priceAdults, 
    priceChildren: cookSheetRow.priceChildren, 
    expenseHouse: cookSheetRow.expenseHouse, 
    expenses: cookSheetRow.expenses, 
    participantsInfo: participantsInfo, 
    deadlineDays: cookSheetRow.deadlineDays, 
    deadlineTimeOfDay: cookSheetRow.deadlineTimeOfDay
  };
  return dinnerEventExtraInfo;
  //return new DinnerEventExtraInfo(getDateTimeAsString(deadline), cookSheetRow.chefs, cookSheetRow.priceAdults, cookSheetRow.priceChildren, cookSheetRow.expenseHouse, cookSheetRow.expenses, participantsInfo, cookSheetRow.deadlineDays, cookSheetRow.deadlineTimeOfDay);
}

function getParticipantsInfo(cookSheetRow:CookSheetRowData): ParticipantsInfo {
  const participantsInfo: ParticipantsInfo = {
    eatingInSum: cookSheetRow.eatingInSum, 
    adultsEatingIn: cookSheetRow.adultsEatingIn, 
    childrenEatingIn: cookSheetRow.childrenEatingIn, 
    adultsTakeaway: cookSheetRow.adultsTakeaway, 
    childrenTakeaway: cookSheetRow.childrenTakeaway, 
    portionsSum: cookSheetRow.portionsSum, 
    meat: cookSheetRow.meatParticipants,
    gluten: cookSheetRow.glutenParticipants, 
    lactose: cookSheetRow.lactoseParticipants, 
    milk: cookSheetRow.milkParticipants, 
    nuts: cookSheetRow.nutsParticipants, 
    freshFruit: cookSheetRow.freshFruitParticipants, 
    onions: cookSheetRow.onionsParticipants, 
    carrots: cookSheetRow.carrotsParticipants
  };
  return participantsInfo;
  // return new ParticipantsInfo(cookSheetRow.eatingInSum, cookSheetRow.adultsEatingIn, cookSheetRow.childrenEatingIn, cookSheetRow.adultsTakeaway, cookSheetRow.childrenTakeaway, cookSheetRow.portionsSum, cookSheetRow.meatParticipants,
  //   cookSheetRow.glutenParticipants, cookSheetRow.lactoseParticipants, cookSheetRow.milkParticipants, cookSheetRow.nutsParticipants, cookSheetRow.freshFruitParticipants, cookSheetRow.onionsParticipants, cookSheetRow.carrotsParticipants);
}

/** Get weekday name from date */
function getDayAsString(date: Date): string {
  const weekday = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
  return weekday[date.getDay()];
}

/** Get Date and time as string */
function getDateTimeAsString(date: Date): string {
  return `${getDateAsString(date)} kl ${date.getHours()}`;
}

/** Get Date as string */
function getDateAsString(date: Date): string {
  const now = new Date();
  if (date.getFullYear() == now.getFullYear() && date.getMonth() == now.getMonth() && date.getDate() == now.getDate()) {
    return "I dag";
  }

  const day:string = getDayAsString(date);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const add = dayOfWeek == 0 ? 1 : 8 - dayOfWeek;
  const mondayNextWeek = today;
  mondayNextWeek.setDate(today.getDate() + add);

  if (date < mondayNextWeek) {
    return day;
  }

  return `${day} d. ${date.getDate()}/${date.getMonth()+1}`;
}

function getDateOnlyAsString(date: Date): string {
  const month = date.getMonth()+1;
  const monthAsString = month < 10 ? `0${month}` : month.toString();
  const dateAsString = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate().toString();
  return `${date.getFullYear()}-${monthAsString}-${dateAsString}`;
}

interface Allergens {
  meat: boolean;
  gluten: boolean;
  lactose: boolean;
  milk: boolean;
  nuts: boolean;
  freshFruit: boolean;
  onions: boolean;
  carrots: boolean;

  // constructor(meat: boolean, gluten: boolean, lactose: boolean, milk: boolean, nuts: boolean, freshFruit: boolean, onions: boolean, carrots: boolean) {
  //   this.meat = meat;
  //   this.gluten = gluten;
  //   this.lactose = lactose;
  //   this.milk = milk;
  //   this.nuts = nuts;
  //   this.freshFruit = freshFruit;
  //   this.onions = onions;
  //   this.carrots = carrots;
  // }
}

interface Participation {
  adults: number;
  children: number;
  takeaway: boolean;
  allergens: Allergens;

  // constructor(adults: number, children: number, takeaway: boolean, allergens: Allergens) {
  //   this.adults = adults;
  //   this.children = children;
  //   this.takeaway = takeaway;
  //   this.allergens = allergens;
  // }
}

interface DinnerEventExtraInfo {
  deadline: string;
  chefs: string;
  priceAdults: string;
  priceChildren: string;
  expenseHouse: string;
  expenses: string;
  participantsInfo: ParticipantsInfo;
  deadlineDays: number;
  deadlineTimeOfDay: number;

  // constructor(deadline: string, chefs: string, priceAdults: string, priceChildren: string, expenseHouse: string, expenses: string, participantsInfo: ParticipantsInfo, deadlineDays: number, deadlineTimeOfDay: number) {
  //   this.deadline = deadline;
  //   this.chefs = chefs;
  //   this.priceAdults = priceAdults;
  //   this.priceChildren = priceChildren;
  //   this.expenseHouse = expenseHouse;
  //   this.expenses = expenses;
  //   this.participantsInfo = participantsInfo;
  //   this.deadlineDays = deadlineDays;
  //   this.deadlineTimeOfDay = deadlineTimeOfDay;
  // }
}

interface ParticipantsInfo {
  eatingInSum: number;
  adultsEatingIn: number;
  childrenEatingIn: number;
  adultsTakeaway: number;
  childrenTakeaway: number;
  portionsSum: number;
  meat: number;
  gluten: number;
  lactose: number;
  milk: number;
  nuts: number;
  freshFruit: number;
  onions: number;
  carrots: number;

  // constructor(eatingInSum: number, adultsEatingIn: number, childrenEatingIn: number, adultsTakeaway: number, childrenTakeaway: number, portionsSum: number, meat: number, gluten: number, lactose: number, milk: number, nuts: number, freshFruit: number, onions: number, carrots: number) {
  //   this.eatingInSum = eatingInSum;
  //   this.adultsEatingIn = adultsEatingIn;
  //   this.childrenEatingIn = childrenEatingIn;
  //   this.adultsTakeaway = adultsTakeaway;
  //   this.childrenTakeaway = childrenTakeaway;
  //   this.portionsSum = portionsSum;
  //   this.meat = meat;
  //   this.gluten = gluten;
  //   this.lactose = lactose;
  //   this.milk = milk;
  //   this.nuts = nuts;
  //   this.freshFruit = freshFruit;
  //   this.onions = onions;
  //   this.carrots = carrots;
  // }
}

export interface DinnerEvent {
  index: number;
  date: string;
  dateAsNumber: number;
  menu: string;
  editable: boolean;
  chefCanAvoid: Allergens;
  participation: Participation | null;
  extraInfo: DinnerEventExtraInfo;

  // constructor(index: number, date: string, dateAsDate: string, menu: string, editable: boolean, chefCanAvoid: Allergens, participation: Participation | null, extraInfo: DinnerEventExtraInfo) {
  //   this.index = index;
  //   this.date = date;
  //   this.dateAsDate = dateAsDate;
  //   this.menu = menu;
  //   this.editable = editable;
  //   this.chefCanAvoid = chefCanAvoid;
  //   this.participation = participation;
  //   this.extraInfo = extraInfo;
  // }
}

interface DinnerInformation {
  events: DinnerEvent[];
  availableDatesForDinnerEvents: [index: number, date: string][];

  // constructor(events: DinnerEvent[], availableDatesForDinnerEvents: [number, string][]) {
  //   this.events = events;
  //   this.availableDatesForDinnerEvents = availableDatesForDinnerEvents;
  // }
}
