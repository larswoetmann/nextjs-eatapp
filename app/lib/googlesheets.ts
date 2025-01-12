import { google } from 'googleapis';
import { JWT } from "google-auth-library";
import { unstable_cache, revalidateTag } from 'next/cache';

export async function getCachedHouseAndCookSheetRows(house: string): Promise<DinnerInformation> {
  const cached = unstable_cache(
    async (house: string) => getHouseAndCookSheetRows(house, '1xDN0cD_-LM6DRp7qqW9vNfHd6kxsj9W_BjZD2aPFTPY'),
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

const keydata = {
  "type": "service_account",
  "project_id": "staldhusene-functions",
  "private_key_id": "e7132def4c6301a781bcf90fc1000a7ccceabd38",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC2AA+MDY4ejZsn\nqyJhRxzhP6M6huuPrKAFVqe0YUhaYx5Hu9tjrZo/gQt2itJB3DGHNyG6N16ZkE1w\nQjm6YHPcWNdR/0KuyttOluJ4zxnkNZDb7xGBH/i1Prf1AYfd4/t5njTMAqoOPJS9\nWm8D2bP6lMdVMk3ksqdSismAzqQ4zGHbr+un1S0zKG0u7UfC3xug6oIKcx4HxqM3\nfISJWAgkGrWhr6CDFX6D62w2QXine7quC0LLr9qGCpSqRmk0TTSs8OsyWMoExFkd\nEkz+1T7JUgdj2G2IwPDivD8mm/MZrfoe1L6jc1IK9+HLcMvc+RPVmv4XqRRI3oSX\nlhjapNezAgMBAAECggEANlzDSBKeckra3tjzvnnGyxM+ltNJFlO6Qo31LuBmA7Wa\njFO0/suSiMhrW5+wmQKD+r8BgIVcaOMc9lyZsK1xvg39Vt03lk06f3l7MRmvQqar\nW75HjLm3iK+ws+qeoi0gZt3WKF/dWr5GsV6LTWugIkeBWNXbRWYFq5aQBLz0eZA1\n2K6rK/DYJ94Lr3Eiw7G8GZ55NF2tDNG0gbl406rUUcnFn1a55qmlHbN7CqAfC2Eh\nxSljOFHPJBDAyyNPf462QKjaIxpPmnYi2ljTLiFtZE+45FcCFSMiqdImvemeRQEC\n+IoffCYgQHTO4v3ZSyLgtXvkI3plpRb7hz47M+MoFQKBgQDgaqGWAis2iOsk/QD4\n3QFyorXjLi9uhc/NgWkfhMcYeMdHzjqf4SRs3OCG6ejUV5IbkuXxsGn2ZFwjrXfF\nLRIMDyY0MNi4Vf9hR1BJuAjrL876g+FiiJ1rEY5ZUk6nt+MyKpmNFsCRikOlVzNk\npNlkC9kX0XcV+eomqOZHbIQihQKBgQDPnT0F/X4gUiIWJbYB5j7ALnKfpaxze0+Y\nNVV5ku7fYSzELqsloxQtuA/PR98hHjIl08yMPZg/Zs3mu504BAmT2Pxx6up93QPd\n+xk6DXObp2lxFmUp5qQkq8KfIz1vfn5jhi6m3xk8U5/3zKd8F1sN6MGpmj6PMD8r\nSVmmksyS1wKBgHw8a9H4x2V8bPjgG36qEtgcnabz9YwxBfZV0xWA0xuIGYJ199x0\nrk6aBK6LpbqP9DHRo/yl1jNyIdQafzioF9qXNGYmOIPsD+IRsa/t8voIUIQ9KDP9\nP3B7mpt2RlbxJRSrorAJzXeE3KgW2zu3SyXorTlTW6LN5MOcM0eNGqVlAoGAS0j0\nePicRPIjpC5Wmse4V45ASH4WU+YSTdqBPU23y078ocNeko5ZYd7N9NdWJTdC7g6o\nrO4lCFCqN5IvB8IHCxLzMAgEslFz9on4cuGv23DQvo5lbtVRDm8uavCndYfEIyjk\nP+TEzOhyKLSQw2HgxeFyYKMrLldLgNHfbZTsFA8CgYAPDkYJIzckt8o2QwmLZXnZ\nuQIsDsIDFHFuSGmcwX1mHhxlpP2FiBf+GoE19of/b4SRhy5irHdKWLHVf221jtpn\nsUOlok75YkfnHPRwsF9TtQROxuEzfmiOdi3kSltkBTRVtEkJ9NIJ5Yz2AOovzTZx\ntgll26/lfruoN+9I+jTBmw==\n-----END PRIVATE KEY-----\n",
  "client_email": "test-javascript@staldhusene-functions.iam.gserviceaccount.com",
  "client_id": "113203094698724341991",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/test-javascript%40staldhusene-functions.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com",
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
