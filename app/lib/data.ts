export async function fetchCardData() {
  return ["Carbonara","Boller i karry","Donuts"];
}

type HouseSheetId = [number, string];

export function housesList(): HouseSheetId[] {
  const map: HouseSheetId[] = [[3, "1861036449"], [4, "1574366280"], [5, "362877398"], [6, "372096257"], [7, "1294165818"], [8, "1477564764"], [9, "155294941"], [10, "501428089"], [11, "1205382093"], [12, "2080679783"], [13, "1178034453"], [14,  "1987334692"], [15, "2084365443"], [16, "1314184724"], [17, "1857447461"], [18, "1679708971"], [19, "152473236"], [20, "258137230"], [21, "1778856593"], [23, "1595247052"], [24, "855720617"], [25, "548668433"], [26, "1349229435"], [27, "1038124929"], [28, "1097827682"], [29, "1829525443"], [30, "2144104939"], [31, "1557319610"], [32, "2002470421"], [33, "350576245"], [35, "1992415822"], [37, "1116200790"], [39, "1961015192"], [41, "1490527028"], [43, "1964151194"], [45, "1103307074"], [47, "269424915"], [49, "401182783"], [51, "1515790340"], [53, "1925569791"], [55, "1087387820"], [57, "890438993"]];
  return map;
}

export const spreadSheedId = '1JHNCK4SVovbEeGF4n6FO0_dc3j85hVQGD1c3gA69Ub8';