import {Asset, Name, TimePoint, UInt16, UInt64} from "@wharfkit/session";

export interface TemplatesTable {
  template_id: UInt64,
  collection: Name,
  nft_type: string
}

export interface TicketsTable {
  asset_id: UInt64,
  template_id: UInt64,
  level: UInt64,
  owner: Name,
  active_session: Name
}

export interface HorsesTable {
  asset_id: UInt64,
  template_id: UInt64,
  level: UInt64,
  owner: Name,
  active_session: Name,
  is_ready: boolean
}

export interface HorsePicksTable {
  asset_id: UInt64,
  owner: Name,
  trifecta: UInt64[],
  horse_id: UInt64
}

export interface AccRewardsTable {
  balance: Asset
}

export interface SessionsTable {
  session_id: Name,
  level: UInt16,
  time: TimePoint
}

export interface RacesTable {
  asset_id: UInt64,
  owner: Name
}

export interface StakedDetail {
  ready: boolean;
  name: string;
  type: string
}

export interface LogDataAction {
  owner: Name,
  asset_id: UInt64,
  reward: Asset,
  rank: number
}
