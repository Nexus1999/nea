export type SpecialNeedType = 'HI' | 'BR' | 'LV' | 'PI';

export interface MasterSummary {
  id: number;
  Examination: string;
  Code: string;
  Year: number;
  version: number;
  is_latest: boolean;
  created_at: string;
}

export interface MasterSummaryDetail {
  id: number;
  mid: number;
  region: string;
  district: string;
  center_name: string;
  center_number: string;
  subjects?: string;
  medium?: string;
  registered?: number;
  version: number;
  is_latest: boolean;
  created_at: string;
}

export interface SecondaryMasterSummary extends MasterSummaryDetail {
  [key: string]: any; // For dynamic subject codes like '011', '012', etc.
}

export interface PrimaryMasterSummarySpecialNeeds {
  id: number;
  mid: number;
  special_need: SpecialNeedType;
  region: string;
  district: string;
  center_name: string;
  center_number: string;
  registered: number;
}

export interface SecondaryMasterSummarySpecialNeeds {
  id: number;
  mid: number;
  special_need: SpecialNeedType;
  region: string;
  district: string;
  center_name: string;
  center_number: string;
  [key: string]: any;
}