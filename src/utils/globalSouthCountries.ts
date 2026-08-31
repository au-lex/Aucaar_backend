export const GLOBAL_SOUTH_COUNTRY_CODES: Set<string> = new Set([
  // Africa
  "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ",
  "EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG",
  "MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO",
  "ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW",
  // Asia
  "AF","BD","BT","BN","KH","CN","IN","ID","IR","IQ","JO","KZ","KW","KG","LA",
  "LB","MY","MV","MN","MM","NP","KP","OM","PK","PH","QA","SA","SG","LK","SY",
  "TJ","TH","TL","TM","AE","UZ","VN","YE",
  // Latin America & Caribbean
  "AR","BS","BB","BZ","BO","BR","CL","CO","CR","CU","DM","DO","EC","SV","GD",
  "GT","GY","HT","HN","JM","MX","NI","PA","PY","PE","KN","LC","VC","SR","TT",
  "UY","VE",
  // Oceania (developing Pacific states)
  "FJ","KI","MH","FM","NR","PW","PG","WS","SB","TO","TV","VU",
]);

export function isGlobalSouthCountry(countryCode?: string | null): boolean {
  if (!countryCode) return false;
  return GLOBAL_SOUTH_COUNTRY_CODES.has(countryCode.toUpperCase());
}