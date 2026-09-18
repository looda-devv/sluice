/**
 * Every Water Services Authority in South Africa, with its 2023 No Drop score.
 *
 * Source: Department of Water and Sanitation, *2023 No Drop Report*.
 *   https://ws.dws.gov.za/iris/releases/ND_2023_Report.pdf
 *
 * There are 144 WSAs — the municipalities legally responsible for supplying
 * water. That is fewer than South Africa's 257 municipalities, because most
 * local municipalities in rural districts are not water authorities; their
 * district municipality is. Only a WSA has a water balance to report, which is
 * why this list is the right unit of analysis and a list of all municipalities
 * would not be.
 *
 * `noDropScore` is null for the 30 WSAs whose entry carries no regulatory
 * impression. These did not submit audit information. Null is deliberate: a
 * municipality that failed to report is not the same as one that scored zero
 * on performance, and writing 0 would put it on a chart as though it had been
 * measured. The report's own narrative counts 24 at 0%, six fewer than the
 * entries that lack a score — a discrepancy in the source, left as found.
 */

export type Province =
  | 'Eastern Cape'
  | 'Free State'
  | 'Gauteng'
  | 'KwaZulu-Natal'
  | 'Limpopo'
  | 'Mpumalanga'
  | 'North West'
  | 'Northern Cape'
  | 'Western Cape';

export interface Wsa {
  name: string;
  province: Province;
  /** 2023 No Drop score, percent. Null where the WSA did not submit. */
  noDropScore: number | null;
}

/**
 * No Drop performance bands, as defined by the regulator.
 *
 * Overstrand's 101% is not a transcription error — the scorecard awards bonus
 * points, and the report prints it as published.
 */
export type NoDropBand = 'Excellent' | 'Good' | 'Average' | 'Poor' | 'No submission';

export function noDropBand(score: number | null): NoDropBand {
  if (score === null) return 'No submission';
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 50) return 'Average';
  return 'Poor';
}

export const wsas: Wsa[] = [
  { name: "Alfred Nzo District Municipality", province: 'Eastern Cape', noDropScore: 36 },
  { name: "Amathole District Municipality", province: 'Eastern Cape', noDropScore: 4 },
  { name: "Blue Crane Route Local Municipality", province: 'Eastern Cape', noDropScore: null },
  { name: "Buffalo City", province: 'Eastern Cape', noDropScore: 64 },
  { name: "Chris Hani District Municipality", province: 'Eastern Cape', noDropScore: 20 },
  { name: "Dr Beyers Naude Local Municipality", province: 'Eastern Cape', noDropScore: 37 },
  { name: "Joe Gqabi District Municipality", province: 'Eastern Cape', noDropScore: null },
  { name: "Kouga Local Municipality", province: 'Eastern Cape', noDropScore: 39 },
  { name: "Kou-kamma Local Municipality", province: 'Eastern Cape', noDropScore: 11 },
  { name: "Makana Local Municipality", province: 'Eastern Cape', noDropScore: null },
  { name: "Ndlambe Local Municipality", province: 'Eastern Cape', noDropScore: 24 },
  { name: "Nelson Mandela Bay Metropolitan Municipality", province: 'Eastern Cape', noDropScore: 81 },
  { name: "O.r. Tambo District Municipality", province: 'Eastern Cape', noDropScore: 51 },
  { name: "Sunday’s River Valley", province: 'Eastern Cape', noDropScore: null },
  { name: "Dihlabeng Local Municipality", province: 'Free State', noDropScore: 6 },
  { name: "Kopanong Local Municipality", province: 'Free State', noDropScore: 33 },
  { name: "Letsemeng Local Municipality", province: 'Free State', noDropScore: 16 },
  { name: "Mafube Local Municipality", province: 'Free State', noDropScore: 16 },
  { name: "Maluti-a-phofung Local Municipality", province: 'Free State', noDropScore: 26 },
  { name: "Mangaung Local Municipality", province: 'Free State', noDropScore: 70 },
  { name: "Mantsopa Local Municipality", province: 'Free State', noDropScore: 11 },
  { name: "Masilonyana Local Municipality", province: 'Free State', noDropScore: null },
  { name: "Matjhabeng Local Municipality", province: 'Free State', noDropScore: 36 },
  { name: "Metsimaholo Local Municipality", province: 'Free State', noDropScore: 4 },
  { name: "Mohokare Local Municipality", province: 'Free State', noDropScore: 32 },
  { name: "Moqhaka Local Municipality", province: 'Free State', noDropScore: 6 },
  { name: "Nala Local Municipality", province: 'Free State', noDropScore: 20 },
  { name: "Ngwathe Local Municipality", province: 'Free State', noDropScore: null },
  { name: "Nketoana Local Municipality", province: 'Free State', noDropScore: 4 },
  { name: "Phumelela Local Municipality", province: 'Free State', noDropScore: 2 },
  { name: "Setsoto Local Municipality", province: 'Free State', noDropScore: 1 },
  { name: "Tokologo Local Municipality", province: 'Free State', noDropScore: 4 },
  { name: "Tswelopele Local Municipality", province: 'Free State', noDropScore: 4 },
  { name: "City of Ekurhuleni", province: 'Gauteng', noDropScore: 80 },
  { name: "City of Johannesburg", province: 'Gauteng', noDropScore: 72 },
  { name: "City of Tshwane", province: 'Gauteng', noDropScore: 75 },
  { name: "Emfuleni Local Municipality", province: 'Gauteng', noDropScore: 58 },
  { name: "Lesedi Local Municipality", province: 'Gauteng', noDropScore: 39 },
  { name: "Merafong City", province: 'Gauteng', noDropScore: 70 },
  { name: "Midvaal Local Municipality", province: 'Gauteng', noDropScore: 91 },
  { name: "Mogale City", province: 'Gauteng', noDropScore: 38 },
  { name: "Rand West City", province: 'Gauteng', noDropScore: null },
  { name: "Amajuba District Municipality", province: 'KwaZulu-Natal', noDropScore: 50 },
  { name: "City of uMhlathuze", province: 'KwaZulu-Natal', noDropScore: 66 },
  { name: "eThekwini Metropolitan Municipality", province: 'KwaZulu-Natal', noDropScore: 77 },
  { name: "Harry Gwala District Municipality", province: 'KwaZulu-Natal', noDropScore: 59 },
  { name: "iLembe District Municipality", province: 'KwaZulu-Natal', noDropScore: 65 },
  { name: "King Cetshwayo District Municipality", province: 'KwaZulu-Natal', noDropScore: 56 },
  { name: "Msunduzi Local Municipality", province: 'KwaZulu-Natal', noDropScore: 69 },
  { name: "Newcastle Local Municipality", province: 'KwaZulu-Natal', noDropScore: 75 },
  { name: "Ugu District Municipality", province: 'KwaZulu-Natal', noDropScore: 79 },
  { name: "uMgungundlovu District Municipality", province: 'KwaZulu-Natal', noDropScore: 72 },
  { name: "uMkhanyakude District Municipality", province: 'KwaZulu-Natal', noDropScore: 60 },
  { name: "uMzinyathi District Municipality", province: 'KwaZulu-Natal', noDropScore: 49 },
  { name: "uThukela District Municipality", province: 'KwaZulu-Natal', noDropScore: 22 },
  { name: "Zululand District Municipality", province: 'KwaZulu-Natal', noDropScore: 62 },
  { name: "Bela-bela Local Municipality", province: 'Limpopo', noDropScore: 45 },
  { name: "Capricorn District Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Lephalale Local Municipality", province: 'Limpopo', noDropScore: 37 },
  { name: "Modimolle-mookgophong Local Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Mogalakwena Local Municipality", province: 'Limpopo', noDropScore: 2 },
  { name: "Mopani District Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Polokwane Local Municipality", province: 'Limpopo', noDropScore: 69 },
  { name: "Sekhukhune District Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Thabazimbi Local Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Vhembe District Municipality", province: 'Limpopo', noDropScore: null },
  { name: "Bushbuckridge Local Municipality", province: 'Mpumalanga', noDropScore: 15 },
  { name: "Chief Albert Luthuli Local Municipality", province: 'Mpumalanga', noDropScore: null },
  { name: "City of Mbombela", province: 'Mpumalanga', noDropScore: 67 },
  { name: "Dipaleseng Local Municipality", province: 'Mpumalanga', noDropScore: null },
  { name: "Dr J S Moroka Local Municipality", province: 'Mpumalanga', noDropScore: 20 },
  { name: "Emakhazeni Local Municipality", province: 'Mpumalanga', noDropScore: 5 },
  { name: "eMalahleni Local Municipality", province: 'Mpumalanga', noDropScore: 62 },
  { name: "Govan Mbeki Local Municipality", province: 'Mpumalanga', noDropScore: 35 },
  { name: "Lekwa Local Municipality", province: 'Mpumalanga', noDropScore: null },
  { name: "Mkhondo Local Municipality", province: 'Mpumalanga', noDropScore: 43 },
  { name: "Msukaligwa Local Municipality", province: 'Mpumalanga', noDropScore: 35 },
  { name: "Nkomazi Local Municipality", province: 'Mpumalanga', noDropScore: 73 },
  { name: "Pixley Ka Seme Local Municipality", province: 'Mpumalanga', noDropScore: 17 },
  { name: "Steve Tshwete Local Municipality", province: 'Mpumalanga', noDropScore: 43 },
  { name: "Thaba Chweu Local Municipality", province: 'Mpumalanga', noDropScore: 19 },
  { name: "Thembisile Local Municipality", province: 'Mpumalanga', noDropScore: 42 },
  { name: "Victor Khanye Local Municipality", province: 'Mpumalanga', noDropScore: 53 },
  { name: "City of Matlosana", province: 'North West', noDropScore: 1 },
  { name: "Dr Ruth Segomotsi Mompati District Municipality", province: 'North West', noDropScore: 26 },
  { name: "JB Marks Local Municipality", province: 'North West', noDropScore: 65 },
  { name: "Kgetlengrivier Local Municipality", province: 'North West', noDropScore: 44 },
  { name: "Madibeng Local Municipality", province: 'North West', noDropScore: 5 },
  { name: "Maquassi Hills Local Municipality", province: 'North West', noDropScore: 16 },
  { name: "Moretele Local Municipality", province: 'North West', noDropScore: null },
  { name: "Moses Kotane Local Municipality", province: 'North West', noDropScore: 10 },
  { name: "Ngaka Modiri Molema District Municipality", province: 'North West', noDropScore: null },
  { name: "Rustenburg Local Municipality", province: 'North West', noDropScore: 54 },
  { name: "!Kheis Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Dawid Kruiper Local Municipality", province: 'Northern Cape', noDropScore: 66 },
  { name: "Dikgatlong Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Emthanjeni Local Municipality", province: 'Northern Cape', noDropScore: 53 },
  { name: "Gamagara Local Municipality", province: 'Northern Cape', noDropScore: 51 },
  { name: "Ga-segonyana Local Municipality", province: 'Northern Cape', noDropScore: 23 },
  { name: "Hantam Local Municipality", province: 'Northern Cape', noDropScore: 45 },
  { name: "Joe Morolong Local Municipality", province: 'Northern Cape', noDropScore: 43 },
  { name: "Kai !Garib Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Kamiesberg Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Kareeberg Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Karoo Hoogland Local Municipality", province: 'Northern Cape', noDropScore: 39 },
  { name: "Kgatelopele Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Khai-ma Local Municipality", province: 'Northern Cape', noDropScore: 5 },
  { name: "Magareng Local Municipality", province: 'Northern Cape', noDropScore: 10 },
  { name: "Nama Khoi Local Municipality", province: 'Northern Cape', noDropScore: 47 },
  { name: "Phokwane Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Renosterberg Local Municipality", province: 'Northern Cape', noDropScore: 4 },
  { name: "Richtersveld Local Municipality", province: 'Northern Cape', noDropScore: 12 },
  { name: "Siyancuma Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Siyathemba Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Sol Plaatje Local Municipality", province: 'Northern Cape', noDropScore: 53 },
  { name: "Thembelihle Local Municipality", province: 'Northern Cape', noDropScore: 35 },
  { name: "Tsantsabane Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Ubuntu Local Municipality", province: 'Northern Cape', noDropScore: 62 },
  { name: "Umsobomvu Local Municipality", province: 'Northern Cape', noDropScore: null },
  { name: "Beaufort West Local Municipality", province: 'Western Cape', noDropScore: 38 },
  { name: "Bergrivier Local Municipality", province: 'Western Cape', noDropScore: 80 },
  { name: "Bitou Local Municipality", province: 'Western Cape', noDropScore: 80 },
  { name: "Breede Valley Local Municipality", province: 'Western Cape', noDropScore: 66 },
  { name: "Cape Agulhas Local Municipality", province: 'Western Cape', noDropScore: null },
  { name: "Cederberg Local Municipality", province: 'Western Cape', noDropScore: 61 },
  { name: "City of Cape Town", province: 'Western Cape', noDropScore: 92 },
  { name: "Drakenstein Local Municipality", province: 'Western Cape', noDropScore: 82 },
  { name: "George Local Municipality", province: 'Western Cape', noDropScore: 82 },
  { name: "Hessequa Local Municipality", province: 'Western Cape', noDropScore: 72 },
  { name: "Kannaland Local Municipality", province: 'Western Cape', noDropScore: 43 },
  { name: "Knysna Local Municipality", province: 'Western Cape', noDropScore: 77 },
  { name: "Laingsburg Local Municipality", province: 'Western Cape', noDropScore: 59 },
  { name: "Langeberg Local Municipality", province: 'Western Cape', noDropScore: 87 },
  { name: "Matzikama Local Municipality", province: 'Western Cape', noDropScore: 63 },
  { name: "Mossel Bay Local Municipality", province: 'Western Cape', noDropScore: 76 },
  { name: "Oudtshoorn Local Municipality", province: 'Western Cape', noDropScore: 69 },
  { name: "Overstrand Local Municipality", province: 'Western Cape', noDropScore: 101 },
  { name: "Prince Albert Local Municipality", province: 'Western Cape', noDropScore: 47 },
  { name: "Saldanha Bay Local Municipality", province: 'Western Cape', noDropScore: 84 },
  { name: "Stellenbosch Local Municipality", province: 'Western Cape', noDropScore: 57 },
  { name: "Swartland Local Municipality", province: 'Western Cape', noDropScore: 91 },
  { name: "Swellendam Local Municipality", province: 'Western Cape', noDropScore: 67 },
  { name: "Theewaterskloof Local Municipality", province: 'Western Cape', noDropScore: 60 },
  { name: "Witzenberg Local Municipality", province: 'Western Cape', noDropScore: 73 },
];
